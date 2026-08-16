# Supabase Database Setup

## Overview

This directory contains SQL migrations to set up the Satisfaction Unity e-commerce database in Supabase.

## Database Schema

### Tables

1. **categories** - Product categories (Table Lamps, Vases)
2. **products** - Main product catalog
3. **product_images** - Product image gallery (linked to Supabase Storage)
4. **banners** - Homepage hero slider content
5. **site_settings** - Site-wide configuration (contact info, business details)
6. **seo_pages** - SEO metadata for each page
7. **admins** - Admin users with CMS access

### Storage Buckets

1. **product-images** - Product photos (public, 5MB limit)
2. **banner-media** - Hero slider images/videos (public, 20MB limit)

## Migration Order

Run migrations in numerical order:

```
01_create_categories_table.sql
02_create_products_table.sql
03_create_product_images_table.sql
04_create_banners_table.sql
05_create_site_settings_table.sql
06_create_seo_pages_table.sql
07_create_admins_table.sql
08_create_rls_policies.sql
09_create_storage_buckets.sql
```

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste each migration file content
4. Execute migrations in order (01 → 09)

### Option 2: Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref rguxjldnoxvwbfsgkazs

# Run migrations
supabase db push
```

## Post-Migration Steps

### 1. Create Storage Buckets (if not auto-created)

If migration 09 doesn't auto-create buckets, manually create them:

**Dashboard → Storage → New Bucket**

- **Bucket Name**: `product-images`
  - Public: Yes
  - File size limit: 5MB
  - Allowed MIME types: image/jpeg, image/png, image/webp

- **Bucket Name**: `banner-media`
  - Public: Yes
  - File size limit: 20MB
  - Allowed MIME types: image/jpeg, image/png, image/webp, video/mp4

### 2. Create First Admin User

**Dashboard → Authentication → Users → Add User**

1. Create a user with email/password
2. Copy the user's UUID
3. Run this SQL in SQL Editor:

```sql
INSERT INTO admins (id, email, full_name, role, status)
VALUES (
  'PASTE-USER-UUID-HERE',
  'admin@satisfactionunity.com',
  'Admin User',
  'super_admin',
  'active'
);
```

### 3. Verify RLS Policies

Run test queries to ensure RLS is working:

```sql
-- Should return active categories (works without auth)
SELECT * FROM categories;

-- Should return published products (works without auth)
SELECT * FROM products WHERE status = 'published';

-- Should fail (requires admin auth)
INSERT INTO products (name, slug) VALUES ('Test', 'test');
```

## Security Notes

- All tables have Row Level Security (RLS) enabled
- Public can read published products, active categories, and active banners
- Only authenticated admins can create/update/delete data
- Storage buckets are public for reading, admin-only for writing
- Never expose the service_role key in frontend code

## Next Steps

After migrations are complete:

1. ✅ Run data migration scripts to import existing JSON data
2. ✅ Upload existing product images to Storage
3. ✅ Test data access with Supabase client
4. ✅ Update frontend to fetch from Supabase
5. ✅ Build admin panel

## Connection Details

- **Project URL**: https://rguxjldnoxvwbfsgkazs.supabase.co
- **Publishable Key**: sb_publishable_qaaeA3Bj3BE_WIugTTsz0A_STsVdfd2

(Never commit service_role key to version control)
