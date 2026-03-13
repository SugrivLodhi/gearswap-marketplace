import { wishlistService } from './wishlist.service';

export const wishlistResolvers = {
    Query: {
        wishlist: (_: any, __: any, { user }: any) => {
            if (!user) throw new Error('Unauthorized');
            return wishlistService.getWishlist(user.userId);
        },
    },
    Mutation: {
        toggleWishlist: (_: any, { productId }: { productId: string }, { user }: any) => {
            if (!user) throw new Error('Unauthorized');
            return wishlistService.toggleWishlist(user.userId, productId);
        },
    },
    Product: {
        isWishlisted: (parent: any, _: any, { user }: any) => {
            if (!user) return false;
            return wishlistService.isWishlisted(user.userId, parent.id);
        },
    },
};
