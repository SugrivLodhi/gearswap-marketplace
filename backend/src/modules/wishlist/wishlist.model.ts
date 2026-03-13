import mongoose, { Document, Schema } from 'mongoose';

export interface IWishlist extends Document {
    userId: mongoose.Types.ObjectId;
    productId: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const wishlistSchema = new Schema<IWishlist>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Ensure a user can only wishlist a product once
wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

export const Wishlist = mongoose.model<IWishlist>('Wishlist', wishlistSchema);
