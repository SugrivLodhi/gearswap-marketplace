import { db } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

async function runMigrations() {
    try {
        console.log('🔄 Running database migrations...');

        const migrationFile = path.join(__dirname, '../../migrations/001_initial_schema.sql');
        const sql = fs.readFileSync(migrationFile, 'utf8');

        await db.query(sql);

        console.log('✅ Migrations completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigrations();
