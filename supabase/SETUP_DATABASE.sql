-- =====================================================
-- KOMPLETNÍ SETUP DATABÁZE PRO THE NEST
-- =====================================================
-- Spusť tento SQL v Supabase SQL Editoru
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (POZOR: smaže všechna data!)
-- Odkomentuj následující řádky pouze pokud chceš začít od začátku
-- DROP TABLE IF EXISTS hardware_reservations CASCADE;
-- DROP TABLE IF EXISTS hardware_items CASCADE;
-- DROP TABLE IF EXISTS consumption CASCADE;
-- DROP TABLE IF EXISTS session_stock CASCADE;
-- DROP TABLE IF EXISTS products CASCADE;
-- DROP TABLE IF EXISTS guests CASCADE;
-- DROP TABLE IF EXISTS sessions CASCADE;

-- Sessions table (Events/LAN parties)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    price_per_night DECIMAL(10,2) DEFAULT 0 CHECK (price_per_night >= 0)
);

-- Guests table
CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    nights_count INTEGER NOT NULL DEFAULT 1 CHECK (nights_count > 0),
    check_in_date DATE,
    check_out_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Products table (Food & Drinks)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session Stock table (Product availability per session)
CREATE TABLE IF NOT EXISTS session_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    initial_quantity INTEGER NOT NULL DEFAULT 0 CHECK (initial_quantity >= 0),
    current_quantity INTEGER NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, product_id)
);

-- Consumption table (Guest consumption tracking)
CREATE TABLE IF NOT EXISTS consumption (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    consumed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hardware Items table
CREATE TABLE IF NOT EXISTS hardware_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('monitor', 'pc')),
    category TEXT,
    price_per_night DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (price_per_night >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hardware Reservations table
CREATE TABLE IF NOT EXISTS hardware_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    hardware_item_id UUID NOT NULL REFERENCES hardware_items(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    nights_count INTEGER NOT NULL DEFAULT 1 CHECK (nights_count > 0),
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_price >= 0),
    status TEXT DEFAULT 'reserved' CHECK (status IN ('reserved', 'confirmed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_guests_session_id ON guests(session_id);
CREATE INDEX IF NOT EXISTS idx_guests_is_active ON guests(is_active);
CREATE INDEX IF NOT EXISTS idx_consumption_guest_id ON consumption(guest_id);
CREATE INDEX IF NOT EXISTS idx_consumption_product_id ON consumption(product_id);
CREATE INDEX IF NOT EXISTS idx_session_stock_session_id ON session_stock(session_id);
CREATE INDEX IF NOT EXISTS idx_session_stock_product_id ON session_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_hardware_reservations_guest_id ON hardware_reservations(guest_id);
CREATE INDEX IF NOT EXISTS idx_hardware_reservations_session_id ON hardware_reservations(session_id);

-- Add comments
COMMENT ON TABLE sessions IS 'Events/LAN parties';
COMMENT ON TABLE guests IS 'Registered guests for events';
COMMENT ON TABLE products IS 'Food and drink products';
COMMENT ON TABLE session_stock IS 'Product inventory per event';
COMMENT ON TABLE consumption IS 'Guest consumption tracking';
COMMENT ON TABLE hardware_items IS 'Available hardware for rent';
COMMENT ON TABLE hardware_reservations IS 'Hardware rental reservations';

COMMENT ON COLUMN guests.check_in_date IS 'Date when guest arrives at the event';
COMMENT ON COLUMN guests.check_out_date IS 'Date when guest departs from the event';
COMMENT ON COLUMN sessions.price_per_night IS 'Accommodation price per night for this event';

-- =====================================================
-- HOTOVO! Tabulky jsou vytvořené
-- =====================================================

-- Zkontroluj, jestli všechny tabulky existují:
SELECT 
    schemaname,
    tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

