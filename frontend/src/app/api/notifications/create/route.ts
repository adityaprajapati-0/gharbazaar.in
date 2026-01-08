import { NextRequest, NextResponse } from 'next/server'
import { collection, addDoc, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { successResponse, errorResponse, handleRouteError, validateRequestBody, withAuth, handleOptions } from '@/lib/api-utils'

export const POST = withAuth(async (request: NextRequest, { userId }) => {
    try {
        if (!db) {
            return errorResponse('Database service unavailable', 503)
        }

        const body = await request.json()

        // Validate required fields
        const validationErrors = validateRequestBody(body, [
            'type',
            'title',
            'message'
        ])

        if (validationErrors.length > 0) {
            return errorResponse(validationErrors.join(', '))
        }

        const { type, title, message, link, metadata } = body

        // Validate notification type
        const validTypes = ['message', 'offer', 'inquiry', 'payment', 'system', 'alert']
        if (!validTypes.includes(type)) {
            return errorResponse(`Invalid notification type. Must be one of: ${validTypes.join(', ')}`)
        }

        // Create notification document
        const notificationData = {
            userId,
            type,
            title,
            message,
            link: link || null,
            metadata: metadata || {},
            read: false,
            createdAt: serverTimestamp(),
        }

        const docRef = await addDoc(collection(db, 'notifications'), notificationData)

        // Update user's unread count (optional optimization)
        try {
            const userRef = doc(db, 'users', userId)
            const userSnap = await getDoc(userRef)

            if (userSnap.exists()) {
                const currentUnread = userSnap.data().unreadNotifications || 0
                await updateDoc(userRef, {
                    unreadNotifications: currentUnread + 1
                })
            }
        } catch (error) {
            console.error('Error updating unread count:', error)
            // Don't fail the notification creation
        }

        return successResponse({
            id: docRef.id,
            notification: {
                id: docRef.id,
                ...notificationData,
            }
        }, 'Notification created successfully')

    } catch (error: any) {
        console.error('Notification creation error:', error)
        return handleRouteError(error)
    }
})

export async function OPTIONS() {
    return handleOptions()
}
