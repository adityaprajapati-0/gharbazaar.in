import http from 'http';
import https from 'https';

/**
 * Connection Pool Configuration
 * Optimizes HTTP connections for external API calls
 */

// Shared HTTP agent with connection pooling
export const httpAgent = new http.Agent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 100, // Max connections per host
    maxFreeSockets: 20, // Max idle connections
    timeout: 30000, // Socket timeout
    scheduling: 'fifo', // First-in-first-out
});

// Shared HTTPS agent with connection pooling
export const httpsAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 100,
    maxFreeSockets: 20,
    timeout: 30000,
    scheduling: 'fifo',
    rejectUnauthorized: true, // Verify SSL certificates
});

// Specialized agent for high-volume APIs (Firebase, etc.)
export const firebaseAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 60000,
    maxSockets: 200, // Higher limit for Firebase
    maxFreeSockets: 50,
    timeout: 60000,
    scheduling: 'fifo',
});

// Agent for payment APIs (Razorpay) - more conservative
export const paymentAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 20, // Conservative for payment APIs
    maxFreeSockets: 5,
    timeout: 15000, // Shorter timeout
    scheduling: 'fifo',
    rejectUnauthorized: true,
});

/**
 * Get agent statistics
 */
export function getAgentStats(): Record<string, any> {
    return {
        http: {
            sockets: Object.keys(httpAgent.sockets).length,
            freeSockets: Object.keys(httpAgent.freeSockets || {}).length,
            requests: Object.keys(httpAgent.requests || {}).length,
        },
        https: {
            sockets: Object.keys(httpsAgent.sockets).length,
            freeSockets: Object.keys(httpsAgent.freeSockets || {}).length,
            requests: Object.keys(httpsAgent.requests || {}).length,
        },
        firebase: {
            sockets: Object.keys(firebaseAgent.sockets).length,
            freeSockets: Object.keys(firebaseAgent.freeSockets || {}).length,
            requests: Object.keys(firebaseAgent.requests || {}).length,
        },
        payment: {
            sockets: Object.keys(paymentAgent.sockets).length,
            freeSockets: Object.keys(paymentAgent.freeSockets || {}).length,
            requests: Object.keys(paymentAgent.requests || {}).length,
        },
    };
}

/**
 * Destroy all agents (for graceful shutdown)
 */
export function destroyAllAgents(): void {
    httpAgent.destroy();
    httpsAgent.destroy();
    firebaseAgent.destroy();
    paymentAgent.destroy();
}

/**
 * Fetch configuration with connection pooling
 */
export const fetchConfig = {
    // Default for external APIs
    default: {
        agent: httpsAgent,
        timeout: 30000,
        headers: {
            'Connection': 'keep-alive',
        },
    },

    // For Firebase/Google APIs
    firebase: {
        agent: firebaseAgent,
        timeout: 60000,
        headers: {
            'Connection': 'keep-alive',
        },
    },

    // For payment APIs
    payment: {
        agent: paymentAgent,
        timeout: 15000,
        headers: {
            'Connection': 'keep-alive',
        },
    },
};

/**
 * DNS caching for faster lookups
 * Note: This is a simplified implementation
 * For production, consider using 'cacheable-lookup' package
 */
const dnsCache = new Map<string, { address: string; expires: number }>();
const DNS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function getCachedDns(hostname: string): string | null {
    const cached = dnsCache.get(hostname);

    if (cached && cached.expires > Date.now()) {
        return cached.address;
    }

    return null;
}

export function setCachedDns(hostname: string, address: string): void {
    dnsCache.set(hostname, {
        address,
        expires: Date.now() + DNS_CACHE_TTL,
    });
}

export function clearDnsCache(): void {
    dnsCache.clear();
}

/**
 * Connection pool statistics for monitoring
 */
export interface PoolStats {
    activeConnections: number;
    idleConnections: number;
    pendingRequests: number;
    dnsCacheSize: number;
}

export function getPoolStats(): PoolStats {
    const agents = getAgentStats();

    let active = 0;
    let idle = 0;
    let pending = 0;

    for (const agent of Object.values(agents)) {
        active += agent.sockets || 0;
        idle += agent.freeSockets || 0;
        pending += agent.requests || 0;
    }

    return {
        activeConnections: active,
        idleConnections: idle,
        pendingRequests: pending,
        dnsCacheSize: dnsCache.size,
    };
}
