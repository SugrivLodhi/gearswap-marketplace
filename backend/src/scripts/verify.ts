import mongoose from 'mongoose';
import { User } from '../modules/auth/auth.model';
import { Product } from '../modules/product/product.model';
import { Discount } from '../modules/discount/discount.model';
import { connectDatabase } from '../config/database';

/**
 * Verification script to check seeded data
 */

async function verify() {
    try {
        console.log('🔍 Verifying GearSwap Musical Instrument Database...\n');

        await connectDatabase();

        // Count users
        const buyerCount = await User.countDocuments({ role: 'BUYER' });
        const sellerCount = await User.countDocuments({ role: 'SELLER' });

        console.log('👥 Users:');
        console.log(`   ✅ ${buyerCount} Buyers`);
        console.log(`   ✅ ${sellerCount} Sellers\n`);

        // Count products by category
        const categories = await Product.distinct('category');
        console.log('🎸 Products by Category:');

        for (const category of categories) {
            const count = await Product.countDocuments({ category, isDeleted: false });
            console.log(`   • ${category}: ${count} products`);
        }

        const totalProducts = await Product.countDocuments({ isDeleted: false });
        console.log(`   📊 Total: ${totalProducts} products\n`);

        // Sample products
        const sampleProducts = await Product.find({ isDeleted: false }).limit(5);
        console.log('🎵 Sample Products:');
        sampleProducts.forEach(product => {
            const variantCount = product.variants.length;
            const minPrice = Math.min(...product.variants.map(v => v.price));
            const maxPrice = Math.max(...product.variants.map(v => v.price));
            const priceRange = minPrice === maxPrice ? `$${minPrice}` : `$${minPrice} - $${maxPrice}`;
            console.log(`   • ${product.name} (${variantCount} variants, ${priceRange})`);
        });
        console.log();

        // Discounts
        const discounts = await Discount.find({ isActive: true });
        console.log('🎟️  Active Discount Codes:');
        discounts.forEach(discount => {
            const type = discount.type === 'PERCENTAGE' ? `${discount.value}%` : `$${discount.value}`;
            const minCart = discount.minimumCartValue ? ` (min $${discount.minimumCartValue})` : '';
            console.log(`   • ${discount.code}: ${type} off${minCart}`);
        });
        console.log();

        // Stock summary
        const allProducts = await Product.find({ isDeleted: false });
        let totalStock = 0;
        let totalVariants = 0;

        allProducts.forEach(product => {
            product.variants.forEach(variant => {
                totalStock += variant.stock;
                totalVariants++;
            });
        });

        console.log('📦 Inventory Summary:');
        console.log(`   • Total Variants: ${totalVariants}`);
        console.log(`   • Total Stock Units: ${totalStock}\n`);

        console.log('✅ Database verification complete!');
        console.log('🚀 Ready to test the marketplace!\n');

    } catch (error) {
        console.error('❌ Verification failed:', error);
    } finally {
        await mongoose.connection.close();
    }
}

verify();
