import { Cart, ICart, ICartItem } from './cart.model';
import { productService } from '@modules/product/product.service';
import { discountService } from '@modules/discount/discount.service';
import mongoose from 'mongoose';

export interface AddToCartInput {
    productId: string;
    variantId: string;
    quantity: number;
}

export interface UpdateCartItemInput {
    productId: string;
    variantId: string;
    quantity: number;
}

export interface CartWithPricing {
    cart: ICart;
    items: Array<{
        productId: string;
        variantId: string;
        productName: string;
        variantSku: string;
        price: number;
        quantity: number;
        subtotal: number;
    }>;
    subtotal: number;
    discount: number;
    total: number;
}

class CartService {
    /**
     * Get or create cart for buyer
     */
    async getOrCreateCart(buyerId: string): Promise<ICart> {
        let cart = await Cart.findOne({
            buyerId: new mongoose.Types.ObjectId(buyerId),
        });

        if (!cart) {
            cart = await Cart.create({
                buyerId: new mongoose.Types.ObjectId(buyerId),
                items: [],
            });
        }

        return cart;
    }

    /**
     * Add item to cart
     */
    async addToCart(buyerId: string, input: AddToCartInput): Promise<ICart> {
        const { productId, variantId, quantity } = input;

        // Validate product and variant exist
        const variantData = await productService.getVariantBySku(
            productId,
            variantId
        );

        if (!variantData) {
            throw new Error('Product or variant not found');
        }

        // Check stock availability
        if (variantData.variant.stock < quantity) {
            throw new Error(
                `Insufficient stock. Available: ${variantData.variant.stock}`
            );
        }

        // Get or create cart
        const cart = await this.getOrCreateCart(buyerId);

        // Check if item already exists in cart
        const existingItemIndex = cart.items.findIndex(
            (item) =>
                item.productId.toString() === productId &&
                item.variantId.toString() === variantId
        );

        if (existingItemIndex !== -1) {
            // Update quantity
            const newQuantity = cart.items[existingItemIndex].quantity + quantity;

            // Check stock for new quantity
            if (variantData.variant.stock < newQuantity) {
                throw new Error(
                    `Insufficient stock. Available: ${variantData.variant.stock}`
                );
            }

            cart.items[existingItemIndex].quantity = newQuantity;
        } else {
            // Add new item
            cart.items.push({
                productId: new mongoose.Types.ObjectId(productId),
                variantId: new mongoose.Types.ObjectId(variantId),
                quantity,
            });
        }

        await cart.save();
        return cart;
    }

    /**
     * Update cart item quantity
     */
    async updateCartItem(
        buyerId: string,
        input: UpdateCartItemInput
    ): Promise<ICart> {
        const { productId, variantId, quantity } = input;

        const cart = await this.getOrCreateCart(buyerId);

        const itemIndex = cart.items.findIndex(
            (item) =>
                item.productId.toString() === productId &&
                item.variantId.toString() === variantId
        );

        if (itemIndex === -1) {
            throw new Error('Item not found in cart');
        }

        if (quantity <= 0) {
            // Remove item if quantity is 0 or negative
            cart.items.splice(itemIndex, 1);
        } else {
            // Validate stock
            const variantData = await productService.getVariantBySku(
                productId,
                variantId
            );

            if (!variantData) {
                throw new Error('Product or variant not found');
            }

            if (variantData.variant.stock < quantity) {
                throw new Error(
                    `Insufficient stock. Available: ${variantData.variant.stock}`
                );
            }

            cart.items[itemIndex].quantity = quantity;
        }

        await cart.save();
        return cart;
    }

    /**
     * Remove item from cart
     */
    async removeFromCart(
        buyerId: string,
        productId: string,
        variantId: string
    ): Promise<ICart> {
        const cart = await this.getOrCreateCart(buyerId);

        cart.items = cart.items.filter(
            (item) =>
                !(
                    item.productId.toString() === productId &&
                    item.variantId.toString() === variantId
                )
        );

        await cart.save();
        return cart;
    }

    /**
     * Apply discount to cart
     */
    async applyDiscount(buyerId: string, discountCode: string): Promise<ICart> {
        const cart = await this.getOrCreateCart(buyerId);

        // Get cart pricing to validate minimum value
        const cartPricing = await this.getCartWithPricing(buyerId);

        // Validate discount
        const discount = await discountService.validateDiscount(
            discountCode,
            cartPricing.subtotal
        );

        cart.discountId = discount._id as mongoose.Types.ObjectId;
        await cart.save();

        return cart;
    }

    /**
     * Remove discount from cart
     */
    async removeDiscount(buyerId: string): Promise<ICart> {
        const cart = await this.getOrCreateCart(buyerId);
        cart.discountId = undefined;
        await cart.save();
        return cart;
    }

    /**
     * Get cart with calculated pricing
     */
    async getCartWithPricing(buyerId: string): Promise<CartWithPricing> {
        const cart = await this.getOrCreateCart(buyerId);

        // Calculate item prices
        const itemsWithPricing = await Promise.all(
            cart.items.map(async (item) => {
                const variantData = await productService.getVariantBySku(
                    item.productId.toString(),
                    item.variantId.toString()
                );

                if (!variantData) {
                    throw new Error(
                        `Product or variant not found: ${item.productId}/${item.variantId}`
                    );
                }

                const price = variantData.variant.price;
                const subtotal = price * item.quantity;

                return {
                    productId: item.productId.toString(),
                    variantId: item.variantId.toString(),
                    productName: variantData.product.name,
                    variantSku: variantData.variant.sku,
                    price,
                    quantity: item.quantity,
                    subtotal,
                };
            })
        );

        // Calculate subtotal
        const subtotal = itemsWithPricing.reduce(
            (sum, item) => sum + item.subtotal,
            0
        );

        // Calculate discount
        let discountAmount = 0;
        if (cart.discountId) {
            try {
                const discount = await discountService.getDiscountById(
                    cart.discountId.toString()
                );
                if (discount) {
                    discountAmount = discountService.calculateDiscount(
                        discount,
                        subtotal
                    );
                }
            } catch (error) {
                // Discount might be invalid, ignore it
                cart.discountId = undefined;
                await cart.save();
            }
        }

        // Calculate total
        const total = Math.max(0, subtotal - discountAmount);

        return {
            cart,
            items: itemsWithPricing,
            subtotal,
            discount: discountAmount,
            total,
        };
    }

    /**
     * Clear cart (after checkout)
     */
    async clearCart(buyerId: string): Promise<void> {
        const cart = await this.getOrCreateCart(buyerId);
        cart.items = [];
        cart.discountId = undefined;
        await cart.save();
    }
}

export const cartService = new CartService();
