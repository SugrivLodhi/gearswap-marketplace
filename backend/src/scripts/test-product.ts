import mongoose from 'mongoose';
import { Product } from '../modules/product/product.model';
import { connectDatabase } from '../config/database';
import { productService } from '../modules/product/product.service';

async function testProductCreation() {
    try {
        console.log('🧪 Testing Product Creation...');
        await connectDatabase();

        const sellerId = new mongoose.Types.ObjectId(); // Dummy seller ID

        const input = {
            name: 'Test Guitar',
            description: 'A test guitar',
            category: 'Electric Guitars',
            imageUrl: 'http://example.com/image.jpg',
            hsnCode: '92099900',
            gstRate: 12,
            sgstRate: 6,
            cgstRate: 6,
            igstRate: 0,
            variants: [
                {
                    sku: `TEST-${Date.now()}`,
                    price: 100,
                    stock: 10,
                    attributes: [
                        { key: 'color', value: 'Sunburst' }
                    ]
                }
            ]
        };

        console.log('Input:', JSON.stringify(input, null, 2));

        const product = await productService.createProduct(sellerId.toString(), input);
        console.log('✅ Product created successfully:', product.id);
        console.log('Attributes:', product.variants[0].attributes);

    } catch (error) {
        console.error('❌ Creation failed:', error);
    } finally {
        await mongoose.connection.close();
    }
}

testProductCreation();
