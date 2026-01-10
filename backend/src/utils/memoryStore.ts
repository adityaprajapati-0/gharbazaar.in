/**
 * 💾 IN-MEMORY DATA STORE
 * 
 * Fallback storage when MongoDB is not available.
 * All data is stored in memory and lost on server restart.
 * 
 * @author GharBazaar Backend Team
 */

// In-memory storage for conversations
export const memoryConversations = new Map();

// In-memory storage for messages
export const memoryMessages = new Map();

// In-memory storage for tickets
export const memoryTickets = new Map();

// In-memory storage for ticket messages
export const memoryTicketMessages = new Map();

/**
 * Check if MongoDB is available
 */
import mongoose from 'mongoose';

export const isMongoDBAvailable = (): boolean => {
    return mongoose.connection.readyState === 1; // 1 = connected
};

/**
 * Log memory-only mode warning
 */
export const logMemoryOnlyMode = () => {
    if (!isMongoDBAvailable()) {
        console.warn('⚠️  Using IN-MEMORY storage - Data will not persist!');
    }
};
