-- Migration: Auto-add products to new sessions
-- This migration creates a trigger that automatically adds all available products to new sessions

-- =============================================
-- FUNCTION: Auto-add products to new session
-- =============================================

CREATE OR REPLACE FUNCTION auto_add_products_to_session()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert all available products into session_stock for the new session
    INSERT INTO session_stock (session_id, product_id, initial_quantity, consumed_quantity)
    SELECT NEW.id, p.id, 0, 0
    FROM products p
    WHERE p.is_available = true
    ON CONFLICT (session_id, product_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGER: Auto-add products on session creation
-- =============================================

CREATE TRIGGER trigger_auto_add_products_to_session
    AFTER INSERT ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION auto_add_products_to_session();

-- =============================================
-- FUNCTION: Sync products to all sessions
-- =============================================

CREATE OR REPLACE FUNCTION sync_products_to_all_sessions()
RETURNS TABLE(synced_count INT) AS $$
DECLARE
    v_synced_count INT;
BEGIN
    -- Insert missing products to all existing sessions
    INSERT INTO session_stock (session_id, product_id, initial_quantity, consumed_quantity)
    SELECT DISTINCT s.id, p.id, 0, 0
    FROM sessions s
    CROSS JOIN products p
    WHERE p.is_available = true
        AND NOT EXISTS (
            SELECT 1 FROM session_stock ss 
            WHERE ss.session_id = s.id 
            AND ss.product_id = p.id
        )
    ON CONFLICT (session_id, product_id) DO NOTHING;
    
    -- Get count of affected rows
    GET DIAGNOSTICS v_synced_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_synced_count AS synced_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- AUTO-ADD PRODUCTS TO EXISTING SESSIONS
-- =============================================

-- This will add missing products to existing sessions
SELECT sync_products_to_all_sessions();

COMMENT ON FUNCTION auto_add_products_to_session IS 'Automatically adds all available products to a new session when it is created';
COMMENT ON FUNCTION sync_products_to_all_sessions IS 'Synchronizes all available products to all existing sessions';
