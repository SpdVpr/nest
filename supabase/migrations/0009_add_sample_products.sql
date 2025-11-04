-- Add sample products (snacks and beverages)
-- This provides default products for events

INSERT INTO products (name, price, category, image_url, is_available) VALUES
-- Snacks
('Chipsy Lay''s', 2.50, 'Snacky', null, true),
('Arašídy sůl pepř', 3.00, 'Snacky', null, true),
('Čokoláda Milka', 2.00, 'Sladkosti', null, true),

-- Non-alcoholic drinks
('Kofola 0,5l', 3.50, 'Nápoje', null, true),
('Sprite 0,5l', 3.00, 'Nápoje', null, true),

-- Alcoholic drinks  
('Pilsner Urquell 0,5l', 5.50, 'Pivo', null, true),
('Becherovka 0,5l', 8.00, 'Ostatní', null, true),
('Víno červené', 10.00, 'Ostatní', null, true),

-- Snacks (continued)
('Popkorn slaný', 1.50, 'Snacky', null, true),
('Tvaroh dezert', 2.50, 'Sladkosti', null, true);
