import mongoose, { Document, Schema } from 'mongoose';

export enum OrderStatus {
    PENDING = 'PENDING',
    PAID = 'PAID',
    SHIPPED = 'SHIPPED',
    COMPLETED = 'COMPLETED',
}

export interface IOrderItem {
    productId: mongoose.Types.ObjectId;
    productName: string;
    sellerId: mongoose.Types.ObjectId;
    variantId: mongoose.Types.ObjectId;
    variantSku: string;
    price: number;
    quantity: number;
    subtotal: number;
}

export interface IOrder extends Document {
    buyerId: mongoose.Types.ObjectId;
    items: IOrderItem[];
    status: OrderStatus;
    subtotal: number;
    discount: number;
    total: number;
    discountCode?: string;
    createdAt: Date;
    updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
    {
        productId: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
        },
        productName: {
            type: String,
            required: true,
        },
        sellerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        variantId: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        variantSku: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        quantity: {
            type: Number,
            required: true,
            min: 1,
        },
        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    { _id: false }
);

const orderSchema = new Schema<IOrder>(
    {
        buyerId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        items: {
            type: [orderItemSchema],
            required: true,
            validate: {
                validator: (v: IOrderItem[]) => v.length > 0,
                message: 'Order must have at least one item',
            },
        },
        status: {
            type: String,
            enum: Object.values(OrderStatus),
            default: OrderStatus.PENDING,
            index: true,
        },
        subtotal: {
            type: Number,
            required: true,
            min: 0,
        },
        discount: {
            type: Number,
            default: 0,
            min: 0,
        },
        total: {
            type: Number,
            required: true,
            min: 0,
        },
        discountCode: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for efficient queries
orderSchema.index({ buyerId: 1, createdAt: -1 });
orderSchema.index({ 'items.sellerId': 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

export const Order = mongoose.model<IOrder>('Order', orderSchema);
