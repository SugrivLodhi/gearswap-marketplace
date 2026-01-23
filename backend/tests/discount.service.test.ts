import { discountService } from '../src/modules/discount/discount.service';
import { DiscountType, Discount } from '../src/modules/discount/discount.model';
import { User, UserRole } from '../src/modules/auth/auth.model';
import mongoose from 'mongoose';

describe('Discount Service - Validation Logic', () => {
    let sellerId: string;

    beforeAll(async () => {
        await mongoose.connect('mongodb://localhost:27017/gearswap-test');
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    beforeEach(async () => {
        await User.deleteMany({});
        await Discount.deleteMany({});

        const seller = await User.create({
            email: 'seller@test.com',
            password: 'password123',
            role: UserRole.SELLER,
        });
        sellerId = seller._id.toString();
    });

    describe('Discount Creation Validation', () => {
        it('should create valid percentage discount', async () => {
            const discount = await discountService.createDiscount(sellerId, {
                code: 'SAVE20',
                type: DiscountType.PERCENTAGE,
                value: 20,
            });

            expect(discount.code).toBe('SAVE20');
            expect(discount.type).toBe(DiscountType.PERCENTAGE);
            expect(discount.value).toBe(20);
            expect(discount.isActive).toBe(true);
        });

        it('should reject percentage discount over 100', async () => {
            await expect(
                discountService.createDiscount(sellerId, {
                    code: 'INVALID',
                    type: DiscountType.PERCENTAGE,
                    value: 150,
                })
            ).rejects.toThrow('Percentage discount must be between 0 and 100');
        });

        it('should reject negative discount values', async () => {
            await expect(
                discountService.createDiscount(sellerId, {
                    code: 'NEGATIVE',
                    type: DiscountType.FLAT,
                    value: -10,
                })
            ).rejects.toThrow('Flat discount must be positive');
        });

        it('should reject duplicate discount codes', async () => {
            await discountService.createDiscount(sellerId, {
                code: 'DUPLICATE',
                type: DiscountType.FLAT,
                value: 10,
            });

            await expect(
                discountService.createDiscount(sellerId, {
                    code: 'DUPLICATE',
                    type: DiscountType.FLAT,
                    value: 20,
                })
            ).rejects.toThrow('Discount code already exists');
        });
    });

    describe('Discount Validation Rules', () => {
        it('should validate active discount', async () => {
            await discountService.createDiscount(sellerId, {
                code: 'ACTIVE',
                type: DiscountType.FLAT,
                value: 10,
            });

            const discount = await discountService.validateDiscount('ACTIVE', 100);
            expect(discount.code).toBe('ACTIVE');
        });

        it('should reject inactive discount', async () => {
            const discount = await discountService.createDiscount(sellerId, {
                code: 'INACTIVE',
                type: DiscountType.FLAT,
                value: 10,
            });

            await discountService.updateDiscount(
                discount._id.toString(),
                sellerId,
                { isActive: false }
            );

            await expect(
                discountService.validateDiscount('INACTIVE', 100)
            ).rejects.toThrow('Discount is no longer active');
        });

        it('should reject expired discount', async () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            await discountService.createDiscount(sellerId, {
                code: 'EXPIRED',
                type: DiscountType.FLAT,
                value: 10,
                expiryDate: yesterday,
            });

            await expect(
                discountService.validateDiscount('EXPIRED', 100)
            ).rejects.toThrow('Discount has expired');
        });

        it('should accept discount before expiry', async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            await discountService.createDiscount(sellerId, {
                code: 'VALID',
                type: DiscountType.FLAT,
                value: 10,
                expiryDate: tomorrow,
            });

            const discount = await discountService.validateDiscount('VALID', 100);
            expect(discount.code).toBe('VALID');
        });

        it('should reject discount when usage limit reached', async () => {
            const discount = await discountService.createDiscount(sellerId, {
                code: 'LIMITED',
                type: DiscountType.FLAT,
                value: 10,
                maxUses: 2,
            });

            // Simulate 2 uses
            await Discount.updateOne(
                { _id: discount._id },
                { currentUses: 2 }
            );

            await expect(
                discountService.validateDiscount('LIMITED', 100)
            ).rejects.toThrow('Discount usage limit reached');
        });

        it('should accept discount below usage limit', async () => {
            const discount = await discountService.createDiscount(sellerId, {
                code: 'LIMITED',
                type: DiscountType.FLAT,
                value: 10,
                maxUses: 5,
            });

            // Simulate 3 uses
            await Discount.updateOne(
                { _id: discount._id },
                { currentUses: 3 }
            );

            const validDiscount = await discountService.validateDiscount('LIMITED', 100);
            expect(validDiscount.code).toBe('LIMITED');
        });

        it('should reject discount when cart value below minimum', async () => {
            await discountService.createDiscount(sellerId, {
                code: 'MINVALUE',
                type: DiscountType.FLAT,
                value: 10,
                minimumCartValue: 100,
            });

            await expect(
                discountService.validateDiscount('MINVALUE', 50)
            ).rejects.toThrow('Minimum cart value of 100 required');
        });

        it('should accept discount when cart value meets minimum', async () => {
            await discountService.createDiscount(sellerId, {
                code: 'MINVALUE',
                type: DiscountType.FLAT,
                value: 10,
                minimumCartValue: 100,
            });

            const discount = await discountService.validateDiscount('MINVALUE', 150);
            expect(discount.code).toBe('MINVALUE');
        });
    });

    describe('Discount Calculation', () => {
        it('should calculate percentage discount correctly', async () => {
            const discount = await discountService.createDiscount(sellerId, {
                code: 'PERCENT',
                type: DiscountType.PERCENTAGE,
                value: 25,
            });

            const amount = discountService.calculateDiscount(discount, 200);
            expect(amount).toBe(50); // 25% of 200
        });

        it('should calculate flat discount correctly', async () => {
            const discount = await discountService.createDiscount(sellerId, {
                code: 'FLAT',
                type: DiscountType.FLAT,
                value: 30,
            });

            const amount = discountService.calculateDiscount(discount, 200);
            expect(amount).toBe(30);
        });

        it('should cap flat discount at cart value', async () => {
            const discount = await discountService.createDiscount(sellerId, {
                code: 'BIG',
                type: DiscountType.FLAT,
                value: 500,
            });

            const amount = discountService.calculateDiscount(discount, 100);
            expect(amount).toBe(100); // Capped at cart value
        });
    });

    describe('Discount Usage Tracking', () => {
        it('should increment usage count', async () => {
            const discount = await discountService.createDiscount(sellerId, {
                code: 'TRACK',
                type: DiscountType.FLAT,
                value: 10,
            });

            expect(discount.currentUses).toBe(0);

            await discountService.incrementUsage(discount._id.toString());

            const updated = await discountService.getDiscountById(
                discount._id.toString()
            );
            expect(updated?.currentUses).toBe(1);
        });
    });
});
