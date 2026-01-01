'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  sendEmailVerification,
  signInWithPhoneNumber,
  ConfirmationResult,
} from 'firebase/auth'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { auth, googleProvider, db, setupRecaptcha, AuthUtils } from '@/lib/firebase'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import Loader from '@/components/ui/Loader'

interface AuthContextType {
  user: User | null
  loading: boolean
  authLoading: boolean
  signup: (email: string, password: string, name: string) => Promise<void>
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: () => Promise<User | void>
  loginWithPhone: (phoneNumber: string) => Promise<ConfirmationResult>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>
  sendVerificationEmail: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ 
  children, 
  loadingComponent 
}: { 
  children: ReactNode
  loadingComponent?: ReactNode 
}) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // PERFORMANCE OPTIMIZATION: Instant auth check
    const initAuth = () => {
      try {
        // 1. Check cached user first (instant)
        const cachedUser = AuthUtils.getCachedUser()
        if (cachedUser) {
          setUser(cachedUser)
          setLoading(false)
          return
        }

        // 2. Check Firebase current user (fast)
        const currentUser = AuthUtils.getCurrentUser()
        if (currentUser) {
          const userData = {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
          }
          setUser(userData as any)
          AuthUtils.cacheUser(userData)
          setLoading(false)
          return
        }

        // 3. Only then listen to auth state (background)
        if (auth) {
          const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
              const userData = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
              }
              setUser(userData as any)
              AuthUtils.cacheUser(userData)
              
              // Background role fetch (non-blocking)
              fetchUserRole(firebaseUser.uid)
            } else {
              setUser(null)
              AuthUtils.clearCache()
            }
            setLoading(false)
          })
          
          // Cleanup subscription
          return unsubscribe
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setLoading(false)
      }
    }

    const unsubscribe = initAuth()
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe()
      }
    }
  }, [])

  // Background role fetching (non-blocking)
  const fetchUserRole = async (uid: string) => {
    if (!db) return
    
    try {
      const userDoc = await getDoc(doc(db, 'users', uid))
      if (userDoc.exists()) {
        const userData = userDoc.data()
        localStorage.setItem('userRole', userData.role || 'buyer')
      }
    } catch (error) {
      console.error('Role fetch error:', error)
    }
  }

  // Save user to Firestore (background, non-blocking)
  const saveUserToFirestore = async (user: User) => {
    if (!db) return
    
    try {
      const userRef = doc(db, 'users', user.uid)
      const userSnap = await getDoc(userRef)

      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
        emailVerified: user.emailVerified,
        lastLogin: new Date().toISOString(),
      }

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          ...userData,
          createdAt: new Date().toISOString(),
          role: 'buyer', // Default role
        })
      } else {
        await setDoc(userRef, userData, { merge: true })
      }
    } catch (error) {
      console.error('Error saving user to Firestore:', error)
    }
  }

  // OPTIMIZED LOGIN: Immediate redirect, background processing
  const login = async (email: string, password: string) => {
    if (!auth) {
      throw new Error('Authentication not configured. Please set up Firebase.')
    }

    try {
      setAuthLoading(true)
      const result = await signInWithEmailAndPassword(auth, email, password)
      
      // Immediate user data setup
      const userData = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      }
      
      // Cache immediately
      AuthUtils.cacheUser(userData)
      setUser(userData as any)
      
      // Background processing (non-blocking)
      setTimeout(() => {
        saveUserToFirestore(result.user)
        fetchUserRole(result.user.uid)
      }, 0)
      
      toast.success('Welcome back!')
      
      // Show loader for smooth transition
      setTimeout(() => {
        router.push('/dashboard')
        setAuthLoading(false)
      }, 1500)
      
    } catch (error: any) {
      setAuthLoading(false)
      console.error('Login error:', error)
      throw new Error(error.message || 'Failed to login')
    }
  }

  // OPTIMIZED SIGNUP: Same pattern
  const signup = async (email: string, password: string, name: string) => {
    if (!auth) {
      throw new Error('Authentication not configured. Please set up Firebase.')
    }

    try {
      setAuthLoading(true)
      const result = await createUserWithEmailAndPassword(auth, email, password)
      
      // Update profile
      await updateProfile(result.user, { displayName: name })
      
      // Immediate user data setup
      const userData = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: name,
        photoURL: result.user.photoURL,
      }
      
      // Cache immediately
      AuthUtils.cacheUser(userData)
      setUser(userData as any)
      
      // Background processing
      setTimeout(() => {
        sendEmailVerification(result.user)
        saveUserToFirestore(result.user)
      }, 0)
      
      toast.success('Account created! Please verify your email.')
      
      // Show loader for smooth transition
      setTimeout(() => {
        router.push('/dashboard')
        setAuthLoading(false)
      }, 1500)
      
    } catch (error: any) {
      setAuthLoading(false)
      console.error('Signup error:', error)
      throw new Error(error.message || 'Failed to create account')
    }
  }

  // Login with Google
  const loginWithGoogle = async () => {
    if (!auth || !googleProvider) {
      throw new Error('Authentication not configured. Please set up Firebase.')
    }

    try {
      setAuthLoading(true)
      const result = await signInWithPopup(auth, googleProvider)
      
      const userData = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      }
      
      AuthUtils.cacheUser(userData)
      setUser(userData as any)
      
      // Background processing
      setTimeout(() => {
        saveUserToFirestore(result.user)
        fetchUserRole(result.user.uid)
      }, 0)
      
      toast.success('Signed in with Google!')
      
      // Show loader for smooth transition
      setTimeout(() => {
        router.push('/dashboard')
        setAuthLoading(false)
      }, 1500)
      
      return result.user
    } catch (error: any) {
      setAuthLoading(false)
      console.error('Google login error:', error)
      throw new Error(error.message || 'Failed to sign in with Google')
    }
  }

  // Login with Phone
  const loginWithPhone = async (phoneNumber: string): Promise<ConfirmationResult> => {
    if (!auth) {
      throw new Error('Authentication not configured. Please set up Firebase.')
    }

    try {
      const recaptchaContainer = document.getElementById('recaptcha-container')
      if (recaptchaContainer) {
        recaptchaContainer.innerHTML = ''
      }

      const recaptchaVerifier = setupRecaptcha('recaptcha-container')
      if (!recaptchaVerifier) {
        throw new Error('Failed to initialize reCAPTCHA. Please refresh the page.')
      }

      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier)
      toast.success('OTP sent successfully!')
      return confirmationResult
    } catch (error: any) {
      console.error('Phone login error:', error)
      
      const recaptchaContainer = document.getElementById('recaptcha-container')
      if (recaptchaContainer) {
        recaptchaContainer.innerHTML = ''
      }

      if (error.code === 'auth/invalid-phone-number') {
        throw new Error('Invalid phone number format. Please include country code (e.g., +91)')
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Too many attempts. Please try again later.')
      } else if (error.code === 'auth/quota-exceeded') {
        throw new Error('SMS quota exceeded. Please try again later or use another login method.')
      } else {
        throw new Error(error.message || 'Failed to send OTP')
      }
    }
  }

  // OPTIMIZED LOGOUT: Immediate redirect
  const logout = async () => {
    try {
      if (auth) {
        await signOut(auth)
      }
      
      // Clear everything immediately
      AuthUtils.clearCache()
      setUser(null)
      
      toast.success('Logged out successfully')
      router.push('/')
      
    } catch (error: any) {
      console.error('Logout error:', error)
      // Force logout even on error
      AuthUtils.clearCache()
      setUser(null)
      router.push('/')
    }
  }

  // Reset Password
  const resetPassword = async (email: string) => {
    if (!auth) {
      throw new Error('Authentication not configured. Please set up Firebase.')
    }

    try {
      await sendPasswordResetEmail(auth, email)
      toast.success('Password reset email sent!')
    } catch (error: any) {
      console.error('Reset password error:', error)
      throw new Error(error.message || 'Failed to send reset email')
    }
  }

  // Update User Profile
  const updateUserProfile = async (displayName: string, photoURL?: string) => {
    if (!auth) {
      throw new Error('Authentication not configured. Please set up Firebase.')
    }

    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName,
          ...(photoURL && { photoURL }),
        })
        
        // Update cached user
        const cachedUser = AuthUtils.getCachedUser()
        if (cachedUser) {
          const updatedUser = { ...cachedUser, displayName, photoURL }
          AuthUtils.cacheUser(updatedUser)
          setUser(updatedUser)
        }
        
        toast.success('Profile updated!')
      }
    } catch (error: any) {
      console.error('Update profile error:', error)
      throw new Error(error.message || 'Failed to update profile')
    }
  }

  // Send Verification Email
  const sendVerificationEmail = async () => {
    if (!auth) {
      throw new Error('Authentication not configured. Please set up Firebase.')
    }

    try {
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser)
        toast.success('Verification email sent!')
      }
    } catch (error: any) {
      console.error('Send verification error:', error)
      throw new Error(error.message || 'Failed to send verification email')
    }
  }

  const value = {
    user,
    loading,
    authLoading,
    signup,
    login,
    loginWithGoogle,
    loginWithPhone,
    logout,
    resetPassword,
    updateUserProfile,
    sendVerificationEmail,
  }

  return (
    <AuthContext.Provider value={value}>
      {/* Authentication Loader */}
      <Loader 
        isVisible={authLoading} 
        message="Signing you in securely..."
        duration={1500}
      />
      
      {loading ? (loadingComponent || null) : children}
    </AuthContext.Provider>
  )
}
