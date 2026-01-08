import { NextRequest, NextResponse } from 'next/server'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { successResponse, errorResponse, handleRouteError, handleOptions } from '@/lib/api-utils'

interface RouteContext {
    params: { id: string }
}

export async function GET(
    request: NextRequest,
    { params }: RouteContext
) {
    try {
        if (!db) {
            return errorResponse('Database service unavailable', 503)
        }

        const { id } = params

        if (!id) {
            return errorResponse('Property ID is required')
        }

        // Get property document
        const propertyRef = doc(db, 'properties', id)
        const propertySnap = await getDoc(propertyRef)

        if (!propertySnap.exists()) {
            return errorResponse('Property not found', 404)
        }

        const propertyData = {
            id: propertySnap.id,
            ...propertySnap.data(),
        }

        // Increment view count (background, non-blocking)
        // Note: Use Firebase Function or transaction for accurate counting

        return successResponse(propertyData)

    } catch (error: any) {
        console.error('Property fetch error:', error)
        return handleRouteError(error)
    }
}

export async function OPTIONS() {
    return handleOptions()
}
