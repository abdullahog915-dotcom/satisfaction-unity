-- ============================================================
-- MIGRATION: Create products table
-- Description: Main products table with all product information
-- ============================================================

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  description TEXT,
  material TEXT,
  in_stock BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  featured BOOLEAN DEFAULT false,
  meta_title TEXT,
  meta_description TEXT,
  image_alt TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_featured ON products(featured) WHERE featured = true;
CREATE INDEX idx_products_in_stock ON products(in_stock) WHERE in_stock = true;

-- Create updated_at trigger
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE products IS 'Main products catalog';
COMMENT ON COLUMN products.slug IS 'URL-friendly unique identifier (e.g., lamp-01)';
COMMENT ON COLUMN products.price IS 'Price in INR (rupees)';
COMMENT ON COLUMN products.material IS 'Product material (metal, brass, glass, etc.)';
