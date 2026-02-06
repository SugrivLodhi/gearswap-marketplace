import jwt from 'jsonwebtoken';
import { User, UserRole, IUser } from './auth.model';
import { env } from '../../config/environment';
import { redis } from '../../config/redis';

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
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // Validate password length
        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        // Create new user
        const user = await User.create(email, password, role);

        // Generate token
        const token = this.generateToken(user);

        // Cache user session
        await this.cacheUserSession(user);

        return {
            token,
            user: {
                id: user.id,
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
        const user = await User.findByEmail(email);
        if (!user) {
            throw new Error('Invalid email or password');
        }

        // Verify password
        const isPasswordValid = await User.comparePassword(password, user.password_hash);
        if (!isPasswordValid) {
            throw new Error('Invalid email or password');
        }

        // Generate token
        const token = this.generateToken(user);

        // Cache user session
        await this.cacheUserSession(user);

        return {
            token,
            user: {
                id: user.id,
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
            userId: user.id,
            email: user.email,
            role: user.role,
        };

        return jwt.sign(payload, env.jwtSecret, {
            expiresIn: env.jwtExpiresIn,
        });
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
        // Try cache first
        const cached = await redis.get(`user:session:${userId}`);
        if (cached) {
            return JSON.parse(cached);
        }

        // Fetch from database
        const user = await User.findById(userId);
        if (user) {
            await this.cacheUserSession(user);
        }
        return user;
    }

    /**
     * Cache user session in Redis
     */
    private async cacheUserSession(user: IUser): Promise<void> {
        const sessionData = {
            id: user.id,
            email: user.email,
            role: user.role,
        };
        await redis.set(`user:session:${user.id}`, JSON.stringify(sessionData), 900); // 15 minutes TTL
    }
}

export const authService = new AuthService();
