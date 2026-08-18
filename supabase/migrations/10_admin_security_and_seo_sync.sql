-- Harden admin authorization and add independently editable Open Graph fields.
-- Apply once in the Supabase SQL editor before deploying the new admin panel.

ALTER TABLE public.seo_pages
  ADD COLUMN IF NOT EXISTS og_title TEXT,
  ADD COLUMN IF NOT EXISTS og_description TEXT;

-- RLS decides which rows are visible/mutable; table grants allow PostgREST to
-- reach those policies. Anonymous visitors receive read access only.
GRANT SELECT ON public.categories, public.products, public.product_images,
  public.banners, public.site_settings, public.seo_pages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories, public.products,
  public.product_images, public.banners, public.site_settings, public.seo_pages
  TO authenticated;
GRANT SELECT ON public.admins TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.admins TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.categories, public.products,
  public.product_images, public.banners, public.site_settings, public.seo_pages,
  public.admins FROM anon;

CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = auth.uid() AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = auth.uid() AND role = 'super_admin' AND status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_dashboard_counts()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_active_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  RETURN jsonb_build_object(
    'products', (SELECT count(*) FROM public.products),
    'active_products', (SELECT count(*) FROM public.products WHERE status = 'published'),
    'categories', (SELECT count(*) FROM public.categories),
    'banners', (SELECT count(*) FROM public.banners),
    'admins', (SELECT count(*) FROM public.admins WHERE status = 'active')
  );
END;
$$;
REVOKE ALL ON FUNCTION public.admin_dashboard_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_counts() TO authenticated;

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can manage product images" ON public.product_images;
CREATE POLICY "Admins can manage product images" ON public.product_images
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can manage banners" ON public.banners;
CREATE POLICY "Admins can manage banners" ON public.banners
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;
CREATE POLICY "Admins can manage site settings" ON public.site_settings
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Admins can manage SEO pages" ON public.seo_pages;
CREATE POLICY "Admins can manage SEO pages" ON public.seo_pages
  FOR ALL TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());

DROP POLICY IF EXISTS "Super admins can manage admins" ON public.admins;
CREATE POLICY "Super admins can manage admins" ON public.admins
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- Keep direct SQL/API access from deactivating or deleting the final active admin.
CREATE OR REPLACE FUNCTION public.prevent_last_active_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'active'
     AND (TG_OP = 'DELETE' OR NEW.status <> 'active')
     AND NOT EXISTS (
       SELECT 1 FROM public.admins
       WHERE id <> OLD.id AND status = 'active'
     ) THEN
    RAISE EXCEPTION 'Cannot remove the final active admin';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS protect_final_active_admin ON public.admins;
CREATE TRIGGER protect_final_active_admin
  BEFORE UPDATE OF status OR DELETE ON public.admins
  FOR EACH ROW EXECUTE FUNCTION public.prevent_last_active_admin();

DROP POLICY IF EXISTS "Admins can upload product images" ON storage.objects;
CREATE POLICY "Admins can upload product images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND public.is_active_admin());

DROP POLICY IF EXISTS "Admins can update product images" ON storage.objects;
CREATE POLICY "Admins can update product images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_active_admin())
  WITH CHECK (bucket_id = 'product-images' AND public.is_active_admin());

DROP POLICY IF EXISTS "Admins can delete product images" ON storage.objects;
CREATE POLICY "Admins can delete product images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.is_active_admin());

DROP POLICY IF EXISTS "Admins can upload banner media" ON storage.objects;
CREATE POLICY "Admins can upload banner media" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'banner-media' AND public.is_active_admin());

DROP POLICY IF EXISTS "Admins can update banner media" ON storage.objects;
CREATE POLICY "Admins can update banner media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'banner-media' AND public.is_active_admin())
  WITH CHECK (bucket_id = 'banner-media' AND public.is_active_admin());

DROP POLICY IF EXISTS "Admins can delete banner media" ON storage.objects;
CREATE POLICY "Admins can delete banner media" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'banner-media' AND public.is_active_admin());
