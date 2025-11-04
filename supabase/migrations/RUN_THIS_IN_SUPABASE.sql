-- =====================================================
-- DOPLNĚNÍ DAT PRO STÁVAJÍCÍ HOSTY
-- =====================================================
-- SPUSŤ TENTO SQL AŽ PO VYTVOŘENÍ TABULEK (SETUP_DATABASE.sql)
-- =====================================================

-- 1. Zkontroluj, jestli tabulky existují
SELECT
    tablename
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('sessions', 'guests', 'products', 'consumption', 'hardware_items', 'hardware_reservations')
ORDER BY tablename;

-- 2. Zkontroluj, kolik hostů nemá vyplněná data
SELECT
  COUNT(*) as pocet_hostu_bez_dat,
  (SELECT COUNT(*) FROM guests) as celkem_hostu
FROM guests
WHERE check_in_date IS NULL OR check_out_date IS NULL;

-- 3. Zobraz hosty, kteří nemají vyplněná data
SELECT
  g.name,
  g.nights_count,
  g.check_in_date,
  g.check_out_date,
  s.name as session_name,
  s.start_date,
  s.end_date
FROM guests g
JOIN sessions s ON g.session_id = s.id
WHERE g.check_in_date IS NULL OR g.check_out_date IS NULL;

-- 4. Doplň data pro hosty, kteří je nemají
-- (check_in_date = začátek eventu, check_out_date = začátek + počet nocí)
UPDATE guests
SET
  check_in_date = sessions.start_date::date,
  check_out_date = (sessions.start_date::date + (guests.nights_count || ' days')::interval)::date
FROM sessions
WHERE guests.session_id = sessions.id
  AND (guests.check_in_date IS NULL OR guests.check_out_date IS NULL);

-- 5. Zkontroluj výsledek
SELECT
  g.name,
  g.nights_count,
  g.check_in_date,
  g.check_out_date,
  s.name as session_name
FROM guests g
JOIN sessions s ON g.session_id = s.id
ORDER BY g.name;

