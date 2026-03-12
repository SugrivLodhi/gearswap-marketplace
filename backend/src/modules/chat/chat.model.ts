import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
    roomId: string;       // "<productId>_<buyerId>"
    senderId: string;
    senderRole: 'BUYER' | 'SELLER';
    content: string;
    createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
    {
        roomId: { type: String, required: true, index: true },
        senderId: { type: String, required: true },
        senderRole: { type: String, enum: ['BUYER', 'SELLER'], required: true },
        content: { type: String, required: true, trim: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

// Compound index for efficient room history queries
messageSchema.index({ roomId: 1, createdAt: 1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
