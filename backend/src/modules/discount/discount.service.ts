import { Discount, IDiscount, DiscountType } from './discount.model';
import mongoose from 'mongoose';

export interface CreateDiscountInput {
    code: string;
    type: DiscountType;
    value: number;
    expiryDate?: Date;
    minimumCartValue?: number;
    targetProductIds?: string[];
    maxUses?: number;
}

export interface UpdateDiscountInput {
    code?: string;
    type?: DiscountType;
    value?: number;
    expiryDate?: Date;
    minimumCartValue?: number;
    targetProductIds?: string[];
    maxUses?: number;
    isActive?: boolean;
}

class DiscountService {
    /**
     * Create discount (seller only)
     */
    async createDiscount(
        sellerId: string,
        input: CreateDiscountInput
    ): Promise<IDiscount> {
        const {
            code,
            type,
            value,
            expiryDate,
            minimumCartValue,
            targetProductIds,
            maxUses,
        } = input;

        // Validate percentage
        if (type === DiscountType.PERCENTAGE && (value < 0 || value > 100)) {
            throw new Error('Percentage discount must be between 0 and 100');
        }

        // Validate flat amount
        if (type === DiscountType.FLAT && value < 0) {
            throw new Error('Flat discount must be positive');
        }

        // Check if code already exists
        const existingDiscount = await Discount.findOne({ code: code.toUpperCase() });
        if (existingDiscount) {
            throw new Error('Discount code already exists');
        }

        const discount = await Discount.create({
            code: code.toUpperCase(),
            type,
            value,
            sellerId: new mongoose.Types.ObjectId(sellerId),
            expiryDate,
            minimumCartValue,
            targetProductIds: targetProductIds?.map(
                (id) => new mongoose.Types.ObjectId(id)
            ),
            maxUses,
            currentUses: 0,
            isActive: true,
        });

        return discount;
    }

    /**
     * Update discount (seller only)
     */
    async updateDiscount(
        discountId: string,
        sellerId: string,
        input: UpdateDiscountInput
    ): Promise<IDiscount> {
        const discount = await Discount.findOne({
            _id: discountId,
            sellerId: new mongoose.Types.ObjectId(sellerId),
        });

        if (!discount) {
            throw new Error('Discount not found or access denied');
        }

        // Update fields
        if (input.code) discount.code = input.code.toUpperCase();
        if (input.type) discount.type = input.type;
        if (input.value !== undefined) {
            // Validate percentage
            if (
                (input.type || discount.type) === DiscountType.PERCENTAGE &&
                (input.value < 0 || input.value > 100)
            ) {
                throw new Error('Percentage discount must be between 0 and 100');
            }
            discount.value = input.value;
        }
        if (input.expiryDate !== undefined) discount.expiryDate = input.expiryDate;
        if (input.minimumCartValue !== undefined)
            discount.minimumCartValue = input.minimumCartValue;
        if (input.targetProductIds !== undefined) {
            discount.targetProductIds = input.targetProductIds.map(
                (id) => new mongoose.Types.ObjectId(id)
            );
        }
        if (input.maxUses !== undefined) discount.maxUses = input.maxUses;
        if (input.isActive !== undefined) discount.isActive = input.isActive;

        await discount.save();
        return discount;
    }

    /**
     * Get discount by ID
     */
    async getDiscountById(discountId: string): Promise<IDiscount | null> {
        return Discount.findById(discountId);
    }

    /**
     * Get discount by code
     */
    async getDiscountByCode(code: string): Promise<IDiscount | null> {
        return Discount.findOne({ code: code.toUpperCase() });
    }

    /**
     * List seller's discounts
     */
    async listSellerDiscounts(sellerId: string): Promise<IDiscount[]> {
        return Discount.find({
            sellerId: new mongoose.Types.ObjectId(sellerId),
        }).sort({ createdAt: -1 });
    }

    /**
     * Validate discount for cart
     */
    async validateDiscount(
        code: string,
        cartValue: number
    ): Promise<IDiscount> {
        const discount = await this.getDiscountByCode(code);

        if (!discount) {
            throw new Error('Invalid discount code');
        }

        if (!discount.isActive) {
            throw new Error('Discount is no longer active');
        }

        // Check expiry
        if (discount.expiryDate && new Date() > discount.expiryDate) {
            throw new Error('Discount has expired');
        }

        // Check usage limit
        if (discount.maxUses && discount.currentUses >= discount.maxUses) {
            throw new Error('Discount usage limit reached');
        }

        // Check minimum cart value
        if (discount.minimumCartValue && cartValue < discount.minimumCartValue) {
            throw new Error(
                `Minimum cart value of ${discount.minimumCartValue} required`
            );
        }

        return discount;
    }

    /**
     * Calculate discount amount
     */
    calculateDiscount(discount: IDiscount, cartValue: number): number {
        if (discount.type === DiscountType.PERCENTAGE) {
            return (cartValue * discount.value) / 100;
        } else {
            return Math.min(discount.value, cartValue); // Don't exceed cart value
        }
    }

    /**
     * Increment discount usage (called during checkout)
     */
    async incrementUsage(discountId: string): Promise<void> {
        await Discount.updateOne(
            { _id: discountId },
            { $inc: { currentUses: 1 } }
        );
    }

    /**
     * Delete discount (seller only)
     */
    async deleteDiscount(discountId: string, sellerId: string): Promise<boolean> {
        const result = await Discount.deleteOne({
            _id: discountId,
            sellerId: new mongoose.Types.ObjectId(sellerId),
        });

        if (result.deletedCount === 0) {
            throw new Error('Discount not found or access denied');
        }

        return true;
    }
}

export const discountService = new DiscountService();
