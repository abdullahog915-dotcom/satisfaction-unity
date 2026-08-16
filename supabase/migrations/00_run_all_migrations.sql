-- ============================================================
-- MASTER MIGRATION SCRIPT
-- Run this in Supabase SQL Editor to set up the entire database
-- ============================================================
-- Project: Satisfaction Unity E-commerce
-- Created: 2026-08-16
-- Description: Complete database setup for Supabase migration
-- ============================================================

-- ============================================================
-- 01: CATEGORIES TABLE
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

CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_status ON categories(status);

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

INSERT INTO categories (name, slug, status, sort_order) VALUES
  ('Table Lamps', 'table-lamps', 'active', 1),
  ('Vases', 'vases', 'active', 2)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 02: PRODUCTS TABLE
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

CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_featured ON products(featured) WHERE featured = true;
CREATE INDEX idx_products_in_stock ON products(in_stock) WHERE in_stock = true;

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 03: PRODUCT_IMAGES TABLE
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

CREATE INDEX idx_product_images_product ON product_images(product_id);
CREATE INDEX idx_product_images_primary ON product_images(product_id, is_primary) WHERE is_primary = true;
CREATE UNIQUE INDEX idx_one_primary_per_product ON product_images(product_id) WHERE is_primary = true;

-- ============================================================
-- 04: BANNERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('image', 'video')),
  storage_path TEXT,
  public_url TEXT,
  title TEXT,
  subtitle TEXT,
  cta_text TEXT,
  cta_link TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_banners_status_order ON banners(status, sort_order);
CREATE INDEX idx_banners_active ON banners(status) WHERE status = 'active';

CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 05: SITE_SETTINGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_settings_key ON site_settings(key);
CREATE INDEX idx_settings_category ON site_settings(category);

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

INSERT INTO site_settings (key, value, category, description) VALUES
  ('business_name', 'Satisfaction Unity', 'contact', 'Business name'),
  ('address', '112, Ka Lal Bagh, Mufti Tola, Moradabad - 244001, UP, India', 'contact', 'Business address'),
  ('phone', '+91 90452 53529', 'contact', 'Contact phone number'),
  ('whatsapp', '919045253529', 'contact', 'WhatsApp number (without +)'),
  ('email', 'info@satisfactionunity.com', 'contact', 'Contact email')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 06: SEO_PAGES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS seo_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug TEXT UNIQUE NOT NULL,
  meta_title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  og_image_url TEXT,
  canonical_url TEXT,
  schema_type TEXT,
  schema_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seo_page_slug ON seo_pages(page_slug);

CREATE TRIGGER update_seo_pages_updated_at
  BEFORE UPDATE ON seo_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

INSERT INTO seo_pages (page_slug, meta_title, meta_description, schema_type, schema_data) VALUES
  (
    'home',
    'Handcrafted Brass & Mosaic Glass Lamps | Satisfaction Unity',
    'Wholesale handcrafted brass, mosaic glass & mother of pearl table lamps from Moradabad, India. Bulk orders welcome, export quality. Enquire on WhatsApp today.',
    'HomeGoodsStore',
    '{"@context": "https://schema.org", "@type": "HomeGoodsStore", "name": "Satisfaction Unity"}'::jsonb
  ),
  (
    'products',
    'Shop Handcrafted Lamps & Vases | Satisfaction Unity',
    'Browse our collection of handcrafted brass, mosaic glass, and mother of pearl table lamps and vases. Wholesale and export pricing available.',
    'CollectionPage',
    NULL
  ),
  (
    'about',
    'About Us | Satisfaction Unity — Moradabad Handicraft Manufacturers',
    'Learn about Satisfaction Unity''s heritage craftsmanship in handmade brass, aluminium, and iron decor from Moradabad, India.',
    'AboutPage',
    NULL
  ),
  (
    'contact',
    'Contact Us | Satisfaction Unity',
    'Get in touch with Satisfaction Unity for wholesale enquiries, bulk orders, and export requests. WhatsApp, call, or email us.',
    'ContactPage',
    NULL
  )
ON CONFLICT (page_slug) DO NOTHING;

-- ============================================================
-- 07: ADMINS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_status ON admins(status);

-- ============================================================
-- 08: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Public can view active categories"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

CREATE POLICY "Admins can manage categories"
  ON categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.status = 'active'
    )
  );

-- Products policies
CREATE POLICY "Public can view published products"
  ON products FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.status = 'active'
    )
  );

-- Product images policies
CREATE POLICY "Public can view product images"
  ON product_images FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND products.status = 'published'
    )
  );

CREATE POLICY "Admins can manage product images"
  ON product_images FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.status = 'active'
    )
  );

-- Banners policies
CREATE POLICY "Public can view active banners"
  ON banners FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

CREATE POLICY "Admins can manage banners"
  ON banners FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.status = 'active'
    )
  );

-- Site settings policies
CREATE POLICY "Public can view site settings"
  ON site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage site settings"
  ON site_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.status = 'active'
    )
  );

-- SEO pages policies
CREATE POLICY "Public can view SEO pages"
  ON seo_pages FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage SEO pages"
  ON seo_pages FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.status = 'active'
    )
  );

-- Admins policies
CREATE POLICY "Users can view own admin record"
  ON admins FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Super admins can manage admins"
  ON admins FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins
      WHERE admins.id = auth.uid()
      AND admins.role = 'super_admin'
      AND admins.status = 'active'
    )
  );

-- ============================================================
-- MIGRATION COMPLETE
-- ============================================================

-- Verify tables were created
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'categories',
    'products',
    'product_images',
    'banners',
    'site_settings',
    'seo_pages',
    'admins'
  )
ORDER BY tablename;
