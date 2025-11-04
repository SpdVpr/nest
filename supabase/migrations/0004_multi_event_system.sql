-- Migration: Multi-Event System with Per-Event Inventory
-- This migration enables multiple simultaneous events with individual inventory tracking

-- =============================================
-- 1. MODIFY SESSIONS TABLE
-- =============================================

-- Add slug column for URL-friendly event identifiers
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS slug TEXT;

-- Add status column for event lifecycle management
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'upcoming' 
  CHECK (status IN ('draft', 'upcoming', 'active', 'completed', 'cancelled'));

-- Add description for event details
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS description TEXT;

-- Create unique index on slug (only for non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_slug ON sessions(slug) WHERE slug IS NOT NULL;

-- Remove the constraint that only allows one active session
DROP INDEX IF EXISTS unique_active_session;

-- Drop the trigger that enforced single active session
DROP TRIGGER IF EXISTS ensure_single_active_session_trigger ON sessions;
DROP FUNCTION IF EXISTS ensure_single_active_session();

-- =============================================
-- 2. CREATE SESSION_STOCK TABLE
-- =============================================

-- This table tracks inventory for each product in each session
CREATE TABLE IF NOT EXISTS session_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    initial_quantity INTEGER NOT NULL DEFAULT 0 CHECK (initial_quantity >= 0),
    consumed_quantity INTEGER NOT NULL DEFAULT 0 CHECK (consumed_quantity >= 0),
    remaining_quantity INTEGER GENERATED ALWAYS AS (initial_quantity - consumed_quantity) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, product_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_stock_session ON session_stock(session_id);
CREATE INDEX IF NOT EXISTS idx_session_stock_product ON session_stock(product_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- =============================================
-- 3. TRIGGERS FOR SESSION_STOCK
-- =============================================

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_session_stock_updated_at
    BEFORE UPDATE ON session_stock
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 4. FUNCTION TO UPDATE CONSUMED QUANTITY
-- =============================================

-- Function to automatically update consumed_quantity when consumption is added
CREATE OR REPLACE FUNCTION update_session_stock_on_consumption()
RETURNS TRIGGER AS $$
BEGIN
    -- Update consumed quantity in session_stock
    UPDATE session_stock
    SET consumed_quantity = consumed_quantity + NEW.quantity
    WHERE session_id = NEW.session_id AND product_id = NEW.product_id;
    
    -- If no stock record exists, create one (with warning)
    IF NOT FOUND THEN
        INSERT INTO session_stock (session_id, product_id, initial_quantity, consumed_quantity)
        VALUES (NEW.session_id, NEW.product_id, 0, NEW.quantity);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on consumption INSERT
CREATE TRIGGER trigger_update_stock_on_consumption
    AFTER INSERT ON consumption
    FOR EACH ROW
    EXECUTE FUNCTION update_session_stock_on_consumption();

-- =============================================
-- 5. FUNCTION TO HANDLE CONSUMPTION DELETION
-- =============================================

-- Function to decrease consumed_quantity when consumption is deleted
CREATE OR REPLACE FUNCTION update_session_stock_on_consumption_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Decrease consumed quantity
    UPDATE session_stock
    SET consumed_quantity = GREATEST(0, consumed_quantity - OLD.quantity)
    WHERE session_id = OLD.session_id AND product_id = OLD.product_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger on consumption DELETE
CREATE TRIGGER trigger_update_stock_on_consumption_delete
    AFTER DELETE ON consumption
    FOR EACH ROW
    EXECUTE FUNCTION update_session_stock_on_consumption_delete();

-- =============================================
-- 6. HELPER FUNCTION: GENERATE SLUG FROM NAME
-- =============================================

CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
    slug TEXT;
    counter INTEGER := 0;
    temp_slug TEXT;
BEGIN
    -- Convert to lowercase, replace spaces and special chars with hyphens
    slug := lower(regexp_replace(input_text, '[^a-z0-9]+', '-', 'gi'));
    -- Remove leading/trailing hyphens
    slug := regexp_replace(slug, '^-+|-+$', '', 'g');
    -- Limit length
    slug := substring(slug from 1 for 50);
    
    temp_slug := slug;
    
    -- Check for uniqueness and add counter if needed
    WHILE EXISTS (SELECT 1 FROM sessions WHERE sessions.slug = temp_slug) LOOP
        counter := counter + 1;
        temp_slug := slug || '-' || counter;
    END LOOP;
    
    RETURN temp_slug;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 7. AUTO-GENERATE SLUG FOR EXISTING SESSIONS
-- =============================================

-- Update existing sessions to have slugs
UPDATE sessions 
SET slug = generate_slug(name || '-' || to_char(start_date, 'YYYY-MM-DD'))
WHERE slug IS NULL;

-- Make slug NOT NULL now that all sessions have one
ALTER TABLE sessions ALTER COLUMN slug SET NOT NULL;

-- =============================================
-- 8. COMMENTS FOR DOCUMENTATION
-- =============================================

COMMENT ON TABLE session_stock IS 'Per-event inventory tracking for products';
COMMENT ON COLUMN session_stock.initial_quantity IS 'Initial stock quantity set by admin for this event';
COMMENT ON COLUMN session_stock.consumed_quantity IS 'Total quantity consumed by guests';
COMMENT ON COLUMN session_stock.remaining_quantity IS 'Calculated: initial_quantity - consumed_quantity';
COMMENT ON COLUMN sessions.slug IS 'URL-friendly identifier for the event (e.g., christmas-lan-2024)';
COMMENT ON COLUMN sessions.status IS 'Event lifecycle: draft, upcoming, active, completed, cancelled';