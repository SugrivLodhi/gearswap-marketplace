import mongoose, { Document, Schema } from 'mongoose';

export interface IVariant {
    _id?: mongoose.Types.ObjectId;
    sku: string;
    price: number;
    stock: number;
    attributes: Record<string, string>; // e.g., { size: "M", color: "Blue" }
}

export interface IProduct extends Document {
    name: string;
    description: string;
    category: string;
    imageUrl: string;
    sellerId: mongoose.Types.ObjectId;
    hsnCode: string; // HSN code for GST (4-8 digits)
    gstRate: number; // DEPRECATED: Total GST Rate
    sgstRate: number;
    cgstRate: number;
    igstRate: number;
    variants: IVariant[];
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const variantSchema = new Schema<IVariant>(
    {
        sku: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        stock: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        attributes: {
            type: Map,
            of: String,
            default: {},
        },
    },
    { _id: true }
);

const productSchema = new Schema<IProduct>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            index: 'text',
        },
        description: {
            type: String,
            required: true,
            index: 'text',
        },
        category: {
            type: String,
            required: true,
            index: true,
        },
        imageUrl: {
            type: String,
            required: true,
        },
        sellerId: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        hsnCode: {
            type: String,
            required: true,
            validate: {
                validator: (v: string) => /^\d{4}$|^\d{6}$|^\d{8}$/.test(v),
                message: 'HSN code must be 4, 6, or 8 digits',
            },
        },
        gstRate: {
            type: Number,
            required: true,
            min: 0,
        },
        sgstRate: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        cgstRate: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        igstRate: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        variants: {
            type: [variantSchema],
            required: true,
            validate: {
                validator: (v: IVariant[]) => v.length > 0,
                message: 'Product must have at least one variant',
            },
        },
        isDeleted: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for efficient queries
productSchema.index({ sellerId: 1, isDeleted: 1 });
productSchema.index({ category: 1, isDeleted: 1 });
productSchema.index({ name: 'text', description: 'text' });

export const Product = mongoose.model<IProduct>('Product', productSchema);
