-- Add purchase_price field to products table
-- price field will remain as the selling price
-- purchase_price is optional and can be used to calculate profit margins

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(10,2) CHECK (purchase_price >= 0);

COMMENT ON COLUMN products.price IS 'Prodejní cena (selling price)';
COMMENT ON COLUMN products.purchase_price IS 'Nákupní cena (purchase price) - volitelné';