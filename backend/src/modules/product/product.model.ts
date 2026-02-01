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
    gstRate: number; // GST rate percentage (e.g., 5, 12, 18, 28)
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
            ref: 'User',
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
            enum: [0, 0.25, 3, 5, 12, 18, 28],
            validate: {
                validator: (v: number) => [0, 0.25, 3, 5, 12, 18, 28].includes(v),
                message: 'GST rate must be a valid Indian GST rate (0, 0.25, 3, 5, 12, 18, or 28)',
            },
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

// Ensure SKU uniqueness within a product
variantSchema.index({ sku: 1 }, { unique: true, sparse: true });

export const Product = mongoose.model<IProduct>('Product', productSchema);
