-- ============================================================
-- MIGRATION: Create banners table
-- Description: Homepage hero slider banners (images/videos)
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

-- Create indexes
CREATE INDEX idx_banners_status_order ON banners(status, sort_order);
CREATE INDEX idx_banners_active ON banners(status) WHERE status = 'active';

-- Create updated_at trigger
CREATE TRIGGER update_banners_updated_at
  BEFORE UPDATE ON banners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE banners IS 'Homepage hero slider banners';
COMMENT ON COLUMN banners.type IS 'Banner type: image or video';
COMMENT ON COLUMN banners.sort_order IS 'Display order (lower = first)';
