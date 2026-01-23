import { authService, RegisterInput, LoginInput } from './auth.service';

export const authResolvers = {
    Mutation: {
        register: async (_: any, { input }: { input: RegisterInput }) => {
            try {
                return await authService.register(input);
            } catch (error: any) {
                throw new Error(error.message);
            }
        },

        login: async (_: any, { input }: { input: LoginInput }) => {
            try {
                return await authService.login(input);
            } catch (error: any) {
                throw new Error(error.message);
            }
        },
    },
};
