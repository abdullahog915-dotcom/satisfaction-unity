# 🔒 Secure Migration Setup Guide

## Architecture Overview

```
Browser (migrate-secure.html)
        ↓ (HTTPS POST with Authorization header)
Cloudflare Pages Function (/api/migrate)
        ↓ (Uses SUPABASE_SERVICE_KEY from env)
Supabase Database + Storage
```

**✅ Security Features:**
- Service key NEVER exposed to browser
- Server-side validation of all operations
- Authorization token required for migration endpoint
- RLS remains enabled on all tables
- Public users can only READ published data
- Admin operations require authenticated admin users

---

## Step 1: Set Environment Variables in Cloudflare Pages

### Go to Cloudflare Dashboard

1. Navigate to: **Pages** → **Your Project** → **Settings** → **Environment Variables**

2. Add **Production** environment variables:

```
SUPABASE_URL = https://rguxjldnoxvwbfsgkazs.supabase.co
```

```
SUPABASE_SERVICE_KEY = [GET FROM SUPABASE DASHBOARD]
```

```
MIGRATION_SECRET = [GENERATE A RANDOM SECRET]
```

### How to Get SUPABASE_SERVICE_KEY

1. Go to: https://rguxjldnoxvwbfsgkazs.supabase.co
2. Navigate to: **Settings** → **API**
3. Find: **Project API keys** → **service_role** key
4. Copy the **service_role** secret key (starts with `eyJ...`)
5. ⚠️ **NEVER commit this key to Git or expose it in browser code**

### How to Generate MIGRATION_SECRET

Generate a random secret (e.g., using Node.js):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Or use any password generator to create a strong random string (32+ characters).

**Save this secret** - you'll need to enter it in the migration UI to authorize the migration.

---

## Step 2: Deploy to Cloudflare Pages

### Option A: Deploy from Git

If your project is connected to a Git repository in Cloudflare Pages:

```bash
git add functions/api/migrate.js migration/migrate-secure.html
git commit -m "Add secure server-side migration endpoint"
git push origin main
```

Cloudflare Pages will automatically deploy the new function.

### Option B: Local Development with Wrangler

Install Wrangler CLI:

```bash
npm install -g wrangler
```

Create `.dev.vars` file in project root (for local testing):

```env
SUPABASE_URL=https://rguxjldnoxvwbfsgkazs.supabase.co
SUPABASE_SERVICE_KEY=your_service_key_here
MIGRATION_SECRET=your_migration_secret_here
```

⚠️ **Add `.dev.vars` to `.gitignore`** - NEVER commit this file!

Run local development server:

```bash
npx wrangler pages dev . --port 8788
```

Access migration tool at: http://localhost:8788/migration/migrate-secure.html

---

## Step 3: Run Database Migrations

**Before running data migration**, create the database schema:

1. Go to: https://rguxjldnoxvwbfsgkazs.supabase.co
2. Navigate to: **SQL Editor**
3. Open file: `supabase/migrations/00_run_all_migrations.sql`
4. Copy entire contents
5. Paste into SQL Editor
6. Click **Run**
7. Verify: "Success. No rows returned"

---

## Step 4: Create Storage Buckets

1. Navigate to: **Storage** in Supabase dashboard
2. Click: **New Bucket**

### Bucket 1: product-images

- Name: `product-images`
- Public: ✅ Yes
- File size limit: 5MB
- Allowed MIME types: `image/jpeg, image/png, image/webp`

### Bucket 2: banner-media

- Name: `banner-media`
- Public: ✅ Yes
- File size limit: 20MB
- Allowed MIME types: `image/jpeg, image/png, image/webp, video/mp4`

---

## Step 5: Run Secure Migration

1. Open: `https://your-site.pages.dev/migration/migrate-secure.html`
   (Or locally: `http://localhost:8788/migration/migrate-secure.html`)

2. Enter your **MIGRATION_SECRET** in the password field

3. Click: **▶ Run Complete Migration**

4. Watch the log for progress

### Expected Results:

