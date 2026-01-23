import { cartService } from '../src/modules/cart/cart.service';
import { productService } from '../src/modules/product/product.service';
import { discountService } from '../src/modules/discount/discount.service';
import { DiscountType } from '../src/modules/discount/discount.model';
import { Product } from '../src/modules/product/product.model';
import { Cart } from '../src/modules/cart/cart.model';
import { Discount } from '../src/modules/discount/discount.model';
import { User, UserRole } from '../src/modules/auth/auth.model';
import mongoose from 'mongoose';

// Mock MongoDB connection
jest.mock('../src/config/database');

describe('Cart Service - Pricing Logic', () => {
    let buyerId: string;
    let sellerId: string;
    let productId: string;
    let variantId: string;

    beforeAll(async () => {
        await mongoose.connect('mongodb://localhost:27017/gearswap-test');
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        // Clear collections
        await User.deleteMany({});
        await Product.deleteMany({});
        await Cart.deleteMany({});
        await Discount.deleteMany({});

        // Create test users
        const buyer = await User.create({
            email: 'buyer@test.com',
            password: 'password123',
            role: UserRole.BUYER,
        });
        buyerId = buyer._id.toString();

        const seller = await User.create({
            email: 'seller@test.com',
            password: 'password123',
            role: UserRole.SELLER,
        });
        sellerId = seller._id.toString();

        // Create test product
        const product = await productService.createProduct(sellerId, {
            name: 'Test Product',
            description: 'Test description',
            category: 'Electronics',
            imageUrl: 'https://example.com/image.jpg',
            variants: [
                {
                    sku: 'TEST-001',
                    price: 100,
                    stock: 10,
                    attributes: { size: 'M', color: 'Blue' },
                },
            ],
        });
        productId = product._id.toString();
        variantId = product.variants[0]._id!.toString();
    });

    describe('Basic Cart Pricing', () => {
        it('should calculate correct subtotal for single item', async () => {
            await cartService.addToCart(buyerId, {
                productId,
                variantId,
                quantity: 2,
            });

            const cartPricing = await cartService.getCartWithPricing(buyerId);

            expect(cartPricing.items).toHaveLength(1);
            expect(cartPricing.items[0].quantity).toBe(2);
            expect(cartPricing.items[0].price).toBe(100);
            expect(cartPricing.items[0].subtotal).toBe(200);
            expect(cartPricing.subtotal).toBe(200);
            expect(cartPricing.discount).toBe(0);
            expect(cartPricing.total).toBe(200);
        });

        it('should calculate correct subtotal for multiple items', async () => {
            // Add first item
            await cartService.addToCart(buyerId, {
                productId,
                variantId,
                quantity: 2,
            });

            // Create another product
            const product2 = await productService.createProduct(sellerId, {
                name: 'Test Product 2',
                description: 'Test description 2',
                category: 'Electronics',
                imageUrl: 'https://example.com/image2.jpg',
                variants: [
                    {
                        sku: 'TEST-002',
                        price: 50,
                        stock: 5,
                        attributes: { size: 'L' },
                    },
                ],
            });

            // Add second item
            await cartService.addToCart(buyerId, {
                productId: product2._id.toString(),
                variantId: product2.variants[0]._id!.toString(),
                quantity: 3,
            });

            const cartPricing = await cartService.getCartWithPricing(buyerId);

            expect(cartPricing.items).toHaveLength(2);
            expect(cartPricing.subtotal).toBe(350); // (2 * 100) + (3 * 50)
            expect(cartPricing.total).toBe(350);
        });

        it('should update pricing when quantity changes', async () => {
            await cartService.addToCart(buyerId, {
                productId,
                variantId,
                quantity: 2,
            });

            await cartService.updateCartItem(buyerId, {
                productId,
                variantId,
                quantity: 5,
            });

            const cartPricing = await cartService.getCartWithPricing(buyerId);

            expect(cartPricing.items[0].quantity).toBe(5);
            expect(cartPricing.items[0].subtotal).toBe(500);
            expect(cartPricing.total).toBe(500);
        });
    });

    describe('Cart Pricing with Discounts', () => {
        it('should apply percentage discount correctly', async () => {
            // Add items to cart
            await cartService.addToCart(buyerId, {
                productId,
                variantId,
                quantity: 2,
            });

            // Create percentage discount (20% off)
            const discount = await discountService.createDiscount(sellerId, {
                code: 'SAVE20',
                type: DiscountType.PERCENTAGE,
                value: 20,
            });

            // Apply discount
            await cartService.applyDiscount(buyerId, 'SAVE20');

            const cartPricing = await cartService.getCartWithPricing(buyerId);

            expect(cartPricing.subtotal).toBe(200);
            expect(cartPricing.discount).toBe(40); // 20% of 200
            expect(cartPricing.total).toBe(160);
        });

        it('should apply flat discount correctly', async () => {
            // Add items to cart
            await cartService.addToCart(buyerId, {
                productId,
                variantId,
                quantity: 2,
            });

            // Create flat discount ($30 off)
            await discountService.createDiscount(sellerId, {
                code: 'FLAT30',
                type: DiscountType.FLAT,
                value: 30,
            });

            // Apply discount
            await cartService.applyDiscount(buyerId, 'FLAT30');

            const cartPricing = await cartService.getCartWithPricing(buyerId);

            expect(cartPricing.subtotal).toBe(200);
            expect(cartPricing.discount).toBe(30);
            expect(cartPricing.total).toBe(170);
        });

        it('should not allow flat discount to exceed cart value', async () => {
            // Add items to cart
            await cartService.addToCart(buyerId, {
                productId,
                variantId,
                quantity: 1,
            });

            // Create flat discount larger than cart value
            await discountService.createDiscount(sellerId, {
                code: 'BIG500',
                type: DiscountType.FLAT,
                value: 500,
            });

            // Apply discount
            await cartService.applyDiscount(buyerId, 'BIG500');

            const cartPricing = await cartService.getCartWithPricing(buyerId);

            expect(cartPricing.subtotal).toBe(100);
            expect(cartPricing.discount).toBe(100); // Capped at cart value
            expect(cartPricing.total).toBe(0);
        });

        it('should recalculate pricing when discount is removed', async () => {
            // Add items and apply discount
            await cartService.addToCart(buyerId, {
                productId,
                variantId,
                quantity: 2,
            });

            await discountService.createDiscount(sellerId, {
                code: 'SAVE20',
                type: DiscountType.PERCENTAGE,
                value: 20,
            });

            await cartService.applyDiscount(buyerId, 'SAVE20');

            // Remove discount
            await cartService.removeDiscount(buyerId);

            const cartPricing = await cartService.getCartWithPricing(buyerId);

            expect(cartPricing.subtotal).toBe(200);
            expect(cartPricing.discount).toBe(0);
            expect(cartPricing.total).toBe(200);
        });
    });

    describe('Stock Validation', () => {
        it('should reject adding items beyond available stock', async () => {
            await expect(
                cartService.addToCart(buyerId, {
                    productId,
                    variantId,
                    quantity: 15, // Stock is only 10
                })
            ).rejects.toThrow('Insufficient stock');
        });

        it('should reject updating quantity beyond available stock', async () => {
            await cartService.addToCart(buyerId, {
                productId,
                variantId,
                quantity: 5,
            });

            await expect(
                cartService.updateCartItem(buyerId, {
                    productId,
                    variantId,
                    quantity: 15,
                })
            ).rejects.toThrow('Insufficient stock');
        });
    });
});
