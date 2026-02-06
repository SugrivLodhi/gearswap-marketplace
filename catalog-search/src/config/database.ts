import mongoose from 'mongoose';
import { env } from './environment';

export async function connectDatabase(): Promise<void> {
    try {
        await mongoose.connect(env.mongodbUri);
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        throw error;
    }
}

export { mongoose };
