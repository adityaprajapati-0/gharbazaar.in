import { getFirestore } from '../config/firebase';
import { logger } from './logger';

/**
 * Optimized Firestore query builder for high-performance data retrieval
 */
export class QueryBuilder {
    private db = getFirestore();
    private collectionRef: any;
    private queryRef: any;
    private limitValue: number = 20;
    private selectFields: string[] = [];

    constructor(collection: string) {
        this.collectionRef = this.db.collection(collection);
        this.queryRef = this.collectionRef;
    }

    /**
     * Add where clause
     */
    where(field: string, operator: any, value: any): QueryBuilder {
        if (value !== undefined && value !== null && value !== '') {
            this.queryRef = this.queryRef.where(field, operator, value);
        }
        return this;
    }

    /**
     * Add multiple where clauses
     */
    whereAll(conditions: Array<{ field: string; operator: any; value: any }>): QueryBuilder {
        for (const condition of conditions) {
            if (condition.value !== undefined && condition.value !== null && condition.value !== '') {
                this.queryRef = this.queryRef.where(condition.field, condition.operator, condition.value);
            }
        }
        return this;
    }

    /**
     * Order by field
     */
    orderBy(field: string, direction: 'asc' | 'desc' = 'desc'): QueryBuilder {
        this.queryRef = this.queryRef.orderBy(field, direction);
        return this;
    }

    /**
     * Limit results
     */
    limit(count: number): QueryBuilder {
        this.limitValue = Math.min(count, 100); // Cap at 100 for performance
        return this;
    }

    /**
     * Offset for pagination (use cursor-based when possible)
     */
    offset(count: number): QueryBuilder {
        this.queryRef = this.queryRef.offset(count);
        return this;
    }

    /**
     * Cursor-based pagination (more efficient than offset)
     */
    startAfter(document: any): QueryBuilder {
        this.queryRef = this.queryRef.startAfter(document);
        return this;
    }

    /**
     * Start at cursor
     */
    startAt(document: any): QueryBuilder {
        this.queryRef = this.queryRef.startAt(document);
        return this;
    }

    /**
     * Select specific fields (reduces data transfer)
     */
    select(...fields: string[]): QueryBuilder {
        this.selectFields = fields;
        if (fields.length > 0) {
            this.queryRef = this.queryRef.select(...fields);
        }
        return this;
    }

    /**
     * Execute query and return results
     */
    async get<T>(): Promise<{ data: T[]; count: number; lastDoc: any }> {
        try {
            const snapshot = await this.queryRef.limit(this.limitValue).get();

            const data = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data(),
            })) as T[];

            return {
                data,
                count: data.length,
                lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
            };
        } catch (error) {
            logger.error('Query execution error:', error);
            throw error;
        }
    }

    /**
     * Get with pagination metadata
     */
    async getPaginated<T>(page: number = 1, pageSize: number = 20): Promise<{
        data: T[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }> {
        const offset = (page - 1) * pageSize;

        // Execute query with one extra to check if there's more
        const snapshot = await this.queryRef
            .offset(offset)
            .limit(pageSize + 1)
            .get();

        const docs = snapshot.docs;
        const hasNext = docs.length > pageSize;
        const data = docs.slice(0, pageSize).map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
        })) as T[];

        // Get approximate total (for small collections only)
        // For large collections, use a counter document instead
        let total = offset + data.length + (hasNext ? 1 : 0);

        return {
            data,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
                hasNext,
                hasPrev: page > 1,
            },
        };
    }

    /**
     * Get single document by ID (optimized)
     */
    static async getById<T>(collection: string, id: string): Promise<T | null> {
        try {
            const db = getFirestore();
            const doc = await db.collection(collection).doc(id).get();

            if (!doc.exists) {
                return null;
            }

            return { id: doc.id, ...doc.data() } as T;
        } catch (error) {
            logger.error('Get by ID error:', error);
            return null;
        }
    }

    /**
     * Batch get multiple documents by IDs (optimized)
     */
    static async getByIds<T>(collection: string, ids: string[]): Promise<T[]> {
        if (ids.length === 0) return [];

        try {
            const db = getFirestore();
            const refs = ids.map(id => db.collection(collection).doc(id));
            const docs = await db.getAll(...refs);

            return docs
                .filter((doc: any) => doc.exists)
                .map((doc: any) => ({ id: doc.id, ...doc.data() })) as T[];
        } catch (error) {
            logger.error('Batch get error:', error);
            return [];
        }
    }

    /**
     * Count documents (use sparingly - can be expensive)
     */
    async count(): Promise<number> {
        try {
            const snapshot = await this.queryRef.count().get();
            return snapshot.data().count;
        } catch (error) {
            // Fallback for older Firestore versions
            const snapshot = await this.queryRef.get();
            return snapshot.size;
        }
    }

    /**
     * Check if any documents exist
     */
    async exists(): Promise<boolean> {
        const snapshot = await this.queryRef.limit(1).get();
        return !snapshot.empty;
    }
}

/**
 * Batch write operations for efficient bulk updates
 */
export class BatchWriter {
    private db = getFirestore();
    private batch: any;
    private operationCount: number = 0;
    private readonly MAX_BATCH_SIZE = 500;

    constructor() {
        this.batch = this.db.batch();
    }

    /**
     * Add create operation
     */
    create(collection: string, data: any, id?: string): BatchWriter {
        const ref = id
            ? this.db.collection(collection).doc(id)
            : this.db.collection(collection).doc();

        this.batch.set(ref, {
            ...data,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });

        this.operationCount++;
        this.checkBatchSize();
        return this;
    }

    /**
     * Add update operation
     */
    update(collection: string, id: string, data: any): BatchWriter {
        const ref = this.db.collection(collection).doc(id);
        this.batch.update(ref, {
            ...data,
            updatedAt: new Date().toISOString(),
        });

        this.operationCount++;
        this.checkBatchSize();
        return this;
    }

    /**
     * Add delete operation
     */
    delete(collection: string, id: string): BatchWriter {
        const ref = this.db.collection(collection).doc(id);
        this.batch.delete(ref);

        this.operationCount++;
        this.checkBatchSize();
        return this;
    }

    /**
     * Commit all operations
     */
    async commit(): Promise<void> {
        if (this.operationCount > 0) {
            await this.batch.commit();
            logger.info(`Batch committed: ${this.operationCount} operations`);
        }
    }

    /**
     * Check and handle batch size limits
     */
    private checkBatchSize(): void {
        if (this.operationCount >= this.MAX_BATCH_SIZE) {
            logger.warn('Batch size limit reached, consider splitting operations');
        }
    }
}

/**
 * Create a new query builder instance
 */
export const query = (collection: string) => new QueryBuilder(collection);

/**
 * Create a new batch writer instance
 */
export const batch = () => new BatchWriter();
