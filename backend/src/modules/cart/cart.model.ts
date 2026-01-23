import mongoose, { Document, Schema } from 'mongoose';

export interface ICartItem {
    productId: mongoose.Types.ObjectId;
    variantId: mongoose.Types.ObjectId;
    quantity: number;
}

export interface ICart extends Document {
    buyerId: mongoose.Types.ObjectId;
    items: ICartItem[];
    discountId?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>(
    {
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        variantId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
    },
    { _id: false }
);

const cartSchema = new Schema<ICart>(
    {
        buyerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true, // One cart per buyer
            index: true,
        },
        items: {
            type: [cartItemSchema],
            default: [],
        },
        discountId: {
            type: Schema.Types.ObjectId,
            ref: 'Discount',
        },
    },
    {
        timestamps: true,
    }
);

export const Cart = mongoose.model<ICart>('Cart', cartSchema);
