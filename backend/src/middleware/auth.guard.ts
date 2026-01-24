import { Request } from 'express';
import { authService, TokenPayload } from '../modules/auth/auth.service';
import { UserRole } from '../modules/auth/auth.model';

export interface GraphQLContext {
    user?: TokenPayload;
}

/**
 * Extract JWT token from request headers
 */
export const getTokenFromRequest = (req: Request): string | null => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return null;
    }

    // Expected format: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }

    return parts[1];
};

/**
 * Create GraphQL context with authenticated user
 */
export const createContext = async ({ req }: { req: Request }): Promise<GraphQLContext> => {
    const token = getTokenFromRequest(req);

    if (!token) {
        return {};
    }

    try {
        const user = authService.verifyToken(token);
        return { user };
    } catch (error) {
        // Invalid token - return empty context
        return {};
    }
};

/**
 * Guard to ensure user is authenticated
 */
export const requireAuth = (context: GraphQLContext): TokenPayload => {
    if (!context.user) {
        throw new Error('Authentication required');
    }
    return context.user;
};

/**
 * Guard to ensure user has specific role
 */
export const requireRole = (context: GraphQLContext, role: UserRole): TokenPayload => {
    const user = requireAuth(context);

    if (user.role !== role) {
        throw new Error(`Access denied. ${role} role required`);
    }

    return user;
};

/**
 * Guard to ensure user is a buyer
 */
export const requireBuyer = (context: GraphQLContext): TokenPayload => {
    return requireRole(context, UserRole.BUYER);
};

/**
 * Guard to ensure user is a seller
 */
export const requireSeller = (context: GraphQLContext): TokenPayload => {
    return requireRole(context, UserRole.SELLER);
};
