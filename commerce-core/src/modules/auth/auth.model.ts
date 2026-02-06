import bcrypt from 'bcryptjs';
import { db } from '../../config/database';

export enum UserRole {
    BUYER = 'BUYER',
    SELLER = 'SELLER',
}

export interface IUser {
    id: string;
    email: string;
    password_hash: string;
    role: UserRole;
    created_at: Date;
    updated_at: Date;
}

export class UserModel {
    /**
     * Create a new user
     */
    async create(email: string, password: string, role: UserRole): Promise<IUser> {
        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        const result = await db.query(
            `INSERT INTO users (email, password_hash, role)
             VALUES ($1, $2, $3)
             RETURNING id, email, password_hash, role, created_at, updated_at`,
            [email, password_hash, role]
        );

        return result.rows[0];
    }

    /**
     * Find user by email
     */
    async findByEmail(email: string): Promise<IUser | null> {
        const result = await db.query(
            'SELECT id, email, password_hash, role, created_at, updated_at FROM users WHERE email = $1',
            [email]
        );

        return result.rows[0] || null;
    }

    /**
     * Find user by ID
     */
    async findById(id: string): Promise<IUser | null> {
        const result = await db.query(
            'SELECT id, email, password_hash, role, created_at, updated_at FROM users WHERE id = $1',
            [id]
        );

        return result.rows[0] || null;
    }

    /**
     * Compare password
     */
    async comparePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }
}

export const User = new UserModel();
