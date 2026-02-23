-- Commerce Core Database Schema
-- PostgreSQL Migration Script

-- ==================== EXTENSIONS ====================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== USERS TABLE ====================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('BUYER', 'SELLER')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ==================== CARTS TABLE ====================
CREATE TABLE IF NOT EXISTS carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    discount_id UUID REFERENCES discounts(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(buyer_id)
);

CREATE INDEX idx_carts_buyer_id ON carts(buyer_id);

-- ==================== CART ITEMS TABLE ====================
CREATE TABLE IF NOT EXISTS cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cart_id UUID NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id VARCHAR(255) NOT NULL, -- MongoDB ObjectId as string
    variant_id VARCHAR(255) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(cart_id, product_id, variant_id)
);

CREATE INDEX idx_cart_items_cart_id ON cart_items(cart_id);

-- ==================== DISCOUNTS TABLE ====================
CREATE TABLE IF NOT EXISTS discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('PERCENTAGE', 'FLAT')),
    value DECIMAL(10,2) NOT NULL CHECK (value >= 0),
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expiry_date TIMESTAMP,
    minimum_cart_value DECIMAL(10,2),
    target_product_ids TEXT[], -- Array of product IDs
    max_uses INT,
    current_uses INT DEFAULT 0 CHECK (current_uses >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_discounts_code ON discounts(code);
CREATE INDEX idx_discounts_seller_id ON discounts(seller_id);
CREATE INDEX idx_discounts_is_active ON discounts(is_active);

-- ==================== ORDERS TABLE ====================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id UUID NOT NULL REFERENCES users(id),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'SHIPPED', 'COMPLETED')),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    discount DECIMAL(10,2) DEFAULT 0 CHECK (discount >= 0),
    total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
    discount_code VARCHAR(50),
    taxable_subtotal DECIMAL(10,2) NOT NULL CHECK (taxable_subtotal >= 0),
    total_gst DECIMAL(10,2) NOT NULL CHECK (total_gst >= 0),
    total_sgst DECIMAL(10,2) DEFAULT 0 CHECK (total_sgst >= 0),
    total_cgst DECIMAL(10,2) DEFAULT 0 CHECK (total_cgst >= 0),
    total_igst DECIMAL(10,2) DEFAULT 0 CHECK (total_igst >= 0),
    grand_total DECIMAL(10,2) NOT NULL CHECK (grand_total >= 0),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_orders_buyer_id ON orders(buyer_id, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status, created_at DESC);

-- ==================== ORDER ITEMS TABLE ====================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    seller_id UUID NOT NULL REFERENCES users(id),
    variant_id VARCHAR(255) NOT NULL,
    variant_sku VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    hsn_code VARCHAR(8) NOT NULL,
    gst_rate DECIMAL(5,2) NOT NULL CHECK (gst_rate >= 0),
    taxable_amount DECIMAL(10,2) NOT NULL CHECK (taxable_amount >= 0),
    gst_amount DECIMAL(10,2) NOT NULL CHECK (gst_amount >= 0),
    sgst_rate DECIMAL(5,2) DEFAULT 0 CHECK (sgst_rate >= 0),
    cgst_rate DECIMAL(5,2) DEFAULT 0 CHECK (cgst_rate >= 0),
    igst_rate DECIMAL(5,2) DEFAULT 0 CHECK (igst_rate >= 0),
    sgst_amount DECIMAL(10,2) DEFAULT 0 CHECK (sgst_amount >= 0),
    cgst_amount DECIMAL(10,2) DEFAULT 0 CHECK (cgst_amount >= 0),
    igst_amount DECIMAL(10,2) DEFAULT 0 CHECK (igst_amount >= 0),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0)
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_seller_id ON order_items(seller_id);

-- ==================== UPDATED_AT TRIGGER ====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON carts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cart_items_updated_at BEFORE UPDATE ON cart_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
