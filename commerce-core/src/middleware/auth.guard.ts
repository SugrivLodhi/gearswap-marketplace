import { authService, TokenPayload } from '../modules/auth/auth.service';

export interface GraphQLContext {
    user?: TokenPayload;
    headers: any;
}

export async function createContext({ req }: any): Promise<GraphQLContext> {
    const context: GraphQLContext = {
        headers: req.headers,
    };

    // Extract token from Authorization header
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    if (token) {
        try {
            const payload = authService.verifyToken(token);
            context.user = payload;
        } catch (error) {
            // Token is invalid, but don't throw error
            // Some queries/mutations don't require authentication
            console.warn('Invalid token:', error);
        }
    }

    return context;
}

export function requireAuth(context: GraphQLContext): void {
    if (!context.user) {
        throw new Error('Authentication required');
    }
}

export function requireRole(context: GraphQLContext, role: string): void {
    requireAuth(context);
    if (context.user!.role !== role) {
        throw new Error(`${role} role required`);
    }
}
