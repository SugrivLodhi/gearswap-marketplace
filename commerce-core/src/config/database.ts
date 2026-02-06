import { Pool, PoolClient } from 'pg';
import { env } from './environment';

class Database {
    private pool: Pool;

    constructor() {
        this.pool = new Pool({
            connectionString: env.databaseUrl,
            max: 20, // Maximum number of clients in the pool
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        this.pool.on('error', (err) => {
            console.error('Unexpected error on idle client', err);
        });
    }

    async connect(): Promise<void> {
        try {
            const client = await this.pool.connect();
            console.log('✅ PostgreSQL connected successfully');
            client.release();
        } catch (error) {
            console.error('❌ PostgreSQL connection failed:', error);
            throw error;
        }
    }

    async query(text: string, params?: any[]): Promise<any> {
        const start = Date.now();
        try {
            const res = await this.pool.query(text, params);
            const duration = Date.now() - start;
            if (env.nodeEnv === 'development') {
                console.log('Executed query', { text, duration, rows: res.rowCount });
            }
            return res;
        } catch (error) {
            console.error('Query error:', error);
            throw error;
        }
    }

    async getClient(): Promise<PoolClient> {
        return await this.pool.connect();
    }

    async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async close(): Promise<void> {
        await this.pool.end();
        console.log('PostgreSQL connection pool closed');
    }
}

export const db = new Database();
