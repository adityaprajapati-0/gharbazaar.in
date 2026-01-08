import { NextRequest, NextResponse } from 'next/server'
import { collection, query, where, orderBy, limit, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { successResponse, errorResponse, handleRouteError, withAuth, parseQueryParams, handleOptions } from '@/lib/api-utils'

export const GET = withAuth(async (request: NextRequest, { userId }) => {
    try {
        if (!db) {
            return errorResponse('Database service unavailable', 503)
        }

        const params = parseQueryParams(request)
        const { unreadOnly, limitCount = '20', type } = params

        const constraints: any[] = [
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(parseInt(limitCount))
        ]

        if (unreadOnly === 'true') {
            constraints.push(where('read', '==', false))
        }

        if (type) {
            constraints.push(where('type', '==', type))
        }

        const notificationsQuery = query(
            collection(db, 'notifications'),
            ...constraints
        )

        const querySnapshot = await getDocs(notificationsQuery)

        const notifications = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }))

        // Get unread count
        const unreadQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', userId),
            where('read', '==', false)
        )
        const unreadSnapshot = await getDocs(unreadQuery)
        const unreadCount = unreadSnapshot.size

        return successResponse({
            notifications,
            unreadCount,
            total: notifications.length
        })

    } catch (error: any) {
        console.error('Notifications fetch error:', error)
        return handleRouteError(error)
    }
})

export const PUT = withAuth(async (request: NextRequest, { userId }) => {
    try {
        if (!db) {
            return errorResponse('Database service unavailable', 503)
        }

        const body = await request.json()
        const { notificationId, markAllAsRead } = body

        if (markAllAsRead) {
            // Mark all notifications as read
            const notificationsQuery = query(
                collection(db, 'notifications'),
                where('userId', '==', userId),
                where('read', '==', false)
            )

            const querySnapshot = await getDocs(notificationsQuery)
            const batch = writeBatch(db)

            querySnapshot.docs.forEach(doc => {
                batch.update(doc.ref, { read: true, readAt: new Date() })
            })

            await batch.commit()

            // Update user's unread count
            const userRef = doc(db, 'users', userId)
            await updateDoc(userRef, {
                unreadNotifications: 0
            })

            return successResponse({
                message: 'All notifications marked as read',
                count: querySnapshot.size
            })
        }

        if (notificationId) {
            // Mark single notification as read
            const notificationRef = doc(db, 'notifications', notificationId)
            const notificationSnap = await getDoc(notificationRef)

            if (!notificationSnap.exists()) {
                return errorResponse('Notification not found', 404)
            }

            // Verify ownership
            if (notificationSnap.data().userId !== userId) {
                return errorResponse('Unauthorized', 403)
            }

            await updateDoc(notificationRef, {
                read: true,
                readAt: new Date()
            })

            // Decrement user's unread count
            const userRef = doc(db, 'users', userId)
            const userSnap = await getDoc(userRef)

            if (userSnap.exists() && !notificationSnap.data().read) {
                const currentUnread = userSnap.data().unreadNotifications || 0
                await updateDoc(userRef, {
                    unreadNotifications: Math.max(0, currentUnread - 1)
                })
            }

            return successResponse({
                message: 'Notification marked as read',
                notificationId
            })
        }

        return errorResponse('Either notificationId or markAllAsRead must be provided')

    } catch (error: any) {
        console.error('Notification update error:', error)
        return handleRouteError(error)
    }
})

export async function OPTIONS() {
    return handleOptions()
}
