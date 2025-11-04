-- Populate check_in_date and check_out_date for existing guests
-- This sets the dates based on the session dates and nights_count

-- Update guests that don't have check-in/check-out dates
-- Set check_in_date to session start_date
-- Set check_out_date to check_in_date + nights_count days
UPDATE guests
SET 
  check_in_date = sessions.start_date::date,
  check_out_date = (sessions.start_date::date + (guests.nights_count || ' days')::interval)::date
FROM sessions
WHERE guests.session_id = sessions.id
  AND (guests.check_in_date IS NULL OR guests.check_out_date IS NULL);

COMMENT ON COLUMN guests.check_in_date IS 'Date when guest arrives at the event';
COMMENT ON COLUMN guests.check_out_date IS 'Date when guest departs from the event';

