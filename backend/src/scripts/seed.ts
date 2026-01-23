import mongoose from 'mongoose';
import { User, UserRole } from '../modules/auth/auth.model';
import { Product } from '../modules/product/product.model';
import { Discount, DiscountType } from '../modules/discount/discount.model';
import { connectDatabase } from '../config/database';
import bcrypt from 'bcryptjs';

/**
 * GearSwap - Musical Instrument Marketplace Seeder
 * 
 * This script populates the database with realistic musical instrument data:
 * - Users (buyers and sellers)
 * - Musical instruments (guitars, keyboards, drums, etc.)
 * - Discount codes
 */

async function seed() {
    try {
        console.log('🎵 Starting GearSwap Musical Instrument Marketplace Seeder...\n');

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
            email: 'john.musician@example.com',
            password: hashedPassword,
            role: UserRole.BUYER,
        });

        const buyer2 = await User.create({
            email: 'sarah.guitarist@example.com',
            password: hashedPassword,
            role: UserRole.BUYER,
        });

        const buyer3 = await User.create({
            email: 'mike.drummer@example.com',
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
            email: 'brass.and.strings@gearswap.com',
            password: hashedPassword,
            role: UserRole.SELLER,
        });

        console.log(`✅ Created ${3} buyers and ${4} sellers\n`);

        // Create Products - GUITARS
        console.log('🎸 Creating guitar products...');

        await Product.create({
            name: 'Fender Stratocaster American Professional II',
            description: 'The iconic Stratocaster with modern refinements. Features V-Mod II pickups, Deep C neck profile, and premium hardware. Perfect for rock, blues, and everything in between.',
            category: 'Electric Guitars',
            imageUrl: 'https://images.unsplash.com/photo-1564186763535-ebb21ef5277f?w=800',
            sellerId: seller1._id,
            variants: [
                {
                    sku: 'STRAT-SSB-001',
                    price: 1799.99,
                    stock: 5,
                    attributes: { color: 'Sunburst', finish: 'Gloss' },
                },
                {
                    sku: 'STRAT-BLK-001',
                    price: 1799.99,
                    stock: 8,
                    attributes: { color: 'Black', finish: 'Gloss' },
                },
                {
                    sku: 'STRAT-OWT-001',
                    price: 1849.99,
                    stock: 3,
                    attributes: { color: 'Olympic White', finish: 'Gloss' },
                },
            ],
        });

        await Product.create({
            name: 'Gibson Les Paul Standard 50s',
            description: 'Classic Les Paul with vintage 50s specs. Burstbucker pickups, rounded 50s neck profile, and stunning AAA flame maple top. The ultimate rock machine.',
            category: 'Electric Guitars',
            imageUrl: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800',
            sellerId: seller1._id,
            variants: [
                {
                    sku: 'LP-GB-001',
                    price: 2499.99,
                    stock: 4,
                    attributes: { color: 'Gold Top', finish: 'Gloss' },
                },
                {
                    sku: 'LP-HB-001',
                    price: 2599.99,
                    stock: 6,
                    attributes: { color: 'Heritage Cherry Sunburst', finish: 'Gloss' },
                },
                {
                    sku: 'LP-TB-001',
                    price: 2599.99,
                    stock: 2,
                    attributes: { color: 'Tobacco Burst', finish: 'Gloss' },
                },
            ],
        });

        await Product.create({
            name: 'Taylor 214ce Acoustic-Electric Guitar',
            description: 'Grand Auditorium body with solid Sitka spruce top and layered rosewood back and sides. Built-in ES2 electronics for stage-ready performance.',
            category: 'Acoustic Guitars',
            imageUrl: 'https://images.unsplash.com/photo-1525201548942-d8732f6617a0?w=800',
            sellerId: seller1._id,
            variants: [
                {
                    sku: 'TAYLOR-214-NAT',
                    price: 1099.99,
                    stock: 10,
                    attributes: { finish: 'Natural', electronics: 'ES2' },
                },
                {
                    sku: 'TAYLOR-214-SB',
                    price: 1099.99,
                    stock: 7,
                    attributes: { finish: 'Sunburst', electronics: 'ES2' },
                },
            ],
        });

        await Product.create({
            name: 'Ibanez RG550 Genesis',
            description: 'Legendary shred machine with Edge tremolo, DiMarzio pickups, and wizard neck. Built for speed and precision.',
            category: 'Electric Guitars',
            imageUrl: 'https://images.unsplash.com/photo-1516924962500-2b4b3b99ea02?w=800',
            sellerId: seller1._id,
            variants: [
                {
                    sku: 'RG550-DY',
                    price: 1299.99,
                    stock: 6,
                    attributes: { color: 'Desert Yellow', tremolo: 'Edge' },
                },
                {
                    sku: 'RG550-RF',
                    price: 1299.99,
                    stock: 5,
                    attributes: { color: 'Road Flare Red', tremolo: 'Edge' },
                },
            ],
        });

        // Create Products - KEYBOARDS & SYNTHS
        console.log('🎹 Creating keyboard and synthesizer products...');

        await Product.create({
            name: 'Roland Fantom-8 Workstation',
            description: '88-key flagship workstation with ZEN-Core sound engine, deep synthesis, and premium PHA-50 weighted keyboard. The ultimate creative powerhouse.',
            category: 'Keyboards & Synthesizers',
            imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
            sellerId: seller2._id,
            variants: [
                {
                    sku: 'FANTOM-8-BLK',
                    price: 3999.99,
                    stock: 3,
                    attributes: { keys: '88', action: 'Weighted', color: 'Black' },
                },
            ],
        });

        await Product.create({
            name: 'Korg Minilogue XD Polyphonic Synthesizer',
            description: 'Powerful 4-voice analog synthesizer with digital multi-engine. Features sequencer, effects, and oscilloscope display.',
            category: 'Keyboards & Synthesizers',
            imageUrl: 'https://images.unsplash.com/photo-1563330232-57114bb0823c?w=800',
            sellerId: seller2._id,
            variants: [
                {
                    sku: 'MINILOGUE-XD',
                    price: 649.99,
                    stock: 12,
                    attributes: { voices: '4', type: 'Analog', color: 'Black' },
                },
            ],
        });

        await Product.create({
            name: 'Yamaha P-125 Digital Piano',
            description: 'Portable digital piano with 88-key Graded Hammer Standard action. Pure CF sound engine delivers authentic grand piano tone.',
            category: 'Keyboards & Synthesizers',
            imageUrl: 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800',
            sellerId: seller2._id,
            variants: [
                {
                    sku: 'P125-BLK',
                    price: 649.99,
                    stock: 15,
                    attributes: { keys: '88', color: 'Black', speakers: 'Built-in' },
                },
                {
                    sku: 'P125-WHT',
                    price: 649.99,
                    stock: 10,
                    attributes: { keys: '88', color: 'White', speakers: 'Built-in' },
                },
            ],
        });

        await Product.create({
            name: 'Moog Subsequent 37 Analog Synthesizer',
            description: 'Legendary Moog sound in a powerful paraphonic analog synthesizer. 37 keys, dual oscillators, and classic Moog ladder filter.',
            category: 'Keyboards & Synthesizers',
            imageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800',
            sellerId: seller2._id,
            variants: [
                {
                    sku: 'SUB37-BLK',
                    price: 1599.99,
                    stock: 4,
                    attributes: { keys: '37', type: 'Analog', voices: 'Paraphonic' },
                },
            ],
        });

        // Create Products - DRUMS & PERCUSSION
        console.log('🥁 Creating drum and percussion products...');

        await Product.create({
            name: 'Pearl Export EXX 5-Piece Drum Kit',
            description: 'Complete 5-piece drum set with hardware and cymbals. Perfect for beginners and intermediate players. Includes bass drum, snare, toms, hi-hat, and crash cymbal.',
            category: 'Drums & Percussion',
            imageUrl: 'https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=800',
            sellerId: seller3._id,
            variants: [
                {
                    sku: 'EXPORT-JB',
                    price: 899.99,
                    stock: 8,
                    attributes: { color: 'Jet Black', pieces: '5', hardware: 'Included' },
                },
                {
                    sku: 'EXPORT-SB',
                    price: 899.99,
                    stock: 6,
                    attributes: { color: 'Smokey Chrome', pieces: '5', hardware: 'Included' },
                },
            ],
        });

        await Product.create({
            name: 'Roland TD-17KVX V-Drums Electronic Kit',
            description: 'Premium electronic drum kit with mesh heads, advanced sound engine, and extensive coaching functions. Perfect for practice and performance.',
            category: 'Drums & Percussion',
            imageUrl: 'https://images.unsplash.com/photo-1571327073757-71d13c24de30?w=800',
            sellerId: seller3._id,
            variants: [
                {
                    sku: 'TD17KVX-001',
                    price: 1799.99,
                    stock: 5,
                    attributes: { type: 'Electronic', pads: 'Mesh', module: 'TD-17' },
                },
            ],
        });

        await Product.create({
            name: 'Zildjian A Custom Cymbal Set',
            description: 'Professional cymbal pack including 14" hi-hats, 16" crash, 18" crash, and 20" ride. Brilliant finish with cutting projection.',
            category: 'Drums & Percussion',
            imageUrl: 'https://images.unsplash.com/photo-1614963366795-e9a73e5af4c5?w=800',
            sellerId: seller3._id,
            variants: [
                {
                    sku: 'ACUSTOM-SET',
                    price: 899.99,
                    stock: 10,
                    attributes: { pieces: '4', finish: 'Brilliant', series: 'A Custom' },
                },
            ],
        });

        await Product.create({
            name: 'DW Performance Series Snare Drum',
            description: '14x6.5" maple snare with MAG throw-off and True-Pitch tuning. Versatile sound for any genre.',
            category: 'Drums & Percussion',
            imageUrl: 'https://images.unsplash.com/photo-1609347346838-8c2e8f7e5e3f?w=800',
            sellerId: seller3._id,
            variants: [
                {
                    sku: 'DW-SNARE-NAT',
                    price: 549.99,
                    stock: 12,
                    attributes: { size: '14x6.5', material: 'Maple', finish: 'Natural' },
                },
                {
                    sku: 'DW-SNARE-BLK',
                    price: 549.99,
                    stock: 8,
                    attributes: { size: '14x6.5', material: 'Maple', finish: 'Black' },
                },
            ],
        });

        // Create Products - BASS GUITARS
        console.log('🎸 Creating bass guitar products...');

        await Product.create({
            name: 'Fender Precision Bass American Professional II',
            description: 'The legendary P-Bass with V-Mod II split-coil pickup and modern playability. The foundation of countless recordings.',
            category: 'Bass Guitars',
            imageUrl: 'https://images.unsplash.com/photo-1556449895-a33c9dba33dd?w=800',
            sellerId: seller1._id,
            variants: [
                {
                    sku: 'PBASS-3TS',
                    price: 1699.99,
                    stock: 6,
                    attributes: { color: '3-Color Sunburst', strings: '4' },
                },
                {
                    sku: 'PBASS-BLK',
                    price: 1699.99,
                    stock: 5,
                    attributes: { color: 'Black', strings: '4' },
                },
            ],
        });

        await Product.create({
            name: 'Music Man StingRay Special 5-String Bass',
            description: '5-string bass with neodymium humbucker, active 3-band EQ, and roasted maple neck. Modern tone with vintage vibe.',
            category: 'Bass Guitars',
            imageUrl: 'https://images.unsplash.com/photo-1510915228340-29c85a43dcfe?w=800',
            sellerId: seller1._id,
            variants: [
                {
                    sku: 'STINGRAY-CB',
                    price: 2199.99,
                    stock: 4,
                    attributes: { color: 'Charcoal Blue', strings: '5' },
                },
                {
                    sku: 'STINGRAY-VR',
                    price: 2199.99,
                    stock: 3,
                    attributes: { color: 'Vintage Red', strings: '5' },
                },
            ],
        });

        // Create Products - ORCHESTRAL INSTRUMENTS
        console.log('🎺 Creating orchestral instrument products...');

        await Product.create({
            name: 'Yamaha YAS-280 Alto Saxophone',
            description: 'Student alto saxophone with improved key layout and response. Perfect for beginners with professional features.',
            category: 'Wind Instruments',
            imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
            sellerId: seller4._id,
            variants: [
                {
                    sku: 'YAS280-001',
                    price: 1299.99,
                    stock: 7,
                    attributes: { type: 'Alto', finish: 'Gold Lacquer', case: 'Included' },
                },
            ],
        });

        await Product.create({
            name: 'Bach Stradivarius 180S37 Trumpet',
            description: 'Professional Bb trumpet with .459" bore and #37 bell. The industry standard for classical and jazz.',
            category: 'Brass Instruments',
            imageUrl: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=800',
            sellerId: seller4._id,
            variants: [
                {
                    sku: 'BACH-180-SLV',
                    price: 2899.99,
                    stock: 3,
                    attributes: { finish: 'Silver Plated', bore: '.459"', bell: '#37' },
                },
                {
                    sku: 'BACH-180-LAC',
                    price: 2799.99,
                    stock: 4,
                    attributes: { finish: 'Lacquer', bore: '.459"', bell: '#37' },
                },
            ],
        });

        await Product.create({
            name: 'Yamaha YVS-100 Venova Wind Instrument',
            description: 'Innovative casual wind instrument with saxophone-like sound. Perfect for beginners and portable practice.',
            category: 'Wind Instruments',
            imageUrl: 'https://images.unsplash.com/photo-1465821185615-20b3c2fbf41b?w=800',
            sellerId: seller4._id,
            variants: [
                {
                    sku: 'VENOVA-WHT',
                    price: 89.99,
                    stock: 25,
                    attributes: { color: 'White', material: 'ABS Resin', case: 'Included' },
                },
                {
                    sku: 'VENOVA-BLK',
                    price: 89.99,
                    stock: 20,
                    attributes: { color: 'Black', material: 'ABS Resin', case: 'Included' },
                },
            ],
        });

        await Product.create({
            name: 'Eastman VL80 Violin Outfit',
            description: 'Hand-carved student violin with ebony fittings. Includes bow, case, and rosin. Excellent tone for beginners.',
            category: 'String Instruments',
            imageUrl: 'https://images.unsplash.com/photo-1612225330812-01a9c6b355ec?w=800',
            sellerId: seller4._id,
            variants: [
                {
                    sku: 'VL80-44',
                    price: 599.99,
                    stock: 10,
                    attributes: { size: '4/4', finish: 'Antique Varnish', outfit: 'Complete' },
                },
                {
                    sku: 'VL80-34',
                    price: 549.99,
                    stock: 8,
                    attributes: { size: '3/4', finish: 'Antique Varnish', outfit: 'Complete' },
                },
            ],
        });

        // Create Products - AUDIO EQUIPMENT
        console.log('🎚️ Creating audio equipment products...');

        await Product.create({
            name: 'Shure SM58 Dynamic Vocal Microphone',
            description: 'The legendary live vocal microphone. Rugged construction, tailored frequency response, and built-in pop filter.',
            category: 'Audio Equipment',
            imageUrl: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800',
            sellerId: seller2._id,
            variants: [
                {
                    sku: 'SM58-LC',
                    price: 99.99,
                    stock: 50,
                    attributes: { type: 'Dynamic', pattern: 'Cardioid', cable: 'Not Included' },
                },
            ],
        });

        await Product.create({
            name: 'Focusrite Scarlett 2i2 Audio Interface',
            description: '2-in/2-out USB audio interface with studio-quality preamps. Perfect for home recording and podcasting.',
            category: 'Audio Equipment',
            imageUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800',
            sellerId: seller2._id,
            variants: [
                {
                    sku: 'SCARLETT-2I2-3G',
                    price: 179.99,
                    stock: 30,
                    attributes: { inputs: '2', outputs: '2', generation: '3rd', connection: 'USB-C' },
                },
            ],
        });

        await Product.create({
            name: 'Boss Katana-50 MkII Guitar Amplifier',
            description: '50-watt combo amp with five amp characters, effects, and power control. Perfect for practice and small gigs.',
            category: 'Amplifiers',
            imageUrl: 'https://images.unsplash.com/photo-1614963366795-e9a73e5af4c5?w=800',
            sellerId: seller1._id,
            variants: [
                {
                    sku: 'KATANA50-MK2',
                    price: 259.99,
                    stock: 20,
                    attributes: { watts: '50', speaker: '12"', channels: '5' },
                },
            ],
        });

        console.log(`✅ Created 20 musical instrument products\n`);

        // Create Discount Codes
        console.log('🎟️  Creating discount codes...');

        await Discount.create({
            code: 'MUSIC20',
            type: DiscountType.PERCENTAGE,
            value: 20,
            sellerId: seller1._id,
            minimumCartValue: 500,
            maxUses: 100,
            currentUses: 0,
            isActive: true,
        });

        await Discount.create({
            code: 'NEWPLAYER',
            type: DiscountType.FLAT,
            value: 50,
            sellerId: seller2._id,
            minimumCartValue: 200,
            maxUses: 50,
            currentUses: 0,
            isActive: true,
        });

        await Discount.create({
            code: 'DRUMMER15',
            type: DiscountType.PERCENTAGE,
            value: 15,
            sellerId: seller3._id,
            minimumCartValue: 300,
            expiryDate: new Date('2026-12-31'),
            maxUses: 75,
            currentUses: 0,
            isActive: true,
        });

        await Discount.create({
            code: 'ORCHESTRA100',
            type: DiscountType.FLAT,
            value: 100,
            sellerId: seller4._id,
            minimumCartValue: 1000,
            maxUses: 25,
            currentUses: 0,
            isActive: true,
        });

        await Discount.create({
            code: 'FREESHIP',
            type: DiscountType.FLAT,
            value: 25,
            sellerId: seller1._id,
            minimumCartValue: 100,
            currentUses: 0,
            isActive: true,
        });

        console.log('✅ Created 5 discount codes\n');

        // Summary
        console.log('═══════════════════════════════════════════════════════');
        console.log('🎉 SEEDING COMPLETE!\n');
        console.log('📊 Summary:');
        console.log('   • 3 Buyers created');
        console.log('   • 4 Sellers created');
        console.log('   • 20 Musical instrument products created');
        console.log('   • 5 Discount codes created\n');

        console.log('🔑 Login Credentials (all passwords: password123):');
        console.log('\n   BUYERS:');
        console.log('   • john.musician@example.com');
        console.log('   • sarah.guitarist@example.com');
        console.log('   • mike.drummer@example.com');

        console.log('\n   SELLERS:');
        console.log('   • guitar.heaven@gearswap.com');
        console.log('   • keys.and.synths@gearswap.com');
        console.log('   • drum.world@gearswap.com');
        console.log('   • brass.and.strings@gearswap.com');

        console.log('\n🎟️  Discount Codes:');
        console.log('   • MUSIC20 - 20% off orders over $500');
        console.log('   • NEWPLAYER - $50 off orders over $200');
        console.log('   • DRUMMER15 - 15% off orders over $300');
        console.log('   • ORCHESTRA100 - $100 off orders over $1000');
        console.log('   • FREESHIP - $25 off orders over $100');

        console.log('\n🎸 Product Categories:');
        console.log('   • Electric Guitars (4 products)');
        console.log('   • Acoustic Guitars (1 product)');
        console.log('   • Bass Guitars (2 products)');
        console.log('   • Keyboards & Synthesizers (4 products)');
        console.log('   • Drums & Percussion (4 products)');
        console.log('   • Wind Instruments (2 products)');
        console.log('   • Brass Instruments (1 product)');
        console.log('   • String Instruments (1 product)');
        console.log('   • Audio Equipment (2 products)');
        console.log('   • Amplifiers (1 product)');

        console.log('\n🚀 Next Steps:');
        console.log('   1. Start the backend: npm run dev');
        console.log('   2. Visit http://localhost:4000/graphql');
        console.log('   3. Login with any buyer/seller credentials');
        console.log('   4. Browse musical instruments and test the marketplace!');
        console.log('═══════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
        process.exit(0);
    }
}

// Run seeder
seed();
