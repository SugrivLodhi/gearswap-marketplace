import { Message, IMessage } from './chat.model';
import { Product } from '../product/product.model';

export const chatService = {
    /**
     * Persist a chat message in MongoDB.
     */
    async saveMessage(
        roomId: string,
        senderId: string,
        senderRole: 'BUYER' | 'SELLER',
        content: string
    ): Promise<IMessage> {
        const message = new Message({ roomId, senderId, senderRole, content });
        return message.save();
    },

    /**
     * Retrieve the most recent messages for a room, oldest-first.
     */
    async getMessages(roomId: string, limit = 50): Promise<IMessage[]> {
        return Message.find({ roomId })
            .sort({ createdAt: 1 })
            .limit(limit)
            .lean()
            .exec() as unknown as IMessage[];
    },

    /**
     * Return all distinct room IDs where the seller owns the product.
     * roomId format: "<productId>_<buyerId>"
     */
    async getRoomsForSeller(sellerId: string): Promise<string[]> {
        // Fetch all products owned by this seller
        const products = await Product.find({ sellerId: sellerId }, '_id').lean();
        const productIds = products.map((p) => String(p._id));

        if (productIds.length === 0) return [];

        // Find all distinct roomIds that start with one of those productIds
        const pattern = new RegExp(`^(${productIds.join('|')})_`);
        const rooms = await Message.distinct('roomId', { roomId: pattern });
        return rooms as string[];
    },
};
