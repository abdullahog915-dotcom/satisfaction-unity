-- ============================================================
-- MIGRATION: Create seo_pages table
-- Description: SEO metadata for site pages
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

-- Create indexes
CREATE INDEX idx_seo_page_slug ON seo_pages(page_slug);

-- Create updated_at trigger
CREATE TRIGGER update_seo_pages_updated_at
  BEFORE UPDATE ON seo_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default SEO data from seo.json
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

COMMENT ON TABLE seo_pages IS 'SEO metadata for website pages';
COMMENT ON COLUMN seo_pages.page_slug IS 'Page identifier (home, products, about, contact)';
COMMENT ON COLUMN seo_pages.schema_data IS 'Structured data in JSON-LD format';
