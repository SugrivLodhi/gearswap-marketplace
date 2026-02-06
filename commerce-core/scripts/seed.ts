import { db } from '../src/config/database';
import bcrypt from 'bcryptjs';

/**
 * Seed PostgreSQL database with dummy data
 * - Users (buyers and sellers)
 * - Discounts
 */
async function seed() {
    try {
        console.log('🌱 Starting PostgreSQL seeding...');

        // Clear existing data (in reverse order of dependencies)
        console.log('Clearing existing data...');
        await db.query('DELETE FROM order_items');
        await db.query('DELETE FROM orders');
        await db.query('DELETE FROM cart_items');
        await db.query('DELETE FROM carts');
        await db.query('DELETE FROM discounts');
        await db.query('DELETE FROM users');

        // Seed Users
        console.log('Seeding users...');
        const hashedPassword = await bcrypt.hash('password123', 10);

        const users = [
            // Buyers
            {
                email: 'buyer1@test.com',
                password: hashedPassword,
                role: 'BUYER',
                name: 'Rahul Sharma',
            },
            {
                email: 'buyer2@test.com',
                password: hashedPassword,
                role: 'BUYER',
                name: 'Priya Patel',
            },
            {
                email: 'buyer3@test.com',
                password: hashedPassword,
                role: 'BUYER',
                name: 'Amit Kumar',
            },
            // Sellers
            {
                email: 'seller1@test.com',
                password: hashedPassword,
                role: 'SELLER',
                name: 'TechStore India',
            },
            {
                email: 'seller2@test.com',
                password: hashedPassword,
                role: 'SELLER',
                name: 'Fashion Hub',
            },
            {
                email: 'seller3@test.com',
                password: hashedPassword,
                role: 'SELLER',
                name: 'Electronics World',
            },
        ];

        const userIds: string[] = [];
        for (const user of users) {
            const result = await db.query(
                `INSERT INTO users (email, password, role)
                 VALUES ($1, $2, $3)
                 RETURNING id`,
                [user.email, user.password, user.role]
            );
            userIds.push(result.rows[0].id);
            console.log(`  ✓ Created ${user.role}: ${user.email}`);
        }

        // Seed Discounts
        console.log('Seeding discounts...');
        const discounts = [
            {
                code: 'WELCOME10',
                type: 'PERCENTAGE',
                value: 10,
                minOrderValue: 500,
                maxDiscountAmount: 200,
                usageLimit: 100,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            },
            {
                code: 'FLAT200',
                type: 'FIXED',
                value: 200,
                minOrderValue: 1000,
                maxDiscountAmount: null,
                usageLimit: 50,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
            },
            {
                code: 'MEGA25',
                type: 'PERCENTAGE',
                value: 25,
                minOrderValue: 2000,
                maxDiscountAmount: 500,
                usageLimit: 20,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            },
            {
                code: 'SAVE500',
                type: 'FIXED',
                value: 500,
                minOrderValue: 5000,
                maxDiscountAmount: null,
                usageLimit: 10,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
            },
            {
                code: 'FIRSTBUY',
                type: 'PERCENTAGE',
                value: 15,
                minOrderValue: 0,
                maxDiscountAmount: 300,
                usageLimit: 1000,
                validFrom: new Date(),
                validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
            },
        ];

        for (const discount of discounts) {
            await db.query(
                `INSERT INTO discounts (
                    code, type, value, min_order_value, max_discount_amount,
                    usage_limit, valid_from, valid_until
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    discount.code,
                    discount.type,
                    discount.value,
                    discount.minOrderValue,
                    discount.maxDiscountAmount,
                    discount.usageLimit,
                    discount.validFrom,
                    discount.validUntil,
                ]
            );
            console.log(`  ✓ Created discount: ${discount.code} (${discount.type} ${discount.value})`);
        }

        console.log('\n✅ PostgreSQL seeding completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`  - Users: ${users.length} (${users.filter(u => u.role === 'BUYER').length} buyers, ${users.filter(u => u.role === 'SELLER').length} sellers)`);
        console.log(`  - Discounts: ${discounts.length}`);
        console.log('\n🔑 Test Credentials:');
        console.log('  Buyer: buyer1@test.com / password123');
        console.log('  Seller: seller1@test.com / password123');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();
