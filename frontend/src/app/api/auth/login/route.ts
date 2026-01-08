import { NextRequest, NextResponse } from 'next/server'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { successResponse, errorResponse, handleRouteError, validateRequestBody, corsHeaders, handleOptions } from '@/lib/api-utils'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate required fields
        const validationErrors = validateRequestBody(body, ['email', 'password'])
        if (validationErrors.length > 0) {
            return errorResponse(validationErrors.join(', '))
        }

        const { email, password } = body

        // Authenticate with Firebase
        if (!auth) {
            return errorResponse('Authentication service unavailable', 503)
        }

        const userCredential = await signInWithEmailAndPassword(auth, email, password)
        const user = userCredential.user

        // Get or create user document in Firestore
        if (db) {
            const userRef = doc(db, 'users', user.uid)
            const userSnap = await getDoc(userRef)

            const userData = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                emailVerified: user.emailVerified,
                lastLogin: new Date().toISOString(),
            }

            if (!userSnap.exists()) {
                // Create new user document
                await setDoc(userRef, {
                    ...userData,
                    createdAt: new Date().toISOString(),
                    role: 'buyer',
                })
            } else {
                // Update last login
                await setDoc(userRef, userData, { merge: true })
            }

            // Get user role
            const updatedSnap = await getDoc(userRef)
            const role = updatedSnap.exists() ? updatedSnap.data().role : 'buyer'

            return successResponse({
                user: {
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    emailVerified: user.emailVerified,
                    role,
                },
                token: await user.getIdToken(),
            }, 'Login successful')
        }

        // Fallback if Firestore is not available
        return successResponse({
            user: {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoURL: user.photoURL,
                emailVerified: user.emailVerified,
                role: 'buyer',
            },
            token: await user.getIdToken(),
        }, 'Login successful')

    } catch (error: any) {
        console.error('Login error:', error)

        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            return errorResponse('Invalid email or password', 401)
        }

        if (error.code === 'auth/too-many-requests') {
            return errorResponse('Too many login attempts. Please try again later.', 429)
        }

        return handleRouteError(error)
    }
}

export async function OPTIONS() {
    return handleOptions()
}
