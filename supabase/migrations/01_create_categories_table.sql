-- ============================================================
-- MIGRATION: Create categories table
-- Description: Product categories (Table Lamps, Vases, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for frequently queried fields
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_status ON categories(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default categories based on existing data
INSERT INTO categories (name, slug, status, sort_order) VALUES
  ('Table Lamps', 'table-lamps', 'active', 1),
  ('Vases', 'vases', 'active', 2)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE categories IS 'Product categories for e-commerce site';
