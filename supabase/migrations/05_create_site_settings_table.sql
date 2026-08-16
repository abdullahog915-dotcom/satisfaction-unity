-- ============================================================
-- MIGRATION: Create site_settings table
-- Description: Site-wide settings (contact info, business details)
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

-- Create indexes
CREATE INDEX idx_settings_key ON site_settings(key);
CREATE INDEX idx_settings_category ON site_settings(category);

-- Create updated_at trigger
CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON site_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings from settings.json
INSERT INTO site_settings (key, value, category, description) VALUES
  ('business_name', 'Satisfaction Unity', 'contact', 'Business name'),
  ('address', '112, Ka Lal Bagh, Mufti Tola, Moradabad - 244001, UP, India', 'contact', 'Business address'),
  ('phone', '+91 90452 53529', 'contact', 'Contact phone number'),
  ('whatsapp', '919045253529', 'contact', 'WhatsApp number (without +)'),
  ('email', 'info@satisfactionunity.com', 'contact', 'Contact email')
ON CONFLICT (key) DO NOTHING;

COMMENT ON TABLE site_settings IS 'Site-wide configuration settings';
COMMENT ON COLUMN site_settings.key IS 'Unique setting key (e.g., business_name)';
COMMENT ON COLUMN site_settings.category IS 'Setting category for organization';
