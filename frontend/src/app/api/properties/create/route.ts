import { NextRequest, NextResponse } from 'next/server'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { successResponse, errorResponse, handleRouteError, validateRequestBody, withAuth, handleOptions } from '@/lib/api-utils'

export const POST = withAuth(async (request: NextRequest, { userId, userEmail }) => {
    try {
        if (!db) {
            return errorResponse('Database service unavailable', 503)
        }

        const body = await request.json()

        // Validate required fields
        const validationErrors = validateRequestBody(body, [
            'title',
            'description',
            'price',
            'propertyType',
            'city',
            'state',
            'area',
        ])

        if (validationErrors.length > 0) {
            return errorResponse(validationErrors.join(', '))
        }

        // Additional validation
        if (body.price <= 0) {
            return errorResponse('Price must be greater than 0')
        }

        if (body.area && body.area <= 0) {
            return errorResponse('Area must be greater than 0')
        }

        // Check user's subscription status (seller listing limits)
        // This would integrate with SellerSubscriptionContext logic
        // For now, we'll allow the creation

        // Create property document
        const propertyData = {
            ...body,
            sellerId: userId,
            sellerEmail: userEmail,
            status: 'pending', // Pending admin approval
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            views: 0,
            favorites: 0,
            inquiries: 0,
        }

        const docRef = await addDoc(collection(db, 'properties'), propertyData)

        return successResponse({
            id: docRef.id,
            message: 'Property listing created successfully. Pending admin approval.'
        }, 'Property listing submitted')

    } catch (error: any) {
        console.error('Property creation error:', error)
        return handleRouteError(error)
    }
})

export async function OPTIONS() {
    return handleOptions()
}
