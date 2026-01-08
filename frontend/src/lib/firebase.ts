import { initializeApp, getApps } from 'firebase/app'
import { getAuth, GoogleAuthProvider, RecaptchaVerifier } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getAnalytics, isSupported } from 'firebase/analytics'
import { CONFIG } from '@/config'

const firebaseConfig = CONFIG.FIREBASE


// Check if Firebase config is properly set
const isFirebaseConfigured = Object.values(firebaseConfig).every(value =>
  value && value !== 'undefined' && !value.includes('placeholder')
)

// Initialize Firebase only if properly configured
let app: any = null
let auth: any = null
let db: any = null
let storage: any = null
let analytics: any = null
let googleProvider: any = null

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
    auth = getAuth(app)
    db = getFirestore(app)
    storage = getStorage(app)
    googleProvider = new GoogleAuthProvider()

    // Configure Google Provider
    googleProvider.setCustomParameters({
      prompt: 'select_account',
    })

    // Initialize Analytics (only in browser)
    if (typeof window !== 'undefined') {
      isSupported().then((supported) => {
        if (supported) {
          analytics = getAnalytics(app)
        }
      })
    }
  } catch (error) {
    console.warn('Firebase initialization failed:', error)
  }
} else {
  console.warn('Firebase not configured properly. Please set up your Firebase environment variables.')
}

// PERFORMANCE OPTIMIZATION: Auth utilities
export const AuthUtils = {
  // Get current user synchronously (no waiting)
  getCurrentUser: () => {
    if (!auth) return null
    return auth.currentUser
  },

  // Check if user is logged in (instant)
  isLoggedIn: () => {
    // Check demo mode first
    if (typeof window !== 'undefined' && localStorage.getItem('demo_mode') === 'true') {
      return true;
    }
    const user = AuthUtils.getCurrentUser()
    const cachedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    return !!(user || cachedUser)
  },

  // Get cached user data (instant)
  getCachedUser: () => {
    if (typeof window === 'undefined') return null
    try {
      // Check demo mode first
      if (localStorage.getItem('demo_mode') === 'true') {
        const demoUser = localStorage.getItem('demo_user');
        if (demoUser) {
          const parsed = JSON.parse(demoUser);
          // Map demo user to internal user format if needed
          return {
            uid: parsed.uid,
            email: parsed.email,
            displayName: parsed.displayName,
            role: parsed.role,
            isDemo: true
          };
        }
      }
      const cached = localStorage.getItem('user')
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  },

  // Cache user data for instant access
  cacheUser: (userData: any) => {
    if (typeof window === 'undefined') return
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.setItem('userRole', userData.role || 'buyer')
    localStorage.setItem('lastLogin', Date.now().toString())
  },

  // Clear all cached data
  clearCache: () => {
    if (typeof window === 'undefined') return
    localStorage.removeItem('user')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userMode')
    localStorage.removeItem('lastLogin')
    localStorage.removeItem('demo_mode')
    localStorage.removeItem('demo_user')
  },

  // Get user role (instant)
  getUserRole: () => {
    if (typeof window === 'undefined') return 'buyer'
    return localStorage.getItem('userRole') || 'buyer'
  }
}

// Recaptcha Verifier for Phone Auth
export const setupRecaptcha = (containerId: string) => {
  if (!auth || typeof window === 'undefined') {
    console.warn('Firebase Auth not initialized or not in browser environment')
    return null
  }

  try {
    // Clear any existing reCAPTCHA widget
    const container = document.getElementById(containerId)
    if (container) {
      container.innerHTML = ''
    }

    // Create new RecaptchaVerifier with visible size for better reliability
    const recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'normal',
      callback: (response: any) => {
        console.log('reCAPTCHA solved successfully')
      },
      'expired-callback': () => {
        console.log('reCAPTCHA expired, please try again')
      },
    })

    return recaptchaVerifier
  } catch (error) {
    console.error('Error setting up reCAPTCHA:', error)
    return null
  }
}

export { auth, db, storage, analytics, googleProvider }
export default app
