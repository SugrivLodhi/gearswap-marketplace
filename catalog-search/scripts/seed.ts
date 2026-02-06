import mongoose from 'mongoose';
import { connectDB } from '../src/config/database';
import { Product } from '../src/modules/product/product.model';

/**
 * Seed MongoDB database with dummy products
 */
async function seed() {
    try {
        console.log('🌱 Starting MongoDB seeding...');

        // Connect to MongoDB
        await connectDB();

        // Clear existing products
        console.log('Clearing existing products...');
        await Product.deleteMany({});

        // Dummy seller IDs (from PostgreSQL seed)
        const sellerIds = [
            '00000000-0000-0000-0000-000000000004', // seller1
            '00000000-0000-0000-0000-000000000005', // seller2
            '00000000-0000-0000-0000-000000000006', // seller3
        ];

        // Seed Products
        console.log('Seeding products...');

        const products = [
            // Electronics
            {
                name: 'iPhone 15 Pro',
                description: 'Latest Apple iPhone with A17 Pro chip, titanium design, and advanced camera system',
                category: 'Electronics',
                imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500',
                sellerId: new mongoose.Types.ObjectId(sellerIds[0]),
                hsnCode: '8517',
                gstRate: 18,
                sgstRate: 9,
                cgstRate: 9,
                igstRate: 18,
                variants: [
                    {
                        sku: 'IPHONE15-128-BLACK',
                        price: 134900,
                        stock: 25,
                        attributes: [
                            { key: 'Storage', value: '128GB' },
                            { key: 'Color', value: 'Black Titanium' },
                        ],
                    },
                    {
                        sku: 'IPHONE15-256-BLUE',
                        price: 144900,
                        stock: 20,
                        attributes: [
                            { key: 'Storage', value: '256GB' },
                            { key: 'Color', value: 'Blue Titanium' },
                        ],
                    },
                ],
            },
            {
                name: 'MacBook Pro 14"',
                description: 'Powerful laptop with M3 Pro chip, stunning Liquid Retina XDR display',
                category: 'Electronics',
                imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500',
                sellerId: new mongoose.Types.ObjectId(sellerIds[0]),
                hsnCode: '8471',
                gstRate: 18,
                sgstRate: 9,
                cgstRate: 9,
                igstRate: 18,
                variants: [
                    {
                        sku: 'MBP14-M3PRO-512',
                        price: 199900,
                        stock: 15,
                        attributes: [
                            { key: 'Processor', value: 'M3 Pro' },
                            { key: 'Storage', value: '512GB SSD' },
                            { key: 'RAM', value: '18GB' },
                        ],
                    },
                ],
            },
            {
                name: 'Sony WH-1000XM5',
                description: 'Industry-leading noise canceling headphones with exceptional sound quality',
                category: 'Electronics',
                imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500',
                sellerId: new mongoose.Types.ObjectId(sellerIds[2]),
                hsnCode: '8518',
                gstRate: 18,
                sgstRate: 9,
                cgstRate: 9,
                igstRate: 18,
                variants: [
                    {
                        sku: 'SONY-XM5-BLACK',
                        price: 29990,
                        stock: 50,
                        attributes: [
                            { key: 'Color', value: 'Black' },
                            { key: 'Type', value: 'Over-Ear' },
                        ],
                    },
                    {
                        sku: 'SONY-XM5-SILVER',
                        price: 29990,
                        stock: 40,
                        attributes: [
                            { key: 'Color', value: 'Silver' },
                            { key: 'Type', value: 'Over-Ear' },
                        ],
                    },
                ],
            },
            // Fashion
            {
                name: 'Levi\'s 501 Original Jeans',
                description: 'Classic straight fit jeans, the original since 1873',
                category: 'Fashion',
                imageUrl: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500',
                sellerId: new mongoose.Types.ObjectId(sellerIds[1]),
                hsnCode: '6203',
                gstRate: 12,
                sgstRate: 6,
                cgstRate: 6,
                igstRate: 12,
                variants: [
                    {
                        sku: 'LEVIS-501-32-BLUE',
                        price: 3999,
                        stock: 100,
                        attributes: [
                            { key: 'Size', value: '32' },
                            { key: 'Color', value: 'Blue' },
                        ],
                    },
                    {
                        sku: 'LEVIS-501-34-BLUE',
                        price: 3999,
                        stock: 80,
                        attributes: [
                            { key: 'Size', value: '34' },
                            { key: 'Color', value: 'Blue' },
                        ],
                    },
                    {
                        sku: 'LEVIS-501-32-BLACK',
                        price: 4299,
                        stock: 60,
                        attributes: [
                            { key: 'Size', value: '32' },
                            { key: 'Color', value: 'Black' },
                        ],
                    },
                ],
            },
            {
                name: 'Nike Air Max 270',
                description: 'Comfortable lifestyle sneakers with Max Air cushioning',
                category: 'Fashion',
                imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500',
                sellerId: new mongoose.Types.ObjectId(sellerIds[1]),
                hsnCode: '6403',
                gstRate: 12,
                sgstRate: 6,
                cgstRate: 6,
                igstRate: 12,
                variants: [
                    {
                        sku: 'NIKE-AM270-9-WHITE',
                        price: 12995,
                        stock: 45,
                        attributes: [
                            { key: 'Size', value: '9' },
                            { key: 'Color', value: 'White/Black' },
                        ],
                    },
                    {
                        sku: 'NIKE-AM270-10-WHITE',
                        price: 12995,
                        stock: 40,
                        attributes: [
                            { key: 'Size', value: '10' },
                            { key: 'Color', value: 'White/Black' },
                        ],
                    },
                ],
            },
            // Home & Kitchen
            {
                name: 'Philips Air Fryer',
                description: 'Healthy cooking with Rapid Air technology, 4.1L capacity',
                category: 'Home & Kitchen',
                imageUrl: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=500',
                sellerId: new mongoose.Types.ObjectId(sellerIds[2]),
                hsnCode: '8516',
                gstRate: 18,
                sgstRate: 9,
                cgstRate: 9,
                igstRate: 18,
                variants: [
                    {
                        sku: 'PHILIPS-AF-4.1L',
                        price: 8999,
                        stock: 30,
                        attributes: [
                            { key: 'Capacity', value: '4.1L' },
                            { key: 'Color', value: 'Black' },
                        ],
                    },
                ],
            },
            {
                name: 'Prestige Induction Cooktop',
                description: '2000W induction cooktop with automatic voltage regulator',
                category: 'Home & Kitchen',
                imageUrl: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=500',
                sellerId: new mongoose.Types.ObjectId(sellerIds[2]),
                hsnCode: '8516',
                gstRate: 18,
                sgstRate: 9,
                cgstRate: 9,
                igstRate: 18,
                variants: [
                    {
                        sku: 'PRESTIGE-IC-2000W',
                        price: 2499,
                        stock: 75,
                        attributes: [
                            { key: 'Power', value: '2000W' },
                            { key: 'Type', value: 'Induction' },
                        ],
                    },
                ],
            },
            // Books
            {
                name: 'Atomic Habits by James Clear',
                description: 'Tiny changes, remarkable results - an easy & proven way to build good habits',
                category: 'Books',
                imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=500',
                sellerId: new mongoose.Types.ObjectId(sellerIds[1]),
                hsnCode: '4901',
                gstRate: 0,
                sgstRate: 0,
                cgstRate: 0,
                igstRate: 0,
                variants: [
                    {
                        sku: 'BOOK-ATOMIC-HABITS',
                        price: 599,
                        stock: 200,
                        attributes: [
                            { key: 'Format', value: 'Paperback' },
                            { key: 'Language', value: 'English' },
                        ],
                    },
                ],
            },
            // Sports
            {
                name: 'Yonex Badminton Racket',
                description: 'Professional grade badminton racket with carbon fiber frame',
                category: 'Sports',
                imageUrl: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=500',
                sellerId: new mongoose.Types.ObjectId(sellerIds[0]),
                hsnCode: '9506',
                gstRate: 18,
                sgstRate: 9,
                cgstRate: 9,
                igstRate: 18,
                variants: [
                    {
                        sku: 'YONEX-ASTROX-88D',
                        price: 14990,
                        stock: 20,
                        attributes: [
                            { key: 'Model', value: 'Astrox 88D' },
                            { key: 'Weight', value: '88g' },
                        ],
                    },
                ],
            },
            {
                name: 'Nivia Storm Football',
                description: 'Professional quality football, FIFA approved',
                category: 'Sports',
                imageUrl: 'https://images.unsplash.com/photo-1614632537197-38a17061c2bd?w=500',
                sellerId: new mongoose.Types.ObjectId(sellerIds[0]),
                hsnCode: '9506',
                gstRate: 18,
                sgstRate: 9,
                cgstRate: 9,
                igstRate: 18,
                variants: [
                    {
                        sku: 'NIVIA-STORM-5',
                        price: 1299,
                        stock: 150,
                        attributes: [
                            { key: 'Size', value: '5' },
                            { key: 'Material', value: 'PU' },
                        ],
                    },
                ],
            },
        ];

        let createdCount = 0;
        for (const productData of products) {
            const product = await Product.create(productData);
            createdCount++;
            console.log(`  ✓ Created: ${product.name} (${product.variants.length} variants)`);
        }

        console.log('\n✅ MongoDB seeding completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`  - Products: ${createdCount}`);
        console.log(`  - Total Variants: ${products.reduce((sum, p) => sum + p.variants.length, 0)}`);
        console.log(`  - Categories: ${[...new Set(products.map(p => p.category))].join(', ')}`);

        await mongoose.connection.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seed();
