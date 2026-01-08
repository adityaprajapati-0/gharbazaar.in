import { NextRequest, NextResponse } from 'next/server'
import { collection, query, where, orderBy, limit, getDocs, DocumentData, startAfter, Query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { successResponse, errorResponse, handleRouteError, parseQueryParams, handleOptions } from '@/lib/api-utils'

export async function GET(request: NextRequest) {
    try {
        if (!db) {
            return errorResponse('Database service unavailable', 503)
        }

        const params = parseQueryParams(request)

        // Parse filters
        const {
            city,
            propertyType,
            minPrice,
            maxPrice,
            bedrooms,
            bathrooms,
            minArea,
            maxArea,
            furnished,
            status,
            page = '1',
            pageSize = '20',
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = params

        // Build Firestore query
        let propertiesQuery: Query<DocumentData> = collection(db, 'properties')
        const constraints: any[] = []

        // Apply filters
        if (city) {
            constraints.push(where('city', '==', city))
        }

        if (propertyType) {
            constraints.push(where('propertyType', '==', propertyType))
        }

        if (status) {
            constraints.push(where('status', '==', status))
        } else {
            // Default: only show active listings
            constraints.push(where('status', '==', 'active'))
        }

        if (bedrooms) {
            constraints.push(where('bedrooms', '==', parseInt(bedrooms)))
        }

        if (bathrooms) {
            constraints.push(where('bathrooms', '==', parseInt(bathrooms)))
        }

        if (furnished) {
            constraints.push(where('furnished', '==', furnished))
        }

        // Price range (requires composite index)
        if (minPrice) {
            constraints.push(where('price', '>=', parseInt(minPrice)))
        }
        if (maxPrice) {
            constraints.push(where('price', '<=', parseInt(maxPrice)))
        }

        // Area range (requires composite index)
        if (minArea) {
            constraints.push(where('area', '>=', parseInt(minArea)))
        }
        if (maxArea) {
            constraints.push(where('area', '<=', parseInt(maxArea)))
        }

        // Add sorting
        constraints.push(orderBy(sortBy, sortOrder as 'asc' | 'desc'))

        // Add pagination
        const pageSizeNum = parseInt(pageSize)
        constraints.push(limit(pageSizeNum))

        // Create query with all constraints
        propertiesQuery = query(propertiesQuery, ...constraints)

        // Execute query
        const querySnapshot = await getDocs(propertiesQuery)

        const properties = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }))

        // Get total count (for pagination)
        // Note: This is expensive for large collections. Consider caching or using aggregation
        const totalQuery = query(collection(db, 'properties'), where('status', '==', 'active'))
        const totalSnapshot = await getDocs(totalQuery)
        const totalCount = totalSnapshot.size

        return successResponse({
            properties,
            pagination: {
                page: parseInt(page),
                pageSize: pageSizeNum,
                totalCount,
                totalPages: Math.ceil(totalCount / pageSizeNum),
                hasNextPage: properties.length === pageSizeNum,
            },
            filters: {
                city,
                propertyType,
                minPrice,
                maxPrice,
                bedrooms,
                bathrooms,
                minArea,
                maxArea,
                furnished,
                status,
            }
        })

    } catch (error: any) {
        console.error('Properties search error:', error)
        return handleRouteError(error)
    }
}

export async function OPTIONS() {
    return handleOptions()
}
