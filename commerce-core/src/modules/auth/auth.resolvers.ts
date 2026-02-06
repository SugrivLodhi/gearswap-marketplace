import { authService } from './auth.service';
import { GraphQLContext } from '../../middleware/auth.guard';

export const authResolvers = {
    Query: {
        me: async (_: any, __: any, context: GraphQLContext) => {
            if (!context.user) {
                throw new Error('Not authenticated');
            }
            const user = await authService.getUserById(context.user.userId);
            if (!user) {
                throw new Error('User not found');
            }
            return {
                id: user.id,
                email: user.email,
                role: user.role,
                createdAt: user.created_at.toISOString(),
            };
        },
    },

    Mutation: {
        register: async (_: any, { input }: any) => {
            const result = await authService.register(input);
            return {
                token: result.token,
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    role: result.user.role,
                    createdAt: new Date().toISOString(),
                },
            };
        },

        login: async (_: any, { input }: any) => {
            const result = await authService.login(input);
            return {
                token: result.token,
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    role: result.user.role,
                    createdAt: new Date().toISOString(),
                },
            };
        },
    },

    User: {
        __resolveReference: async (reference: { id: string }) => {
            const user = await authService.getUserById(reference.id);
            if (!user) return null;
            return {
                id: user.id,
                email: user.email,
                role: user.role,
                createdAt: user.created_at.toISOString(),
            };
        },
    },
};
