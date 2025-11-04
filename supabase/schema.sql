-- The Nest Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLES
-- =============================================

-- Sessions table (LAN party events)
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    price_per_night DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Guests table
CREATE TABLE guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    nights_count INTEGER NOT NULL DEFAULT 1 CHECK (nights_count > 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    purchase_price DECIMAL(10,2) CHECK (purchase_price >= 0),
    category TEXT,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON COLUMN products.price IS 'Prodejní cena (selling price)';
COMMENT ON COLUMN products.purchase_price IS 'Nákupní cena (purchase price) - volitelné';

-- Consumption table (consumption records)
CREATE TABLE consumption (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    consumed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hardware Items table
CREATE TABLE hardware_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('monitor', 'pc')),
    category TEXT NOT NULL,
    price_per_night DECIMAL(10,2) NOT NULL CHECK (price_per_night > 0),
    specs JSONB,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hardware Reservations table
CREATE TABLE hardware_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hardware_item_id UUID NOT NULL REFERENCES hardware_items(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    nights_count INTEGER NOT NULL DEFAULT 1 CHECK (nights_count > 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_guests_session_id ON guests(session_id);
CREATE INDEX idx_consumption_guest_id ON consumption(guest_id);
CREATE INDEX idx_consumption_session_id ON consumption(session_id);
CREATE INDEX idx_products_is_available ON products(is_available);
CREATE INDEX idx_sessions_is_active ON sessions(is_active);
CREATE INDEX idx_hardware_items_type ON hardware_items(type);
CREATE INDEX idx_hardware_items_category ON hardware_items(category);
CREATE INDEX idx_hardware_items_available ON hardware_items(is_available);
CREATE INDEX idx_hardware_reservations_guest ON hardware_reservations(guest_id);
CREATE INDEX idx_hardware_reservations_session ON hardware_reservations(session_id);
CREATE INDEX idx_hardware_reservations_item ON hardware_reservations(hardware_item_id);

-- =============================================
-- CONSTRAINTS
-- =============================================

-- Ensure only one active session at a time
CREATE UNIQUE INDEX unique_active_session ON sessions(is_active) WHERE is_active = true;

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for products table
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for hardware_items table
CREATE TRIGGER update_hardware_items_updated_at
    BEFORE UPDATE ON hardware_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for hardware_reservations table
CREATE TRIGGER update_hardware_reservations_updated_at
    BEFORE UPDATE ON hardware_reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to ensure only one active session
CREATE OR REPLACE FUNCTION ensure_single_active_session()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true THEN
        UPDATE sessions SET is_active = false WHERE id != NEW.id AND is_active = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for sessions table
CREATE TRIGGER ensure_single_active_session_trigger
    BEFORE INSERT OR UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_active_session();