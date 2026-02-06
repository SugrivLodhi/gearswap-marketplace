import { db } from '../../config/database';

export enum DiscountType {
    PERCENTAGE = 'PERCENTAGE',
    FIXED = 'FIXED',
}

export interface IDiscount {
    id: string;
    code: string;
    type: DiscountType;
    value: number;
    min_order_value: number;
    max_discount_amount?: number;
    usage_limit?: number;
    usage_count: number;
    valid_from: Date;
    valid_until: Date;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}

export class DiscountModel {
    /**
     * Create discount
     */
    async createDiscount(data: {
        code: string;
        type: DiscountType;
        value: number;
        minOrderValue: number;
        maxDiscountAmount?: number;
        usageLimit?: number;
        validFrom: Date;
        validUntil: Date;
    }): Promise<IDiscount> {
        const result = await db.query(
            `INSERT INTO discounts (
                code, type, value, min_order_value, max_discount_amount,
                usage_limit, valid_from, valid_until
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, code, type, value, min_order_value, max_discount_amount,
                      usage_limit, usage_count, valid_from, valid_until, is_active,
                      created_at, updated_at`,
            [
                data.code.toUpperCase(),
                data.type,
                data.value,
                data.minOrderValue,
                data.maxDiscountAmount,
                data.usageLimit,
                data.validFrom,
                data.validUntil,
            ]
        );

        return result.rows[0];
    }

    /**
     * Get discount by code
     */
    async getDiscountByCode(code: string): Promise<IDiscount | null> {
        const result = await db.query(
            `SELECT id, code, type, value, min_order_value, max_discount_amount,
                    usage_limit, usage_count, valid_from, valid_until, is_active,
                    created_at, updated_at
             FROM discounts WHERE code = $1`,
            [code.toUpperCase()]
        );

        return result.rows[0] || null;
    }

    /**
     * Get discount by ID
     */
    async getDiscountById(id: string): Promise<IDiscount | null> {
        const result = await db.query(
            `SELECT id, code, type, value, min_order_value, max_discount_amount,
                    usage_limit, usage_count, valid_from, valid_until, is_active,
                    created_at, updated_at
             FROM discounts WHERE id = $1`,
            [id]
        );

        return result.rows[0] || null;
    }

    /**
     * List all discounts
     */
    async listDiscounts(activeOnly: boolean = false): Promise<IDiscount[]> {
        let query = `
            SELECT id, code, type, value, min_order_value, max_discount_amount,
                   usage_limit, usage_count, valid_from, valid_until, is_active,
                   created_at, updated_at
            FROM discounts
        `;

        if (activeOnly) {
            query += ` WHERE is_active = true AND valid_from <= NOW() AND valid_until >= NOW()`;
        }

        query += ` ORDER BY created_at DESC`;

        const result = await db.query(query);
        return result.rows;
    }

    /**
     * Increment usage count
     */
    async incrementUsage(id: string): Promise<void> {
        await db.query(
            'UPDATE discounts SET usage_count = usage_count + 1, updated_at = NOW() WHERE id = $1',
            [id]
        );
    }

    /**
     * Update discount status
     */
    async updateDiscountStatus(id: string, isActive: boolean): Promise<IDiscount> {
        const result = await db.query(
            `UPDATE discounts SET is_active = $2, updated_at = NOW()
             WHERE id = $1
             RETURNING id, code, type, value, min_order_value, max_discount_amount,
                       usage_limit, usage_count, valid_from, valid_until, is_active,
                       created_at, updated_at`,
            [id, isActive]
        );

        return result.rows[0];
    }

    /**
     * Delete discount
     */
    async deleteDiscount(id: string): Promise<boolean> {
        const result = await db.query('DELETE FROM discounts WHERE id = $1', [id]);
        return result.rowCount > 0;
    }
}

export const Discount = new DiscountModel();
