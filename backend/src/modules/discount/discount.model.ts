import mongoose, { Document, Schema } from 'mongoose';

export enum DiscountType {
    PERCENTAGE = 'PERCENTAGE',
    FLAT = 'FLAT',
}

export interface IDiscount extends Document {
    code: string;
    type: DiscountType;
    value: number; // Percentage (0-100) or flat amount
    sellerId: mongoose.Types.ObjectId;
    expiryDate?: Date;
    minimumCartValue?: number;
    targetProductIds?: mongoose.Types.ObjectId[];
    maxUses?: number;
    currentUses: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const discountSchema = new Schema<IDiscount>(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true,
        },
        type: {
            type: String,
            enum: Object.values(DiscountType),
            required: true,
        },
        value: {
            type: Number,
            required: true,
            min: 0,
        },
        sellerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        expiryDate: {
            type: Date,
        },
        minimumCartValue: {
            type: Number,
            min: 0,
        },
        targetProductIds: {
            type: [Schema.Types.ObjectId],
            ref: 'Product',
            default: [],
        },
        maxUses: {
            type: Number,
            min: 1,
        },
        currentUses: {
            type: Number,
            default: 0,
            min: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Validate percentage value
discountSchema.pre('save', function (next) {
    if (this.type === DiscountType.PERCENTAGE && this.value > 100) {
        return next(new Error('Percentage discount cannot exceed 100%'));
    }
    next();
});

// Compound index for seller's active discounts
discountSchema.index({ sellerId: 1, isActive: 1 });

export const Discount = mongoose.model<IDiscount>('Discount', discountSchema);
