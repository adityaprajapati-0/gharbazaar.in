import { NextRequest, NextResponse } from 'next/server'
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { successResponse, errorResponse, handleRouteError, validateRequestBody, handleOptions } from '@/lib/api-utils'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()

        // Validate required fields
        const validationErrors = validateRequestBody(body, ['email', 'password', 'name'])
        if (validationErrors.length > 0) {
            return errorResponse(validationErrors.join(', '))
        }

        const { email, password, name } = body

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
            return errorResponse('Invalid email format')
        }

        // Validate password strength
        if (password.length < 6) {
            return errorResponse('Password must be at least 6 characters long')
        }

        // Create user with Firebase
        if (!auth) {
            return errorResponse('Authentication service unavailable', 503)
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password)
        const user = userCredential.user

        // Update profile with display name
        await updateProfile(user, { displayName: name })

        // Send verification email
        try {
            await sendEmailVerification(user)
        } catch (emailError) {
            console.error('Error sending verification email:', emailError)
            // Don't fail signup if email fails
        }

        // Create user document in Firestore
        if (db) {
            const userRef = doc(db, 'users', user.uid)
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email,
                displayName: name,
                photoURL: user.photoURL,
                phoneNumber: user.phoneNumber,
                emailVerified: user.emailVerified,
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                role: 'buyer', // Default role
            })
        }

        return successResponse({
            user: {
                uid: user.uid,
                email: user.email,
                displayName: name,
                photoURL: user.photoURL,
                emailVerified: user.emailVerified,
                role: 'buyer',
            },
            token: await user.getIdToken(),
        }, 'Account created successfully. Please verify your email.')

    } catch (error: any) {
        console.error('Signup error:', error)

        if (error.code === 'auth/email-already-in-use') {
            return errorResponse('Email already registered. Please login instead.', 409)
        }

        if (error.code === 'auth/weak-password') {
            return errorResponse('Password is too weak. Please use a stronger password.')
        }

        if (error.code === 'auth/invalid-email') {
            return errorResponse('Invalid email address')
        }

        return handleRouteError(error)
    }
}

export async function OPTIONS() {
    return handleOptions()
}
