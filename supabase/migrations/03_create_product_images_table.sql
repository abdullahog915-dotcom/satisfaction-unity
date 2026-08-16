-- ============================================================
-- MIGRATION: Create product_images table
-- Description: Product images stored in Supabase Storage
-- ============================================================

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_images_primary ON product_images(product_id, is_primary) WHERE is_primary = true;

-- Ensure only one primary image per product
CREATE UNIQUE INDEX idx_one_primary_per_product ON product_images(product_id) WHERE is_primary = true;

COMMENT ON TABLE product_images IS 'Product image gallery';
COMMENT ON COLUMN product_images.storage_path IS 'Path in Supabase Storage bucket';
COMMENT ON COLUMN product_images.public_url IS 'Full public URL for image';
COMMENT ON COLUMN product_images.is_primary IS 'Primary image shown in product cards';
