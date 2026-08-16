-- ============================================================
-- MIGRATION: Create admins table
-- Description: Admin users for CMS access
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

-- Create indexes
CREATE INDEX idx_admins_email ON admins(email);
CREATE INDEX idx_admins_status ON admins(status);

COMMENT ON TABLE admins IS 'Admin users with CMS access';
COMMENT ON COLUMN admins.id IS 'References auth.users(id) from Supabase Auth';
COMMENT ON COLUMN admins.role IS 'Admin role: admin or super_admin';
