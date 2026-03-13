import { chatService } from './chat.service';
import { requireAuth, requireSeller } from '../../middleware/auth.guard';

export const chatResolvers = {
    Query: {
        chatMessages: async (_: any, { roomId, limit }: { roomId: string, limit?: number }, context: any) => {
            requireAuth(context);
            // Optional: validate that the user is actually the buyer or seller for this room
            // since roomId is "<productId>_<buyerId>", we could parse it and check against context.user.id
            
            const messages = await chatService.getMessages(roomId, limit || 50);
            
            return messages.map((msg: any) => ({
                id: msg._id.toString(),
                roomId: msg.roomId,
                senderId: msg.senderId,
                senderRole: msg.senderRole,
                content: msg.content,
                createdAt: msg.createdAt.toISOString()
            }));
        },

        chatRooms: async (_: any, __: any, context: any) => {
            const user = requireSeller(context);
            return await chatService.getRoomsForSeller(user.userId);
        }
    }
};
