-- Add price_per_night column to sessions table
-- This tracks the accommodation cost per night for each event

ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS price_per_night DECIMAL(10,2) DEFAULT 0 CHECK (price_per_night >= 0);

COMMENT ON COLUMN sessions.price_per_night IS 'Accommodation price per night for this event';

