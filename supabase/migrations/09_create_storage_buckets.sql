-- ============================================================
-- MIGRATION: Storage Buckets and Policies
-- Description: Create storage buckets for product images and banners
-- Note: This SQL creates the bucket configuration.
--       Actual bucket creation may need to be done via Supabase Dashboard
--       or Supabase CLI if not supported via SQL.
-- ============================================================

-- Create storage buckets via INSERT into storage.buckets
-- (This works if storage schema is accessible, otherwise use Dashboard)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'product-images',
    'product-images',
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  ),
  (
    'banner-media',
    'banner-media',
    true,
    20971520, -- 20MB limit for videos
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4']
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE POLICIES: product-images bucket
-- ============================================================

-- Public: Read all product images
CREATE POLICY "Public can view product images"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'product-images');

-- Admin: Upload product images
CREATE POLICY "Admins can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.status = 'active'
    )
  );

-- Admin: Update product images
CREATE POLICY "Admins can update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.status = 'active'
    )
  );

-- Admin: Delete product images
CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.status = 'active'
    )
  );

-- ============================================================
-- STORAGE POLICIES: banner-media bucket
-- ============================================================

-- Public: Read all banner media
CREATE POLICY "Public can view banner media"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'banner-media');

-- Admin: Upload banner media
CREATE POLICY "Admins can upload banner media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'banner-media'
    AND EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.status = 'active'
    )
  );

-- Admin: Update banner media
CREATE POLICY "Admins can update banner media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'banner-media'
    AND EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.status = 'active'
    )
  );

-- Admin: Delete banner media
CREATE POLICY "Admins can delete banner media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'banner-media'
    AND EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.status = 'active'
    )
  );
