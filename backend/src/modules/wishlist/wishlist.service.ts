import { Wishlist } from './wishlist.model';
import { Product } from '../product/product.model';
import { GraphQLError } from 'graphql';
import mongoose from 'mongoose';

export const wishlistService = {
    async toggleWishlist(userId: string, productId: string) {
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            throw new GraphQLError('Invalid product ID');
        }

        const existing = await Wishlist.findOne({ userId, productId });

        if (existing) {
            await Wishlist.deleteOne({ _id: existing._id });
            return await Product.findById(productId);
        } else {
            const product = await Product.findById(productId);
            if (!product) {
                throw new GraphQLError('Product not found');
            }
            await Wishlist.create({ userId, productId });
            return product;
        }
    },

    async getWishlist(userId: string) {
        const items = await Wishlist.find({ userId }).populate('productId');
        return items.map((item) => item.productId).filter((p) => p !== null);
    },

    async isWishlisted(userId: string, productId: string): Promise<boolean> {
        if (!userId) return false;
        const count = await Wishlist.countDocuments({ userId, productId });
        return count > 0;
    },
};