```
Testing server-side Supabase connection...
✓ Connection test passed

--- Categories ---
✓ Categories already exist: 2 categories

--- Products ---
Found 9 products to migrate
✓ Product migration: 9 inserted, 0 skipped

--- Product Images ---
Prepared 18 images
✓ Image references prepared: 18 images

--- Banners ---
Found 4 banners to migrate
✓ Banner migration: 4/4 banners

--- SEO ---
✓ SEO pages exist: 4 pages

--- Settings ---
✓ Site settings exist: 5 settings

✓ MIGRATION COMPLETE!

Categories: 2
Products: 9
Images: 18
Banners: 4
```

---

## Step 6: Verify Data in Supabase

### Check Tables:

1. Go to: **Table Editor** in Supabase dashboard
2. Verify:
   - `categories`: 2 rows
   - `products`: 9 rows
   - `banners`: 4 rows
   - `site_settings`: 5 rows
   - `seo_pages`: 4 rows

### Check RLS Policies:

1. Try to query as anonymous user (should work for reading published data)
2. Try to insert as anonymous user (should fail - protected by RLS)

---

## Security Verification Checklist

✅ **Environment Variables:**
- [ ] `SUPABASE_SERVICE_KEY` set in Cloudflare dashboard
- [ ] `MIGRATION_SECRET` set in Cloudflare dashboard
- [ ] `.dev.vars` added to `.gitignore`
- [ ] No secrets in browser DevTools → Network tab

✅ **RLS Policies:**
- [ ] RLS enabled on all tables
- [ ] Public can READ published products
- [ ] Public CANNOT write to any table
- [ ] Migration endpoint uses service key server-side

✅ **Migration Endpoint:**
- [ ] `/api/migrate` requires Authorization header
- [ ] Returns 401 for invalid/missing secret
- [ ] Never exposes service key in responses

---

## Troubleshooting

### Error: "Unauthorized - Invalid migration secret"

**Solution:** Check that:
1. `MIGRATION_SECRET` environment variable is set in Cloudflare
2. You're entering the exact same secret in the migration UI
3. There are no extra spaces in the secret

### Error: "Server configuration error: Missing SUPABASE_SERVICE_KEY"

**Solution:** 
1. Go to Cloudflare Pages → Settings → Environment Variables
2. Add `SUPABASE_SERVICE_KEY` with your service_role key from Supabase dashboard

### Error: "permission denied for table products"

**Solution:** This means the service key is not being used correctly.
1. Verify `SUPABASE_SERVICE_KEY` is the **service_role** key (not anon key)
2. Check the key is correctly set in environment variables
3. Redeploy the function after setting the environment variable

### Local Development: Connection refused

**Solution:**
1. Make sure Wrangler dev server is running: `npx wrangler pages dev . --port 8788`
2. Use `http://localhost:8788` (not `https`)
3. Check `.dev.vars` file exists with correct keys

---

## Next Steps After Migration

1. ✅ Update customer HTML files to use Supabase
2. ✅ Update Cloudflare Function for product detail pages
3. ✅ Build admin panel with Supabase Auth
4. ✅ Remove old CMS configuration
5. ✅ Test entire website with Supabase data

---

## Files Created

| File | Purpose | Security Level |
|------|---------|----------------|
| `functions/api/migrate.js` | Server-side migration endpoint | 🔒 Secure (uses service key from env) |
| `migration/migrate-secure.html` | Browser-based migration UI | ✅ Safe (no secrets exposed) |
| `SECURE_MIGRATION_GUIDE.md` | Setup documentation | 📖 Public |

---

## Important Security Notes

⚠️ **NEVER:**
- Commit `.dev.vars` to Git
- Expose `SUPABASE_SERVICE_KEY` in browser JavaScript
- Disable RLS policies
- Make database tables publicly writable
- Share your `MIGRATION_SECRET` publicly

✅ **ALWAYS:**
- Use environment variables for secrets
- Keep RLS enabled
- Use server-side endpoints for admin operations
- Validate authorization tokens
- Log migration attempts for security auditing

---

**The migration architecture is now secure and production-ready.**

**Proceed with setting up environment variables and running the migration!**
