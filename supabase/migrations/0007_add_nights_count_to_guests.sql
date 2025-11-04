-- Add nights_count column to guests table
-- This tracks how many nights a guest is staying

ALTER TABLE guests 
ADD COLUMN IF NOT EXISTS nights_count INTEGER NOT NULL DEFAULT 1 CHECK (nights_count > 0);
