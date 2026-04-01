import { getRedisConnection } from '../../config/redis';
import { Product, IProduct } from '../product/product.model';
import mongoose from 'mongoose';

export class RecommendationService {
    /**
     * Updates the co-occurrence graph in Redis for a set of items.
     * For every pair of items in the cart, it increments their relation score.
     */
    async updateRecommendationsGraph(itemIds: string[]): Promise<void> {
        if (itemIds.length < 2) return;

        const redis = getRedisConnection();
        const pipeline = redis.pipeline();

        for (let i = 0; i < itemIds.length; i++) {
            for (let j = 0; j < itemIds.length; j++) {
                if (i !== j) {
                    const key = `product:recommendations:${itemIds[i]}`;
                    pipeline.zincrby(key, 1, itemIds[j]);
                }
            }
        }

        await pipeline.exec();
    }

    /**
     * Retrieves recommended products based on the current cart items.
     */
    async getCartRecommendations(
        cartItemIds: string[],
        limit: number = 4
    ): Promise<IProduct[]> {
        if (cartItemIds.length === 0) {
            // Return top 4 newest products as fallback for empty cart
            return Product.find({ isDeleted: false })
                .sort({ createdAt: -1 })
                .limit(limit)
                .populate('sellerId');
        }

        const redis = getRedisConnection();
        const pipeline = redis.pipeline();

        // Get top recommendations for each item in the cart
        for (const itemId of cartItemIds) {
            const key = `product:recommendations:${itemId}`;
            pipeline.zrevrange(key, 0, 10);
        }

        const results = await pipeline.exec();
        
        // Aggregate and score recommendations
        const scoreMap = new Map<string, number>();
        if (results) {
            results.forEach(([err, elements], index) => {
                if (!err && Array.isArray(elements)) {
                    // Give higher weight to top elements in the sorted set
                    elements.forEach((id: string, rank: number) => {
                        const score = 10 - rank; 
                        scoreMap.set(id, (scoreMap.get(id) || 0) + score);
                    });
                }
            });
        }

        // Remove items already in the cart
        cartItemIds.forEach(id => scoreMap.delete(id));

        // Sort by aggregate score
        const sortedRecommendedIds = Array.from(scoreMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(entry => entry[0]);

        if (sortedRecommendedIds.length > 0) {
            // Fetch product details
            const objectIds = sortedRecommendedIds.map(id => new mongoose.Types.ObjectId(id));
            const recommendedProducts = await Product.find({
                _id: { $in: objectIds },
                isDeleted: false
            }).populate('sellerId');

            // If we didn't find enough, we should fill the rest
            if (recommendedProducts.length >= limit) {
                return recommendedProducts;
            }
            
            const remainingLimit = limit - recommendedProducts.length;
            const existingIds = [...cartItemIds, ...recommendedProducts.map(p => p._id.toString())];
            
            const fallbackProducts = await this.getFallbackRecommendations(existingIds, remainingLimit);
            return [...recommendedProducts, ...fallbackProducts];
        }

        // Complete fallback if Redis has no data
        return this.getFallbackRecommendations(cartItemIds, limit);
    }

    private async getFallbackRecommendations(excludeIds: string[], limit: number): Promise<IProduct[]> {
        const objectIds = excludeIds.map(id => new mongoose.Types.ObjectId(id));
        return Product.find({
            _id: { $nin: objectIds },
            isDeleted: false
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('sellerId');
    }
}

export const recommendationService = new RecommendationService();
