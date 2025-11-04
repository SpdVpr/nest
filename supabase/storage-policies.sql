-- Storage Policies for Product Images
-- Run this in Supabase SQL Editor AFTER creating 'product-images' bucket

-- =============================================
-- STORAGE BUCKET SETUP
-- =============================================

-- First, create the bucket in Supabase Dashboard:
-- 1. Go to Storage
-- 2. Create new bucket: "product-images"
-- 3. Set as Public bucket (for reading)

-- =============================================
-- STORAGE POLICIES
-- =============================================

-- Anyone can view/download images (public read)
CREATE POLICY "Public can view product images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'product-images');

-- Only authenticated users can upload images
CREATE POLICY "Authenticated users can upload product images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'product-images' 
        AND auth.role() = 'authenticated'
    );

-- Only authenticated users can update images
CREATE POLICY "Authenticated users can update product images"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'product-images' 
        AND auth.role() = 'authenticated'
    );

-- Only authenticated users can delete images
CREATE POLICY "Authenticated users can delete product images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'product-images' 
        AND auth.role() = 'authenticated'
    );