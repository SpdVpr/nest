-- =============================================
-- Hardware Reservation System
-- Migration 0003
-- =============================================

-- Hardware Items Table
CREATE TABLE IF NOT EXISTS hardware_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('monitor', 'pc')),
    category TEXT NOT NULL, -- '200', '100', '250' (price per night)
    price_per_night DECIMAL(10,2) NOT NULL CHECK (price_per_night > 0),
    specs JSONB, -- Specifications: resolution, diagonal, hz, cpu, ram, gpu
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hardware Reservations Table
CREATE TABLE IF NOT EXISTS hardware_reservations (
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_hardware_items_type ON hardware_items(type);
CREATE INDEX IF NOT EXISTS idx_hardware_items_category ON hardware_items(category);
CREATE INDEX IF NOT EXISTS idx_hardware_items_available ON hardware_items(is_available);
CREATE INDEX IF NOT EXISTS idx_hardware_reservations_guest ON hardware_reservations(guest_id);
CREATE INDEX IF NOT EXISTS idx_hardware_reservations_session ON hardware_reservations(session_id);
CREATE INDEX IF NOT EXISTS idx_hardware_reservations_item ON hardware_reservations(hardware_item_id);

-- Trigger for hardware_items updated_at
CREATE TRIGGER update_hardware_items_updated_at
    BEFORE UPDATE ON hardware_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for hardware_reservations updated_at
CREATE TRIGGER update_hardware_reservations_updated_at
    BEFORE UPDATE ON hardware_reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE hardware_items IS 'Seznam všech dostupných kusů hardware (monitory, PC)';
COMMENT ON TABLE hardware_reservations IS 'Rezervace hardware pro hosty';
COMMENT ON COLUMN hardware_items.category IS 'Cenová kategorie: 200, 100, nebo 250 (Kč za noc)';
COMMENT ON COLUMN hardware_items.specs IS 'JSON specifikace: {resolution, diagonal, hz, cpu, ram, gpu}';
COMMENT ON COLUMN hardware_reservations.nights_count IS 'Počet nocí rezervace';

-- =============================================
-- Insert Hardware Data
-- =============================================

-- Monitory 200 Kč (15 ks)
INSERT INTO hardware_items (name, type, category, price_per_night, specs) VALUES
('MAG 271QPX QD-OLED E2 #1', 'monitor', '200', 200.00, '{"resolution": "QHD", "diagonal": "27", "hz": "240"}'),
('MAG 271QPX QD-OLED E2 #2', 'monitor', '200', 200.00, '{"resolution": "QHD", "diagonal": "27", "hz": "240"}'),
('MAG 271QPX QD-OLED E2 #3', 'monitor', '200', 200.00, '{"resolution": "QHD", "diagonal": "27", "hz": "240"}'),
('MAG 271QPX QD-OLED E2 #4', 'monitor', '200', 200.00, '{"resolution": "QHD", "diagonal": "27", "hz": "240"}'),
('MAG 271QPX QD-OLED E2 #5', 'monitor', '200', 200.00, '{"resolution": "QHD", "diagonal": "27", "hz": "240"}'),
('MAG274QRX #1', 'monitor', '200', 200.00, '{"resolution": "WQHD", "diagonal": "27", "hz": "240"}'),
('MAG274QRX #2', 'monitor', '200', 200.00, '{"resolution": "WQHD", "diagonal": "27", "hz": "240"}'),
('MAG274QRX #3', 'monitor', '200', 200.00, '{"resolution": "WQHD", "diagonal": "27", "hz": "240"}'),
('MAG274QRX #4', 'monitor', '200', 200.00, '{"resolution": "WQHD", "diagonal": "27", "hz": "240"}'),
('Optix MPG341QR #1', 'monitor', '200', 200.00, '{"resolution": "Ultra Wide QHD", "diagonal": "34", "hz": "144"}'),
('Optix MPG341QR #2', 'monitor', '200', 200.00, '{"resolution": "Ultra Wide QHD", "diagonal": "34", "hz": "144"}'),
('Optix MPG341QR #3', 'monitor', '200', 200.00, '{"resolution": "Ultra Wide QHD", "diagonal": "34", "hz": "144"}'),
('Optix MPG341QR #4', 'monitor', '200', 200.00, '{"resolution": "Ultra Wide QHD", "diagonal": "34", "hz": "144"}'),
('Optix MPG341QR #5', 'monitor', '200', 200.00, '{"resolution": "Ultra Wide QHD", "diagonal": "34", "hz": "144"}');

-- Monitory 100 Kč (18 ks)
INSERT INTO hardware_items (name, type, category, price_per_night, specs) VALUES
('MAG274QRF #1', 'monitor', '100', 100.00, '{"resolution": "WQHD", "diagonal": "27", "hz": "165"}'),
('MAG274QRF #2', 'monitor', '100', 100.00, '{"resolution": "WQHD", "diagonal": "27", "hz": "165"}'),
('MAG274QRF #3', 'monitor', '100', 100.00, '{"resolution": "WQHD", "diagonal": "27", "hz": "165"}'),
('MAG274QRF #4', 'monitor', '100', 100.00, '{"resolution": "WQHD", "diagonal": "27", "hz": "165"}'),
('MAG274QRF #5', 'monitor', '100', 100.00, '{"resolution": "WQHD", "diagonal": "27", "hz": "165"}'),
('MAG274QRF-QD #1', 'monitor', '100', 100.00, '{"resolution": "WQHD", "diagonal": "27", "hz": "165"}'),
('MAG274QRF-QD #2', 'monitor', '100', 100.00, '{"resolution": "WQHD", "diagonal": "27", "hz": "165"}'),
('MAG274QRF-QD #3', 'monitor', '100', 100.00, '{"resolution": "WQHD", "diagonal": "27", "hz": "165"}'),
('MAG274QRF-QD #4', 'monitor', '100', 100.00, '{"resolution": "WQHD", "diagonal": "27", "hz": "165"}'),
('MAG274QRF-QD #5', 'monitor', '100', 100.00, '{"resolution": "WQHD", "diagonal": "27", "hz": "165"}'),
('MAG272QP #1', 'monitor', '100', 100.00, '{"resolution": "WQHD", "diagonal": "27", "hz": "165"}'),
('MAG272QP #2', 'monitor', '100', 100.00, '{"resolution": "WQHD", "diagonal": "27", "hz": "165"}'),
('MAG272QP #3', 'monitor', '100', 100.00, '{"resolution": "WQHD", "diagonal": "27", "hz": "165"}'),
('MAG272QP #4', 'monitor', '100', 100.00, '{"resolution": "WQHD", "diagonal": "27", "hz": "165"}'),
('Optix G251PF #1', 'monitor', '100', 100.00, '{"resolution": "Full HD", "diagonal": "24", "hz": "165"}'),
('Optix G251PF #2', 'monitor', '100', 100.00, '{"resolution": "Full HD", "diagonal": "24", "hz": "165"}'),
('Optix G251PF #3', 'monitor', '100', 100.00, '{"resolution": "Full HD", "diagonal": "24", "hz": "165"}'),
('Optix G251PF #4', 'monitor', '100', 100.00, '{"resolution": "Full HD", "diagonal": "24", "hz": "165"}');

-- PC 250 Kč (11 ks)
INSERT INTO hardware_items (name, type, category, price_per_night, specs) VALUES
('MSI MAG Infinite S3 #1', 'pc', '250', 250.00, '{"cpu": "Intel Core i5 14400F", "ram": "32 GB", "gpu": "RTX 5070 12GB"}'),
('MSI MAG Infinite S3 #2', 'pc', '250', 250.00, '{"cpu": "Intel Core i5 14400F", "ram": "32 GB", "gpu": "RTX 5070 12GB"}'),
('MSI MAG Infinite S3 #3', 'pc', '250', 250.00, '{"cpu": "Intel Core i5 14400F", "ram": "32 GB", "gpu": "RTX 5070 12GB"}'),
('MSI MAG Infinite S3 #4', 'pc', '250', 250.00, '{"cpu": "Intel Core i5 14400F", "ram": "32 GB", "gpu": "RTX 5070 12GB"}'),
('MSI MAG Infinite S3 #5', 'pc', '250', 250.00, '{"cpu": "Intel Core i5 14400F", "ram": "32 GB", "gpu": "RTX 5070 12GB"}'),
('MSI MAG Infinite S3 #6', 'pc', '250', 250.00, '{"cpu": "Intel Core i5 14400F", "ram": "32 GB", "gpu": "RTX 5070 12GB"}'),
('MSI MAG Infinite S3 #7', 'pc', '250', 250.00, '{"cpu": "Intel Core i5 14400F", "ram": "32 GB", "gpu": "RTX 5070 12GB"}'),
('MSI MAG Infinite S3 #8', 'pc', '250', 250.00, '{"cpu": "Intel Core i5 14400F", "ram": "32 GB", "gpu": "RTX 5070 12GB"}'),
('MSI MAG Infinite S3 #9', 'pc', '250', 250.00, '{"cpu": "Intel Core i5 14400F", "ram": "32 GB", "gpu": "RTX 5070 12GB"}'),
('MSI MAG Infinite S3 #10', 'pc', '250', 250.00, '{"cpu": "Intel Core i5 14400F", "ram": "32 GB", "gpu": "RTX 5070 12GB"}'),
('MSI MAG Infinite S3 #11', 'pc', '250', 250.00, '{"cpu": "Intel Core i5 14400F", "ram": "32 GB", "gpu": "RTX 5070 12GB"}');