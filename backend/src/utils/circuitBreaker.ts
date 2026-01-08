import { logger } from '../utils/logger';

/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures when external services are down
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
    name: string;
    failureThreshold: number;     // Number of failures before opening
    successThreshold: number;     // Number of successes to close from half-open
    timeout: number;              // Time in ms before trying again (half-open)
    monitoringWindow: number;     // Time window to count failures
}

interface CircuitStats {
    state: CircuitState;
    failures: number;
    successes: number;
    lastFailure: Date | null;
    lastSuccess: Date | null;
    totalRequests: number;
    failedRequests: number;
}

export class CircuitBreaker {
    private state: CircuitState = 'CLOSED';
    private failures: number = 0;
    private successes: number = 0;
    private lastFailureTime: Date | null = null;
    private lastSuccessTime: Date | null = null;
    private totalRequests: number = 0;
    private failedRequests: number = 0;
    private readonly config: CircuitBreakerConfig;

    constructor(config: Partial<CircuitBreakerConfig> & { name: string }) {
        this.config = {
            failureThreshold: 5,
            successThreshold: 3,
            timeout: 30000, // 30 seconds
            monitoringWindow: 60000, // 1 minute
            ...config,
        };
    }

    /**
     * Execute a function with circuit breaker protection
     */
    async execute<T>(fn: () => Promise<T>, fallback?: () => T | Promise<T>): Promise<T> {
        this.totalRequests++;

        // Check if circuit is open
        if (this.state === 'OPEN') {
            // Check if timeout has passed
            if (this.shouldAttemptReset()) {
                this.state = 'HALF_OPEN';
                logger.info(`Circuit ${this.config.name} is HALF_OPEN, testing...`);
            } else {
                logger.debug(`Circuit ${this.config.name} is OPEN, rejecting request`);
                this.failedRequests++;

                if (fallback) {
                    return fallback();
                }

                throw new Error(`Circuit ${this.config.name} is OPEN`);
            }
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();

            if (fallback) {
                return fallback();
            }

            throw error;
        }
    }

    /**
     * Handle successful execution
     */
    private onSuccess(): void {
        this.lastSuccessTime = new Date();
        this.failures = 0;

        if (this.state === 'HALF_OPEN') {
            this.successes++;

            if (this.successes >= this.config.successThreshold) {
                this.state = 'CLOSED';
                this.successes = 0;
                logger.info(`Circuit ${this.config.name} is CLOSED`);
            }
        }
    }

    /**
     * Handle failed execution
     */
    private onFailure(): void {
        this.failures++;
        this.failedRequests++;
        this.lastFailureTime = new Date();

        if (this.state === 'HALF_OPEN') {
            this.state = 'OPEN';
            this.successes = 0;
            logger.warn(`Circuit ${this.config.name} is OPEN (failed during half-open)`);
        } else if (this.failures >= this.config.failureThreshold) {
            this.state = 'OPEN';
            logger.warn(`Circuit ${this.config.name} is OPEN (threshold reached)`);
        }
    }

    /**
     * Check if we should try to reset the circuit
     */
    private shouldAttemptReset(): boolean {
        if (!this.lastFailureTime) return true;

        const timeSinceLastFailure = Date.now() - this.lastFailureTime.getTime();
        return timeSinceLastFailure >= this.config.timeout;
    }

    /**
     * Get circuit statistics
     */
    getStats(): CircuitStats {
        return {
            state: this.state,
            failures: this.failures,
            successes: this.successes,
            lastFailure: this.lastFailureTime,
            lastSuccess: this.lastSuccessTime,
            totalRequests: this.totalRequests,
            failedRequests: this.failedRequests,
        };
    }

    /**
     * Force reset the circuit
     */
    reset(): void {
        this.state = 'CLOSED';
        this.failures = 0;
        this.successes = 0;
        logger.info(`Circuit ${this.config.name} manually reset`);
    }

    /**
     * Force open the circuit (for maintenance)
     */
    forceOpen(): void {
        this.state = 'OPEN';
        this.lastFailureTime = new Date();
        logger.info(`Circuit ${this.config.name} force opened`);
    }
}

/**
 * Pre-configured circuit breakers for external services
 */
export const circuitBreakers = {
    sendgrid: new CircuitBreaker({
        name: 'sendgrid',
        failureThreshold: 3,
        timeout: 60000, // 1 minute
    }),
    twilio: new CircuitBreaker({
        name: 'twilio',
        failureThreshold: 3,
        timeout: 60000,
    }),
    razorpay: new CircuitBreaker({
        name: 'razorpay',
        failureThreshold: 2, // More sensitive for payments
        timeout: 30000, // 30 seconds
    }),
    firebase: new CircuitBreaker({
        name: 'firebase',
        failureThreshold: 5,
        timeout: 30000,
    }),
    redis: new CircuitBreaker({
        name: 'redis',
        failureThreshold: 3,
        timeout: 10000, // Quick recovery for cache
    }),
};

/**
 * Get all circuit breaker stats
 */
export function getAllCircuitStats(): Record<string, CircuitStats> {
    const stats: Record<string, CircuitStats> = {};

    for (const [name, breaker] of Object.entries(circuitBreakers)) {
        stats[name] = breaker.getStats();
    }

    return stats;
}

/**
 * Reset all circuit breakers
 */
export function resetAllCircuits(): void {
    for (const breaker of Object.values(circuitBreakers)) {
        breaker.reset();
    }
    logger.info('All circuit breakers reset');
}
