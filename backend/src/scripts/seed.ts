import mongoose from 'mongoose';
import { User, UserRole } from '../modules/auth/auth.model';
import { Product } from '../modules/product/product.model';
import { Discount, DiscountType } from '../modules/discount/discount.model';
import { connectDatabase } from '../config/database';
import bcrypt from 'bcryptjs';

/**
 * GearSwap - Musical Instrument Marketplace Seeder (India Edition)
 * Comprehensive Catalog
 */

async function seed() {
    try {
        console.log('🎵 Starting GearSwap Musical Instrument Marketplace Seeder (India)...\n');

        // Connect to database
        await connectDatabase();

        // Clear existing data
        console.log('🗑️  Clearing existing data...');
        await User.deleteMany({});
        await Product.deleteMany({});
        await Discount.deleteMany({});
        console.log('✅ Database cleared\n');

        // Create Users
        console.log('👥 Creating users...');
        const hashedPassword = await bcrypt.hash('password123', 10);

        // Buyers
        const buyer1 = await User.create({
            email: 'rahul.musician@example.com',
            password: hashedPassword,
            role: UserRole.BUYER,
        });

        const buyer2 = await User.create({
            email: 'priya.guitarist@example.com',
            password: hashedPassword,
            role: UserRole.BUYER,
        });

        // Sellers
        const seller1 = await User.create({
            email: 'guitar.heaven@gearswap.com',
            password: hashedPassword,
            role: UserRole.SELLER,
        });

        const seller2 = await User.create({
            email: 'keys.and.synths@gearswap.com',
            password: hashedPassword,
            role: UserRole.SELLER,
        });

        const seller3 = await User.create({
            email: 'drum.world@gearswap.com',
            password: hashedPassword,
            role: UserRole.SELLER,
        });

        const seller4 = await User.create({
            email: 'pro.audio@gearswap.com',
            password: hashedPassword,
            role: UserRole.SELLER,
        });

        console.log(`✅ Created buyers and sellers\n`);

        console.log('🎸 Creating products with INR pricing...');

        // 1. Electric Guitars
        await Product.create({
            name: 'Fender Stratocaster American Pro II',
            description: 'The iconic Stratocaster with modern refinements. Imported directly for Indian musicians.',
            category: 'Electric Guitars',
            imageUrl: 'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?w=800',
            sellerId: seller1._id,
            variants: [
                {
                    sku: 'STRAT-001',
                    price: 175000,
                    stock: 5,
                    attributes: { color: 'Sunburst', finish: 'Gloss' },
                },
            ],
        });

        await Product.create({
            name: 'Ibanez Gio GRX70QA',
            description: 'Top beginner electric guitar in India. Great for learning rock and metal.',
            category: 'Electric Guitars',
            imageUrl: 'https://images.unsplash.com/photo-1550985543-f4423c8d361e?w=800',
            sellerId: seller1._id,
            variants: [
                {
                    sku: 'GRX70-TRB',
                    price: 18500,
                    stock: 50,
                    attributes: { color: 'Transparent Red Burst' },
                },
            ],
        });

        // 2. Acoustic Guitars
        await Product.create({
            name: 'Yamaha F310 Acoustic Guitar',
            description: 'The most popular acoustic folk guitar in India. Excellent quality at an affordable price.',
            category: 'Acoustic Guitars',
            imageUrl: 'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=800',
            sellerId: seller1._id,
            variants: [
                {
                    sku: 'F310-NAT',
                    price: 10500,
                    stock: 100,
                    attributes: { finish: 'Natural', body: 'Folk' },
                },
            ],
        });

        await Product.create({
            name: 'Taylor 214ce-K DLX',
            description: 'Premium Grand Auditorium guitar with layered Koa back and sides. Stage-ready electronics.',
            category: 'Acoustic Guitars',
            imageUrl: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800',
            sellerId: seller1._id,
            variants: [
                {
                    sku: 'TAYLOR-214',
                    price: 145000,
                    stock: 3,
                    attributes: { wood: 'Koa', electronics: 'ES2' },
                },
            ],
        });

        // 3. Bass Guitars
        await Product.create({
            name: 'Fender Player Precision Bass',
            description: 'Real Fender bass tone and style. The standard for bass players worldwide.',
            category: 'Bass Guitars',
            imageUrl: 'https://images.unsplash.com/photo-1556449895-a33c9dba33dd?w=800',
            sellerId: seller1._id,
            variants: [
                {
                    sku: 'PBASS-PLr',
                    price: 78000,
                    stock: 5,
                    attributes: { color: 'Polar White', strings: '4' },
                },
            ],
        });

        await Product.create({
            name: 'Ibanez SR300E Bass',
            description: 'Compact body and slim neck, perfect for fast playing styles. Active EQ for versatile tones.',
            category: 'Bass Guitars',
            imageUrl: 'https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?w=800',
            sellerId: seller1._id,
            variants: [
                {
                    sku: 'SR300E-IPT',
                    price: 32000,
                    stock: 10,
                    attributes: { color: 'Iron Pewter', strings: '4' },
                },
            ],
        });

        // 4. Keyboards & Synths
        await Product.create({
            name: 'Yamaha PSR-E473 Portable Keyboard',
            description: 'Feature-packed keyboard ideal for performing musicians. Includes Indian instrument voices.',
            category: 'Keyboards & Synthesizers',
            imageUrl: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800',
            sellerId: seller2._id,
            variants: [
                {
                    sku: 'PSRE473',
                    price: 24500,
                    stock: 25,
                    attributes: { keys: '61', type: 'Arranger' },
                },
            ],
        });

        await Product.create({
            name: 'Korg Kronos 2 Workstation',
            description: 'The world-class workstation for professional touring and studio production.',
            category: 'Keyboards & Synthesizers',
            imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
            sellerId: seller2._id,
            variants: [
                {
                    sku: 'KRONOS2-88',
                    price: 320000,
                    stock: 2,
                    attributes: { keys: '88', action: 'Weighted' },
                },
            ],
        });

        // 5. Drums & Percussion
        await Product.create({
            name: 'Mapex Tornado 5-Piece Drum Kit',
            description: 'Complete drum set with cymbals and hardware. best value kit for beginners.',
            category: 'Drums & Percussion',
            imageUrl: 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=800',
            sellerId: seller3._id,
            variants: [
                {
                    sku: 'TORNADO-BLK',
                    price: 35000,
                    stock: 8,
                    attributes: { color: 'Black', pieces: '5' },
                },
            ],
        });

        await Product.create({
            name: 'Roland TD-07KV Electronic V-Drums',
            description: 'Compact electronic drum kit with mesh heads for quiet practice at home.',
            category: 'Drums & Percussion',
            imageUrl: 'https://images.unsplash.com/photo-1571327073757-71d13c24de30?w=800',
            sellerId: seller3._id,
            variants: [
                {
                    sku: 'TD07KV',
                    price: 89000,
                    stock: 4,
                    attributes: { type: 'Electronic', brand: 'Roland' },
                },
            ],
        });

        // 6. Wind Instruments
        await Product.create({
            name: 'Yamaha YAS-280 Alto Saxophone',
            description: 'The golden standard student Saxophone. Reliable intonation and ease of play.',
            category: 'Wind Instruments',
            imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
            sellerId: seller4._id,
            variants: [
                {
                    sku: 'YAS280',
                    price: 98000,
                    stock: 5,
                    attributes: { finish: 'Gold Lacquer', key: 'Eb' },
                },
            ],
        });

        await Product.create({
            name: 'Hohner Silver Star Harmonica',
            description: 'Classic blues harmonica. Key of C.',
            category: 'Wind Instruments',
            imageUrl: 'https://images.unsplash.com/photo-1465821185615-20b3c2fbf41b?w=800',
            sellerId: seller4._id,
            variants: [
                {
                    sku: 'HOHNER-C',
                    price: 1200,
                    stock: 50,
                    attributes: { key: 'C', type: 'Diatonic' },
                },
            ],
        });

        // 7. Audio Equipment
        await Product.create({
            name: 'Shure SM58 Microphone',
            description: 'Industry standard vocal microphone. Built like a tank.',
            category: 'Audio Equipment',
            imageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800',
            sellerId: seller4._id,
            variants: [
                {
                    sku: 'SM58-LC',
                    price: 9500,
                    stock: 100,
                    attributes: { type: 'Dynamic', application: 'Vocal' },
                },
            ],
        });

        await Product.create({
            name: 'Focusrite Scarlett 2i2 Gen 4',
            description: 'Most popular audio interface for home studios. High quality preamps.',
            category: 'Audio Equipment',
            imageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800',
            sellerId: seller4._id,
            variants: [
                {
                    sku: 'SCARLETT-2I2',
                    price: 18500,
                    stock: 30,
                    attributes: { brand: 'Focusrite', channels: '2' },
                },
            ],
        });

        // 8. Amplifiers
        await Product.create({
            name: 'Marshall MG15G Guitar Amp',
            description: '15 Watt practice amp with that classic Marshall tone.',
            category: 'Amplifiers',
            imageUrl: 'https://images.unsplash.com/photo-1614963366795-e9a73e5af4c5?w=800',
            sellerId: seller1._id,
            variants: [
                {
                    sku: 'MG15G',
                    price: 12500,
                    stock: 15,
                    attributes: { power: '15W', brand: 'Marshall' },
                },
            ],
        });

        await Product.create({
            name: 'Blackstar Fly 3 Mini Amp',
            description: 'Portable battery powered mini amp with surprising volume.',
            category: 'Amplifiers',
            imageUrl: 'https://images.unsplash.com/photo-1550985543-f4423c8d361e?w=800',
            sellerId: seller1._id,
            variants: [
                {
                    sku: 'FLY3',
                    price: 6500,
                    stock: 20,
                    attributes: { power: '3W', portable: 'Yes' },
                },
            ],
        });

        console.log(`✅ Created products (2+ per category)\n`);

        // Discounts
        console.log('🎟️  Creating discount codes...');

        await Discount.create({
            code: 'DIWALI2026',
            type: DiscountType.PERCENTAGE,
            value: 20,
            sellerId: seller1._id,
            minimumCartValue: 50000,
            maxUses: 100,
            currentUses: 0,
            isActive: true,
        });

        await Discount.create({
            code: 'NEWYEAR',
            type: DiscountType.FLAT,
            value: 5000,
            sellerId: seller2._id,
            minimumCartValue: 40000,
            maxUses: 50,
            currentUses: 0,
            isActive: true,
        });

        await Discount.create({
            code: 'STUDENT10',
            type: DiscountType.PERCENTAGE,
            value: 10,
            sellerId: seller3._id,
            minimumCartValue: 20000,
            maxUses: 200,
            currentUses: 0,
            isActive: true,
        });

        console.log('✅ Created 3 discount codes\n');

        console.log('🎉 SEEDING COMPLETE (India Localization + Expanded Catalog)!');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        process.exit(0);
    }
}

seed();
