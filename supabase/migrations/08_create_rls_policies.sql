-- ============================================================
-- MIGRATION: Row Level Security (RLS) Policies
-- Description: Security policies for all tables
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CATEGORIES POLICIES
-- ============================================================

-- Public: Read active categories
CREATE POLICY "Public can view active categories"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

-- Admin: Full access
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

-- ============================================================
-- PRODUCTS POLICIES
-- ============================================================

-- Public: Read published products
CREATE POLICY "Public can view published products"
  ON products FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- Admin: Full access
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

-- ============================================================
-- PRODUCT_IMAGES POLICIES
-- ============================================================

-- Public: Read images of published products
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

-- Admin: Full access
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

-- ============================================================
-- BANNERS POLICIES
-- ============================================================

-- Public: Read active banners
CREATE POLICY "Public can view active banners"
  ON banners FOR SELECT
  TO anon, authenticated
  USING (status = 'active');

-- Admin: Full access
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

-- ============================================================
-- SITE_SETTINGS POLICIES
-- ============================================================

-- Public: Read all settings
CREATE POLICY "Public can view site settings"
  ON site_settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin: Full access
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

-- ============================================================
-- SEO_PAGES POLICIES
-- ============================================================

-- Public: Read all SEO pages
CREATE POLICY "Public can view SEO pages"
  ON seo_pages FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin: Full access
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

-- ============================================================
-- ADMINS POLICIES
-- ============================================================

-- Authenticated users can read their own admin record
CREATE POLICY "Users can view own admin record"
  ON admins FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Super admins can manage all admins
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
