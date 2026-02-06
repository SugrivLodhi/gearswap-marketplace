import { Discount, DiscountType, IDiscount } from './discount.model';
import { redis } from '../../config/redis';

export interface CreateDiscountInput {
    code: string;
    type: DiscountType;
    value: number;
    minOrderValue: number;
    maxDiscountAmount?: number;
    usageLimit?: number;
    validFrom: Date;
    validUntil: Date;
}

class DiscountService {
    /**
     * Calculate discount amount based on discount type and subtotal
     * Note: Discount is applied BEFORE GST calculation
     */
    calculateDiscountAmount(discount: IDiscount, subtotal: number): number {
        let discountAmount = 0;

        if (discount.type === DiscountType.PERCENTAGE) {
            discountAmount = (subtotal * discount.value) / 100;
        } else if (discount.type === DiscountType.FIXED) {
            discountAmount = discount.value;
        }

        // Apply max discount cap if set
        if (discount.max_discount_amount && discountAmount > discount.max_discount_amount) {
            discountAmount = discount.max_discount_amount;
        }

        // Discount cannot exceed subtotal
        if (discountAmount > subtotal) {
            discountAmount = subtotal;
        }

        return parseFloat(discountAmount.toFixed(2));
    }

    /**
     * Validate discount code
     */
    async validateDiscount(code: string, subtotal: number): Promise<IDiscount> {
        // Check cache first
        const cacheKey = `discount:${code.toUpperCase()}`;
        const cached = await redis.get(cacheKey);

        let discount: IDiscount | null;

        if (cached) {
            discount = JSON.parse(cached);
        } else {
            discount = await Discount.getDiscountByCode(code);

            if (discount) {
                // Cache for 5 minutes
                await redis.setex(cacheKey, 300, JSON.stringify(discount));
            }
        }

        if (!discount) {
            throw new Error('Invalid discount code');
        }

        // Check if active
        if (!discount.is_active) {
            throw new Error('Discount code is inactive');
        }

        // Check validity period
        const now = new Date();
        if (now < new Date(discount.valid_from)) {
            throw new Error('Discount code is not yet valid');
        }
        if (now > new Date(discount.valid_until)) {
            throw new Error('Discount code has expired');
        }

        // Check usage limit
        if (discount.usage_limit && discount.usage_count >= discount.usage_limit) {
            throw new Error('Discount code usage limit reached');
        }

        // Check minimum order value
        if (subtotal < discount.min_order_value) {
            throw new Error(
                `Minimum order value of ₹${discount.min_order_value} required for this discount`
            );
        }

        return discount;
    }

    /**
     * Create discount (admin only)
     */
    async createDiscount(input: CreateDiscountInput): Promise<IDiscount> {
        // Validate input
        if (input.type === DiscountType.PERCENTAGE && (input.value <= 0 || input.value > 100)) {
            throw new Error('Percentage discount must be between 0 and 100');
        }

        if (input.type === DiscountType.FIXED && input.value <= 0) {
            throw new Error('Fixed discount must be greater than 0');
        }

        if (input.validFrom >= input.validUntil) {
            throw new Error('Valid from date must be before valid until date');
        }

        // Check if code already exists
        const existing = await Discount.getDiscountByCode(input.code);
        if (existing) {
            throw new Error('Discount code already exists');
        }

        const discount = await Discount.createDiscount(input);

        // Cache the new discount
        const cacheKey = `discount:${discount.code}`;
        await redis.setex(cacheKey, 300, JSON.stringify(discount));

        return discount;
    }

    /**
     * Get discount by ID
     */
    async getDiscountById(id: string): Promise<IDiscount | null> {
        return await Discount.getDiscountById(id);
    }

    /**
     * List all discounts
     */
    async listDiscounts(activeOnly: boolean = false): Promise<IDiscount[]> {
        return await Discount.listDiscounts(activeOnly);
    }

    /**
     * Increment usage count
     */
    async incrementUsage(id: string): Promise<void> {
        await Discount.incrementUsage(id);

        // Invalidate cache
        const discount = await Discount.getDiscountById(id);
        if (discount) {
            const cacheKey = `discount:${discount.code}`;
            await redis.del(cacheKey);
        }
    }

    /**
     * Update discount status
     */
    async updateDiscountStatus(id: string, isActive: boolean): Promise<IDiscount> {
        const discount = await Discount.updateDiscountStatus(id, isActive);

        // Invalidate cache
        const cacheKey = `discount:${discount.code}`;
        await redis.del(cacheKey);

        return discount;
    }

    /**
     * Delete discount
     */
    async deleteDiscount(id: string): Promise<boolean> {
        const discount = await Discount.getDiscountById(id);
        if (discount) {
            // Invalidate cache
            const cacheKey = `discount:${discount.code}`;
            await redis.del(cacheKey);
        }

        return await Discount.deleteDiscount(id);
    }
}

export const discountService = new DiscountService();
