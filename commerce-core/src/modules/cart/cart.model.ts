import { db } from '../../config/database';

export interface ICart {
    id: string;
    buyer_id: string;
    discount_id: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface ICartItem {
    id: string;
    cart_id: string;
    product_id: string;
    variant_id: string;
    quantity: number;
    created_at: Date;
    updated_at: Date;
}

export class CartModel {
    /**
     * Get or create cart for buyer
     */
    async getOrCreateCart(buyerId: string): Promise<ICart> {
        // Try to get existing cart
        let result = await db.query(
            'SELECT id, buyer_id, discount_id, created_at, updated_at FROM carts WHERE buyer_id = $1',
            [buyerId]
        );

        if (result.rows.length > 0) {
            return result.rows[0];
        }

        // Create new cart
        result = await db.query(
            `INSERT INTO carts (buyer_id) VALUES ($1) 
             RETURNING id, buyer_id, discount_id, created_at, updated_at`,
            [buyerId]
        );

        return result.rows[0];
    }

    /**
     * Get cart items
     */
    async getCartItems(cartId: string): Promise<ICartItem[]> {
        const result = await db.query(
            `SELECT id, cart_id, product_id, variant_id, quantity, created_at, updated_at 
             FROM cart_items WHERE cart_id = $1`,
            [cartId]
        );

        return result.rows;
    }

    /**
     * Add item to cart
     */
    async addItem(cartId: string, productId: string, variantId: string, quantity: number): Promise<ICartItem> {
        const result = await db.query(
            `INSERT INTO cart_items (cart_id, product_id, variant_id, quantity)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (cart_id, product_id, variant_id)
             DO UPDATE SET quantity = cart_items.quantity + $4
             RETURNING id, cart_id, product_id, variant_id, quantity, created_at, updated_at`,
            [cartId, productId, variantId, quantity]
        );

        return result.rows[0];
    }

    /**
     * Update item quantity
     */
    async updateItemQuantity(cartId: string, productId: string, variantId: string, quantity: number): Promise<ICartItem | null> {
        const result = await db.query(
            `UPDATE cart_items 
             SET quantity = $4, updated_at = NOW()
             WHERE cart_id = $1 AND product_id = $2 AND variant_id = $3
             RETURNING id, cart_id, product_id, variant_id, quantity, created_at, updated_at`,
            [cartId, productId, variantId, quantity]
        );

        return result.rows[0] || null;
    }

    /**
     * Remove item from cart
     */
    async removeItem(cartId: string, productId: string, variantId: string): Promise<boolean> {
        const result = await db.query(
            'DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND variant_id = $3',
            [cartId, productId, variantId]
        );

        return result.rowCount > 0;
    }

    /**
     * Clear cart
     */
    async clearCart(cartId: string): Promise<void> {
        await db.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
    }

    /**
     * Apply discount to cart
     */
    async applyDiscount(cartId: string, discountId: string | null): Promise<void> {
        await db.query(
            'UPDATE carts SET discount_id = $2, updated_at = NOW() WHERE id = $1',
            [cartId, discountId]
        );
    }
}

export const Cart = new CartModel();
