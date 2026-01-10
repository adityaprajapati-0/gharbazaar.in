/**
 * 🔐 SOCKET.IO AUTHENTICATION MIDDLEWARE
 * 
 * Verifies JWT tokens for Socket.IO connections.
 * Ensures only authenticated users can connect to real-time features.
 * 
 * @author GharBazaar Backend Team
 */

import { Socket } from 'socket.io';
import { ExtendedError } from 'socket.io/dist/namespace';
import { verifyToken, TokenPayload } from '../utils/jwt';

/**
 * Extended Socket interface with user data
 * After authentication, the socket will have user information attached
 */
export interface AuthenticatedSocket extends Socket {
    user: TokenPayload;  // User data from JWT token
}

/**
 * 🔒 SOCKET AUTHENTICATION MIDDLEWARE
 * 
 * This middleware runs BEFORE any socket connection is established.
 * It verifies the JWT token sent by the client and rejects invalid connections.
 * 
 * Flow:
 * 1. Client sends token in auth handshake: io.connect(url, { auth: { token } })
 * 2. Server receives connection attempt
 * 3. This middleware extracts and verifies the token
 * 4. If valid: connection succeeds, user data attached to socket
 * 5. If invalid: connection rejected with error message
 * 
 * @param socket - Socket.IO socket instance
 * @param next - Callback to continue or reject connection
 */
export const authenticateSocket = (
    socket: Socket,
    next: (err?: ExtendedError) => void
) => {
    try {
        // Extract token from auth handshake
        // Frontend sends: io.connect(url, { auth: { token: 'jwt_here' } })
        const token = socket.handshake.auth?.token;

        // No token provided? Reject connection
        if (!token) {
            console.warn('⚠️  Socket connection rejected: No token provided');
            return next(new Error('Authentication required. Please provide a valid token.'));
        }

        // Verify the JWT token
        // This will throw an error if token is invalid or expired
        const decoded = verifyToken(token);

        // Token is valid! Attach user data to socket for future use
        // Now all event handlers can access socket.user
        (socket as AuthenticatedSocket).user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
        };

        console.log(`✅ Socket authenticated: ${decoded.email} (${decoded.userId})`);

        // Allow the connection to proceed
        next();

    } catch (error) {
        // Token verification failed
        console.error('❌ Socket authentication failed:', error);

        // Send specific error message to client
        const errorMessage = error instanceof Error
            ? error.message
            : 'Authentication failed. Please login again.';

        // Reject the connection
        next(new Error(errorMessage));
    }
};

/**
 * 🔍 HELPER: GET USER FROM SOCKET
 * 
 * Type-safe helper to get authenticated user from socket.
 * Use this in event handlers to access user data.
 * 
 * @param socket - Socket.IO socket
 * @returns User payload from JWT
 * 
 * @example
 * socket.on('send_message', async (data) => {
 *   const user = getSocketUser(socket);
 *   console.log(`Message from: ${user.email}`);
 * });
 */
export const getSocketUser = (socket: Socket): TokenPayload => {
    return (socket as AuthenticatedSocket).user;
};
