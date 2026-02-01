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
    price: number; // GST-exclusive price per unit
    quantity: number;
    subtotal: number; // Deprecated: use taxableAmount
    // GST fields (snapshotted at order time)
    hsnCode: string;
    gstRate: number;
    taxableAmount: number; // GST-exclusive amount (price × quantity)
    gstAmount: number; // Calculated GST for this item
    // Detailed Breakdown
    sgstRate: number;
    cgstRate: number;
    igstRate: number;
    sgstAmount: number;
    cgstAmount: number;
    igstAmount: number;
    totalAmount: number; // Final amount including GST
}

export interface IOrder extends Document {
    buyerId: mongoose.Types.ObjectId;
    items: IOrderItem[];
    status: OrderStatus;
    subtotal: number; // Deprecated: use taxableSubtotal
    discount: number;
    total: number; // Deprecated: use grandTotal
    discountCode?: string;
    // GST breakdown fields
    taxableSubtotal: number; // Sum of all item taxableAmounts
    totalGst: number; // Sum of all item gstAmounts
    totalSgst: number;
    totalCgst: number;
    totalIgst: number;
    grandTotal: number; // Final payable amount (taxableSubtotal - discount + totalGst)
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
        // GST fields (snapshotted at order time)
        hsnCode: {
            type: String,
            required: true,
        },
        gstRate: {
            type: Number,
            required: true,
            min: 0,
        },
        taxableAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        gstAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        // Detailed GST Breakdown
        sgstRate: { type: Number, default: 0 },
        cgstRate: { type: Number, default: 0 },
        igstRate: { type: Number, default: 0 },
        sgstAmount: { type: Number, default: 0 },
        cgstAmount: { type: Number, default: 0 },
        igstAmount: { type: Number, default: 0 },
        totalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
    },
    { _id: false }
);

const orderSchema = new Schema<IOrder>(
    {
        // ... (existing fields)
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
        // GST breakdown fields
        taxableSubtotal: {
            type: Number,
            required: true,
            min: 0,
        },
        totalGst: {
            type: Number,
            required: true,
            min: 0,
        },
        totalSgst: { type: Number, default: 0 },
        totalCgst: { type: Number, default: 0 },
        totalIgst: { type: Number, default: 0 },
        grandTotal: {
            type: Number,
            required: true,
            min: 0,
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
