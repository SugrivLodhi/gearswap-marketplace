import { Cart, ICart, ICartItem } from './cart.model';
import { redis } from '../../config/redis';
import { env } from '../../config/environment';

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

export interface CartItemWithProduct {
    id: string;
    productId: string;
    productName: string;
    variantId: string;
    variantSku: string;
    price: number;
    quantity: number;
    subtotal: number;
    product: any; // Full product data from Catalog service
}

export interface CartWithPricing {
    id: string;
    items: CartItemWithProduct[];
    subtotal: number;
    discount: number;
    total: number;
    discountCode?: string;
}

class CartService {
    /**
     * Fetch product data from Catalog service
     */
    private async fetchProductFromCatalog(productId: string): Promise<any> {
        try {
            const response = await fetch(env.catalogServiceUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: `
                        query GetProduct($id: ID!) {
                            product(id: $id) {
                                id
                                name
                                category
                                imageUrl
                                variants {
                                    id
                                    sku
                                    price
                                    stock
                                }
                            }
                        }
                    `,
                    variables: { id: productId },
                }),
            });

            const result = await response.json();
            if (result.errors) {
                throw new Error(result.errors[0].message);
            }

            return result.data.product;
        } catch (error) {
            console.error('Error fetching product from catalog:', error);
            throw new Error('Failed to fetch product details');
        }
    }

    /**
     * Get cart with full product details and pricing
     */
    async getCart(buyerId: string): Promise<CartWithPricing> {
        // Get or create cart
        const cart = await Cart.getOrCreateCart(buyerId);

        // Get cart items
        const items = await Cart.getCartItems(cart.id);

        // Fetch product details for each item
        const itemsWithProducts: CartItemWithProduct[] = [];
        let subtotal = 0;

        for (const item of items) {
            const product = await this.fetchProductFromCatalog(item.product_id);
            const variant = product.variants.find((v: any) => v.id === item.variant_id);

            if (!variant) {
                // Variant not found, skip this item
                continue;
            }

            const itemSubtotal = variant.price * item.quantity;
            subtotal += itemSubtotal;

            itemsWithProducts.push({
                id: item.id,
                productId: item.product_id,
                productName: product.name,
                variantId: item.variant_id,
                variantSku: variant.sku,
                price: variant.price,
                quantity: item.quantity,
                subtotal: itemSubtotal,
                product,
            });
        }

        // Calculate discount
        let discount = 0;
        let discountCode: string | undefined;

        if (cart.discount_id) {
            try {
                const { discountService } = await import('../discount/discount.service');
                const discountData = await discountService.getDiscountById(cart.discount_id);

                if (discountData) {
                    discount = discountService.calculateDiscountAmount(discountData, subtotal);
                    discountCode = discountData.code;
                }
            } catch (error) {
                // Discount might be invalid, ignore it
                console.warn('Failed to apply discount:', error);
            }
        }

        const total = subtotal - discount;

        return {
            id: cart.id,
            items: itemsWithProducts,
            subtotal,
            discount,
            total,
        };
    }

    /**
     * Add item to cart
     */
    async addToCart(buyerId: string, input: AddToCartInput): Promise<CartWithPricing> {
        const { productId, variantId, quantity } = input;

        // Validate product and variant exist
        const product = await this.fetchProductFromCatalog(productId);
        const variant = product.variants.find((v: any) => v.id === variantId);

        if (!variant) {
            throw new Error('Variant not found');
        }

        // Check stock
        if (variant.stock < quantity) {
            throw new Error('Insufficient stock');
        }

        // Get or create cart
        const cart = await Cart.getOrCreateCart(buyerId);

        // Add item
        await Cart.addItem(cart.id, productId, variantId, quantity);

        // Invalidate cache
        await redis.del(`cart:${buyerId}`);

        // Return updated cart
        return await this.getCart(buyerId);
    }

    /**
     * Update cart item quantity
     */
    async updateCartItem(buyerId: string, input: UpdateCartItemInput): Promise<CartWithPricing> {
        const { productId, variantId, quantity } = input;

        if (quantity <= 0) {
            throw new Error('Quantity must be greater than 0');
        }

        // Validate product and variant exist
        const product = await this.fetchProductFromCatalog(productId);
        const variant = product.variants.find((v: any) => v.id === variantId);

        if (!variant) {
            throw new Error('Variant not found');
        }

        // Check stock
        if (variant.stock < quantity) {
            throw new Error('Insufficient stock');
        }

        // Get cart
        const cart = await Cart.getOrCreateCart(buyerId);

        // Update item
        await Cart.updateItemQuantity(cart.id, productId, variantId, quantity);

        // Invalidate cache
        await redis.del(`cart:${buyerId}`);

        // Return updated cart
        return await this.getCart(buyerId);
    }

    /**
     * Remove item from cart
     */
    async removeFromCart(buyerId: string, productId: string, variantId: string): Promise<CartWithPricing> {
        // Get cart
        const cart = await Cart.getOrCreateCart(buyerId);

        // Remove item
        await Cart.removeItem(cart.id, productId, variantId);

        // Invalidate cache
        await redis.del(`cart:${buyerId}`);

        // Return updated cart
        return await this.getCart(buyerId);
    }

    /**
     * Clear cart
     */
    async clearCart(buyerId: string): Promise<boolean> {
        // Get cart
        const cart = await Cart.getOrCreateCart(buyerId);

        // Clear items
        await Cart.clearCart(cart.id);

        // Invalidate cache
        await redis.del(`cart:${buyerId}`);

        return true;
    }

    /**
     * Apply discount code
     */
    async applyDiscount(buyerId: string, discountCode: string): Promise<CartWithPricing> {
        const cart = await Cart.getOrCreateCart(buyerId);

        // Get current cart to check subtotal
        const currentCart = await this.getCart(buyerId);

        // Validate discount
        const { discountService } = await import('../discount/discount.service');
        const discount = await discountService.validateDiscount(discountCode, currentCart.subtotal);

        // Apply discount to cart
        await Cart.applyDiscount(cart.id, discount.id);

        // Invalidate cache
        await redis.del(`cart:${buyerId}`);

        // Return updated cart
        return await this.getCart(buyerId);
    }
}

export const cartService = new CartService();
