-- Migration: Fix sync_products_to_all_sessions RPC function
-- This migration fixes the return type mapping issue in the sync_products_to_all_sessions function

-- =============================================
-- FIX: Correct RETURN QUERY column naming
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

COMMENT ON FUNCTION sync_products_to_all_sessions IS 'Synchronizes all available products to all existing sessions, returns the count of newly synced products';
