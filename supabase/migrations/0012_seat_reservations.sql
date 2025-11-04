-- Seat Reservations System
-- Migration to add seat reservation functionality

-- Create seat_reservations table
CREATE TABLE IF NOT EXISTS seat_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seat_id TEXT NOT NULL,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    guest_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(seat_id, session_id)
);

-- Create indexes for better performance
CREATE INDEX idx_seat_reservations_session ON seat_reservations(session_id);
CREATE INDEX idx_seat_reservations_guest ON seat_reservations(guest_id);
CREATE INDEX idx_seat_reservations_seat ON seat_reservations(seat_id);

-- Add comments
COMMENT ON TABLE seat_reservations IS 'Rezervace míst k sezení pro jednotlivé eventy';
COMMENT ON COLUMN seat_reservations.seat_id IS 'ID místa (např. A1, B2, C3, atd.)';
COMMENT ON COLUMN seat_reservations.guest_name IS 'Jméno hosta pro rychlé zobrazení';

