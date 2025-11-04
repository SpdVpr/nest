-- Add check-in and check-out date columns to guests table
-- This tracks the specific dates when guests arrive and depart

ALTER TABLE guests 
ADD COLUMN IF NOT EXISTS check_in_date DATE,
ADD COLUMN IF NOT EXISTS check_out_date DATE;
