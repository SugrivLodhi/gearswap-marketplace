import jwt from 'jsonwebtoken';
import { User, UserRole, IUser } from './auth.model';
import { env } from '../../config/environment';
import { enqueueWelcomeEmail } from '../../queues';

export interface RegisterInput {
    email: string;
    password: string;
    role: UserRole;
}

export interface LoginInput {
    email: string;
    password: string;
}

export interface AuthPayload {
    token: string;
    user: {
        id: string;
        email: string;
        role: UserRole;
    };
}

export interface TokenPayload {
    userId: string;
    email: string;
    role: UserRole;
}

class AuthService {
    /**
     * Register a new user
     */
    async register(input: RegisterInput): Promise<AuthPayload> {
        const { email, password, role } = input;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // Validate password length
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        // Create new user
        const user = await User.create({
            email,
            password,
            role,
        });

        // Enqueue welcome email as a background job (fire-and-forget, idempotent)
        await enqueueWelcomeEmail({
            jobId: `welcome-${user._id.toString()}`, // deduplication key
            userId: user._id.toString(),
            email: user.email,
        });

        // Generate token
        const token = this.generateToken(user);

        return {
            token,
            user: {
                id: user._id.toString(),
                email: user.email,
                role: user.role,
            },
        };
    }

    /**
     * Login user
     */
    async login(input: LoginInput): Promise<AuthPayload> {
        const { email, password } = input;

        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        // Generate token
        const token = this.generateToken(user);

        return {
            token,
            user: {
                id: user._id.toString(),
                email: user.email,
                role: user.role,
            },
        };
    }

    /**
     * Generate JWT token
     */
    private generateToken(user: IUser): string {
        const payload: TokenPayload = {
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
        };

        return jwt.sign(payload, env.jwtSecret, {
            expiresIn: env.jwtExpiresIn,
        } as jwt.SignOptions);
    }

    /**
     * Verify JWT token
     */
    verifyToken(token: string): TokenPayload {
        try {
            return jwt.verify(token, env.jwtSecret) as TokenPayload;
        } catch (error) {
            throw new Error('Invalid or expired token');
        }
    }

    /**
     * Get user by ID
     */
    async getUserById(userId: string): Promise<IUser | null> {
        return User.findById(userId);
    }
}

export const authService = new AuthService();
