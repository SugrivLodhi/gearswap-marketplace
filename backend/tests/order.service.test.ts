import { orderService } from '../src/modules/order/order.service';
import { cartService } from '../src/modules/cart/cart.service';
import { productService } from '../src/modules/product/product.service';
import { discountService } from '../src/modules/discount/discount.service';
import { User, UserRole } from '../src/modules/auth/auth.model';
import { Product } from '../src/modules/product/product.model';
import { Cart } from '../src/modules/cart/cart.model';
import { Order, OrderStatus } from '../src/modules/order/order.model';
import { Discount, DiscountType } from '../src/modules/discount/discount.model';
import mongoose from 'mongoose';

describe('Order Service - Order Creation', () => {
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
        await User.deleteMany({});
        await Product.deleteMany({});
        await Cart.deleteMany({});
        await Order.deleteMany({});
        await Discount.deleteMany({});

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
                    attributes: { size: 'M' },
                },
            ],
        });
        productId = product._id.toString();
        variantId = product.variants[0]._id!.toString();
    });

    describe('Order Creation from Cart', () => {
        it('should create order with correct snapshot', async () => {
            await cartService.addToCart(buyerId, {
                productId,
                variantId,
                quantity: 2,
            });

            const order = await orderService.checkout(buyerId);

            expect(order.buyerId.toString()).toBe(buyerId);
            expect(order.items).toHaveLength(1);
            expect(order.items[0].productName).toBe('Test Product');
            expect(order.items[0].variantSku).toBe('TEST-001');
            expect(order.items[0].price).toBe(100);
            expect(order.items[0].quantity).toBe(2);
            expect(order.items[0].subtotal).toBe(200);
            expect(order.subtotal).toBe(200);
            expect(order.total).toBe(200);
            expect(order.status).toBe(OrderStatus.PENDING);
        });

        it('should create order with discount applied', async () => {
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

            const order = await orderService.checkout(buyerId);

            expect(order.subtotal).toBe(200);
            expect(order.discount).toBe(40);
            expect(order.total).toBe(160);
            expect(order.discountCode).toBe('SAVE20');
        });

        it('should reject checkout with empty cart', async () => {
            await expect(orderService.checkout(buyerId)).rejects.toThrow(
                'Cart is empty'
            );
        });

        it('should reject checkout when stock insufficient', async () => {
            await cartService.addToCart(buyerId, {
                productId,
                variantId,
                quantity: 5,
            });

            // Reduce stock to 3
            await productService.updateVariantStock(productId, variantId, -7);

            await expect(orderService.checkout(buyerId)).rejects.toThrow(
                'Insufficient stock'
            );
        });
    });

    describe('Stock Deduction', () => {
        it('should deduct stock after order creation', async () => {
            await cartService.addToCart(buyerId, {
                productId,
                variantId,
                quantity: 3,
            });

            const productBefore = await productService.getProductById(productId);
            expect(productBefore?.variants[0].stock).toBe(10);

            await orderService.checkout(buyerId);

            const productAfter = await productService.getProductById(productId);
            expect(productAfter?.variants[0].stock).toBe(7);
        });

        it('should deduct stock for multiple items', async () => {
            // Create second product
            const product2 = await productService.createProduct(sellerId, {
                name: 'Product 2',
                description: 'Description 2',
                category: 'Electronics',
                imageUrl: 'https://example.com/image2.jpg',
                variants: [
                    {
                        sku: 'TEST-002',
                        price: 50,
                        stock: 20,
                        attributes: {},
                    },
                ],
            });

            await cartService.addToCart(buyerId, {
                productId,
                variantId,
                quantity: 2,
            });

            await cartService.addToCart(buyerId, {
                productId: product2._id.toString(),
                variantId: product2.variants[0]._id!.toString(),
                quantity: 5,
            });

            await orderService.checkout(buyerId);

            const product1After = await productService.getProductById(productId);
            const product2After = await productService.getProductById(
                product2._id.toString()
            );

            expect(product1After?.variants[0].stock).toBe(8); // 10 - 2
            expect(product2After?.variants[0].stock).toBe(15); // 20 - 5
        });
    });

    describe('Cart Clearing', () => {
        it('should clear cart after successful checkout', async () => {
            await cartService.addToCart(buyerId, {
                productId,
                variantId,
                quantity: 2,
            });

            await orderService.checkout(buyerId);

            const cartAfter = await cartService.getCartWithPricing(buyerId);
            expect(cartAfter.items).toHaveLength(0);
            expect(cartAfter.total).toBe(0);
        });
    });

    describe('Discount Usage Tracking', () => {
        it('should increment discount usage after checkout', async () => {
            await cartService.addToCart(buyerId, {
                productId,
                variantId,
                quantity: 2,
            });

            const discount = await discountService.createDiscount(sellerId, {
                code: 'TRACK',
                type: DiscountType.FLAT,
                value: 10,
            });

            await cartService.applyDiscount(buyerId, 'TRACK');

            expect(discount.currentUses).toBe(0);

            await orderService.checkout(buyerId);

            const updatedDiscount = await discountService.getDiscountById(
                discount._id.toString()
            );
            expect(updatedDiscount?.currentUses).toBe(1);
        });
    });

    describe('Order Status Lifecycle', () => {
        it('should allow valid status transitions', async () => {
            await cartService.addToCart(buyerId, {
                productId,
                variantId,
                quantity: 1,
            });

            const order = await orderService.checkout(buyerId);
            expect(order.status).toBe(OrderStatus.PENDING);

            // PENDING -> PAID
            const updated1 = await orderService.updateOrderStatus(
                order._id.toString(),
                sellerId,
                OrderStatus.PAID
            );
            expect(updated1.status).toBe(OrderStatus.PAID);

            // PAID -> SHIPPED
            const updated2 = await orderService.updateOrderStatus(
                order._id.toString(),
                sellerId,
                OrderStatus.SHIPPED
            );
            expect(updated2.status).toBe(OrderStatus.SHIPPED);

            // SHIPPED -> COMPLETED
            const updated3 = await orderService.updateOrderStatus(
                order._id.toString(),
                sellerId,
                OrderStatus.COMPLETED
            );
            expect(updated3.status).toBe(OrderStatus.COMPLETED);
        });

        it('should reject invalid status transitions', async () => {
            await cartService.addToCart(buyerId, {
                productId,
                variantId,
                quantity: 1,
            });

            const order = await orderService.checkout(buyerId);

            // PENDING -> SHIPPED (skipping PAID)
            await expect(
                orderService.updateOrderStatus(
                    order._id.toString(),
                    sellerId,
                    OrderStatus.SHIPPED
                )
            ).rejects.toThrow('Invalid status transition');
        });

        it('should reject status update from non-seller', async () => {
            await cartService.addToCart(buyerId, {
                productId,
                variantId,
                quantity: 1,
            });

            const order = await orderService.checkout(buyerId);

            // Create another seller
            const otherSeller = await User.create({
                email: 'other@test.com',
                password: 'password123',
                role: UserRole.SELLER,
            });

            await expect(
                orderService.updateOrderStatus(
                    order._id.toString(),
                    otherSeller._id.toString(),
                    OrderStatus.PAID
                )
            ).rejects.toThrow('Access denied');
        });
    });
});
