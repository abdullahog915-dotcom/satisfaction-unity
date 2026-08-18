# Satisfaction Unity Supabase Admin

The admin panel is available locally at `http://127.0.0.1:8788/admin/` and, after deployment, at `https://satisfaction-unity.pages.dev/admin/`.

## One-time deployment setup

1. Run `supabase/migrations/10_admin_security_and_seo_sync.sql` once in the Supabase SQL editor. It adds editable Open Graph title/description fields, removes recursive admin-policy checks, grants PostgREST access that remains constrained by RLS, and prevents removal of the final active admin.
2. In Cloudflare Pages, keep `SUPABASE_URL` configured and add the service-role key as an encrypted secret named `SUPABASE_SERVICE_ROLE_KEY`. The existing name `SUPABASE_SERVICE_KEY` is also supported for compatibility. Never place this value in repository files or browser JavaScript.
3. Ensure the initial user exists in Supabase Auth and has an active row in `admins`. A one-time bootstrap in the SQL editor can use the Auth user's email:

   ```sql
   insert into public.admins (id, email, full_name, role, status)
   select id, email, 'Site Owner', 'super_admin', 'active'
   from auth.users
   where email = 'owner@example.com'
   on conflict (id) do update
   set role = 'super_admin', status = 'active';
   ```

4. Deploy the repository to Cloudflare Pages. Normal product, category, banner, settings, and SEO changes after that deployment require no GitHub commit or rebuild.

## Local development

```powershell
npm install
npm run dev
```

Use a local `.dev.vars` file for Cloudflare Function secrets; do not commit it. Serve through Wrangler rather than opening files with `file://`.

## Data flow

- Products and product images: `products` + `product_images` → homepage featured grid, collection, product detail, product meta/schema.
- Categories: `categories` → admin product form and public collection filters.
- Banners: `banners` + `banner-media` → homepage slider, including order, status, text and CTA.
- Site settings: `site_settings` → public phone, email, WhatsApp, address, map, business name and enquiry links.
- Page SEO: `seo_pages` → browser metadata plus Cloudflare edge-injected crawler metadata.
- Admin authorization: Supabase Auth session + active `admins` row + RLS. Super-admin invitations use `/api/admins` and the server-only service-role secret.

Public HTML is revalidated so edge-injected SEO stays current. Static media is not globally cache-disabled. Browser-side Supabase queries fetch current rows on reload.

## Legacy files

The Decap entry page and GitHub configuration are preserved in `admin/legacy-decap/`. They are not loaded by `/admin/`. The JSON data files remain only as migration history and have no active public or admin read path.
