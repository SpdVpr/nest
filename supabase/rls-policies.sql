-- Row Level Security Policies for The Nest
-- Run this AFTER creating tables (schema.sql)

-- =============================================
-- ENABLE RLS
-- =============================================

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption ENABLE ROW LEVEL SECURITY;

-- =============================================
-- SESSIONS TABLE POLICIES
-- =============================================

-- Everyone can read active sessions
CREATE POLICY "Anyone can view active sessions"
    ON sessions FOR SELECT
    USING (is_active = true);

-- Only authenticated users (admin) can insert sessions
CREATE POLICY "Authenticated users can insert sessions"
    ON sessions FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Only authenticated users (admin) can update sessions
CREATE POLICY "Authenticated users can update sessions"
    ON sessions FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Only authenticated users (admin) can delete sessions
CREATE POLICY "Authenticated users can delete sessions"
    ON sessions FOR DELETE
    USING (auth.role() = 'authenticated');

-- =============================================
-- GUESTS TABLE POLICIES
-- =============================================

-- Everyone can view guests from active sessions
CREATE POLICY "Anyone can view guests from active sessions"
    ON guests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = guests.session_id 
            AND sessions.is_active = true
        )
    );

-- Everyone can create new guests
CREATE POLICY "Anyone can create guests"
    ON guests FOR INSERT
    WITH CHECK (true);

-- Only authenticated users (admin) can update guests
CREATE POLICY "Authenticated users can update guests"
    ON guests FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Only authenticated users (admin) can delete guests
CREATE POLICY "Authenticated users can delete guests"
    ON guests FOR DELETE
    USING (auth.role() = 'authenticated');

-- =============================================
-- PRODUCTS TABLE POLICIES
-- =============================================

-- Everyone can view available products
CREATE POLICY "Anyone can view available products"
    ON products FOR SELECT
    USING (is_available = true OR auth.role() = 'authenticated');

-- Only authenticated users (admin) can insert products
CREATE POLICY "Authenticated users can insert products"
    ON products FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Only authenticated users (admin) can update products
CREATE POLICY "Authenticated users can update products"
    ON products FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Only authenticated users (admin) can delete products
CREATE POLICY "Authenticated users can delete products"
    ON products FOR DELETE
    USING (auth.role() = 'authenticated');

-- =============================================
-- CONSUMPTION TABLE POLICIES
-- =============================================

-- Everyone can view consumption records
CREATE POLICY "Anyone can view consumption records"
    ON consumption FOR SELECT
    USING (true);

-- Everyone can add consumption records
CREATE POLICY "Anyone can add consumption records"
    ON consumption FOR INSERT
    WITH CHECK (true);

-- Only authenticated users (admin) can update consumption
CREATE POLICY "Authenticated users can update consumption"
    ON consumption FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Only authenticated users (admin) can delete consumption
CREATE POLICY "Authenticated users can delete consumption"
    ON consumption FOR DELETE
    USING (auth.role() = 'authenticated');

-- =============================================
-- HARDWARE ITEMS TABLE POLICIES
-- =============================================

-- Enable RLS on hardware_items
ALTER TABLE hardware_items ENABLE ROW LEVEL SECURITY;

-- Everyone can view all hardware items
CREATE POLICY "Anyone can view hardware items"
    ON hardware_items FOR SELECT
    USING (true);

-- Only authenticated users (admin) can insert hardware items
CREATE POLICY "Authenticated users can insert hardware items"
    ON hardware_items FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Only authenticated users (admin) can update hardware items
CREATE POLICY "Authenticated users can update hardware items"
    ON hardware_items FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Only authenticated users (admin) can delete hardware items
CREATE POLICY "Authenticated users can delete hardware items"
    ON hardware_items FOR DELETE
    USING (auth.role() = 'authenticated');

-- =============================================
-- HARDWARE RESERVATIONS TABLE POLICIES
-- =============================================

-- Enable RLS on hardware_reservations
ALTER TABLE hardware_reservations ENABLE ROW LEVEL SECURITY;

-- Everyone can view hardware reservations
CREATE POLICY "Anyone can view hardware reservations"
    ON hardware_reservations FOR SELECT
    USING (true);

-- Everyone can create hardware reservations
CREATE POLICY "Anyone can create hardware reservations"
    ON hardware_reservations FOR INSERT
    WITH CHECK (true);

-- Only authenticated users (admin) can update hardware reservations
CREATE POLICY "Authenticated users can update hardware reservations"
    ON hardware_reservations FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Only authenticated users (admin) can delete hardware reservations
CREATE POLICY "Authenticated users can delete hardware reservations"
    ON hardware_reservations FOR DELETE
    USING (auth.role() = 'authenticated');