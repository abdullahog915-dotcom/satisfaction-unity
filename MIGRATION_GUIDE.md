# 🚀 Supabase Migration Implementation Guide

## Progress Status

✅ **COMPLETED:**
1. Repository audit and architecture analysis
2. Database schema design (all 7 tables)
3. SQL migrations created (01-09)
4. Row Level Security (RLS) policies
5. Data migration scripts (HTML-based tool)
6. Supabase JavaScript services layer
7. SEO loader updated for Supabase

⏳ **REMAINING TASKS:**

---

## PHASE 1: Run Database Migrations (YOU MUST DO THIS FIRST)

### Step 1: Access Supabase Dashboard

1. Go to: https://rguxjldnoxvwbfsgkazs.supabase.co
2. Log in to your Supabase project
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Run Master Migration

1. Open the file: `supabase/migrations/00_run_all_migrations.sql`
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run** (or press Ctrl+Enter)
5. Wait for confirmation: "Success. No rows returned"

### Step 3: Verify Tables Created

Run this query in SQL Editor:

```sql
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'categories', 'products', 'product_images', 
    'banners', 'site_settings', 'seo_pages', 'admins'
  )
ORDER BY tablename;
```

You should see all 7 tables listed.

### Step 4: Create Storage Buckets

**Dashboard → Storage → New Bucket**

Create two buckets:

**Bucket 1: product-images**
- Name: `product-images`
- Public: ✅ Yes
- File size limit: 5 MB
- Allowed MIME types: `image/jpeg, image/png, image/webp`

**Bucket 2: banner-media**
- Name: `banner-media`
- Public: ✅ Yes
- File size limit: 20 MB
- Allowed MIME types: `image/jpeg, image/png, image/webp, video/mp4`

### Step 5: Configure Storage Policies

For each bucket, add these policies:

**Dashboard → Storage → [bucket-name] → Policies**

1. **Public Read Policy:**
   - Policy name: `Public can view files`
   - Action: SELECT
   - Target roles: `public, authenticated, anon`
   - USING expression: `true`

2. **Admin Upload Policy:**
   - Policy name: `Authenticated users can upload`
   - Action: INSERT
   - Target roles: `authenticated`
   - WITH CHECK expression: `true`

3. **Admin Delete Policy:**
   - Policy name: `Authenticated users can delete`
   - Action: DELETE
   - Target roles: `authenticated`
   - USING expression: `true`

---

## PHASE 2: Create First Admin User

### Step 1: Create Auth User

**Dashboard → Authentication → Users → Add User**

- Email: `admin@satisfactionunity.com` (or your preferred email)
- Password: Create a strong password
- Auto Confirm User: ✅ Yes

Click **Create User**

### Step 2: Copy User UUID

After creating the user, copy the **UUID** from the users table.

### Step 3: Insert into Admins Table

**Dashboard → SQL Editor**

Run this query (replace `YOUR-USER-UUID-HERE` with the actual UUID):

```sql
INSERT INTO admins (id, email, full_name, role, status)
VALUES (
  'YOUR-USER-UUID-HERE',
  'admin@satisfactionunity.com',
  'Admin User',
  'super_admin',
  'active'
);
```

---

## PHASE 3: Run Data Migration

### Step 1: Open Migration Tool

1. Open your web browser
2. Navigate to: `file:///C:/Users/lenovo/Desktop/new app/satisfaction-unity-main/migration/migrate-all.html`
   (Or open the file directly: `migration/migrate-all.html`)

### Step 2: Run Migration Steps

The tool provides a visual interface to migrate data. Click buttons in order:

1. ✅ **Migrate Categories** - Should confirm 2 categories exist
2. ✅ **Migrate Products** - Imports 9 products from `data/products.json`
3. ✅ **Upload Product Images** - Uploads 18 images to Supabase Storage
4. ✅ **Migrate Banners** - Imports 4 banner slides
5. ✅ **Migrate SEO Data** - Confirms 4 SEO pages exist
6. ✅ **Migrate Settings** - Confirms 5 settings exist

Or click **▶ Run All Migrations** to run everything automatically.

### Step 3: Verify Data

Check the migration log for any errors. The statistics panel should show:
- Categories: 2
- Products: 9
- Images: 18
- Banners: 4

---

## PHASE 4: Update Customer Website Frontend

### Files That Need Script Tags Added

Add these script tags to the `<head>` section of each HTML file:

**Files to update:**
- `index.html`
- `products.html`
- `product-detail.html`
- `about.html`
- `contact.html`

**Add BEFORE the existing `<script src="seo-loader.js" defer></script>` line:**

```html
<!-- Supabase Client -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/supabase-client.js"></script>
```

**Example for index.html (around line 7):**

```html
<title>Satisfaction Unity - Handcrafted Metal, Brass & Ceramic Lamps</title>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/supabase-client.js"></script>
<script src="seo-loader.js" defer></script>
```

### Update index.html Product Loading

**Find this line (around line 300):**

```javascript
fetch('data/products.json').then(res => res.json()).then(data => {
```

**Replace with:**

```javascript
// Load Supabase services
const script = document.createElement('script');
script.src = 'js/services/products.js';
document.head.appendChild(script);

script.onload = async function() {
  const products = await ProductService.getAll();
  const data = { products };
```

### Update products.html Product Loading

**Find this line (around line 149):**

```javascript
fetch('data/products.json').then(res => { if (!res.ok) throw new Error('Failed'); return res.json(); })
```

**Replace with:**

```javascript
// Add at the top of DOMContentLoaded
const script = document.createElement('script');
script.src = 'js/services/products.js';
document.head.appendChild(script);

script.onload = async function() {
  const products = await ProductService.getAll();
```

### Update product-detail.html

**Find this line (around line 300):**

```javascript
fetch('data/products.json', { cache: 'no-store' })
```

**Replace with:**

```javascript
// Load product service
const script = document.createElement('script');
script.src = 'js/services/products.js';
document.head.appendChild(script);

script.onload = async function() {
  const product = await ProductService.getBySlug(productId);
  if (!product) {
    throw new Error('Product not found');
  }
  displayProduct(product);
};
```

---

## PHASE 5: Update Cloudflare Function (CRITICAL FOR SEO)

The serverless function at `functions/products/[id].js` must be updated to fetch from Supabase instead of JSON files.

**This is CRITICAL for social media link previews (WhatsApp, Facebook, Twitter).**

**Replace the entire file with:**

```javascript
// functions/products/[id].js
// Cloudflare Pages Function - Server-side product SEO tags

export async function onRequest(context) {
  const { request, env, params } = context;
  const origin = new URL(request.url).origin;
  const plainPageUrl = `${origin}/product-detail.html`;

  try {
    const productId = params.id;

    // 1. Get the base HTML page
    const htmlResponse = await env.ASSETS.fetch(plainPageUrl);
    if (!htmlResponse.ok) {
      return env.ASSETS.fetch(request);
    }
    let html = await htmlResponse.text();

    // 2. Fetch product from Supabase
    const SUPABASE_URL = 'https://rguxjldnoxvwbfsgkazs.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJndXhqbGRub3h2d2Jmc2drYXpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQzNTc1MzIsImV4cCI6MjA0OTkzMzUzMn0.sb_publishable_qaaeA3Bj3BE_WIugTTsz0A_STsVdfd2';

    const supabaseResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/products?slug=eq.${productId}&status=eq.published&select=*,category:categories(name),images:product_images(public_url,alt_text,sort_order)`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );

    if (!supabaseResponse.ok) {
      return new Response(html, {
        headers: { 'content-type': 'text/html; charset=UTF-8' },
      });
    }

    const products = await supabaseResponse.json();
    const product = products[0];

    if (!product) {
      return new Response(html, {
        headers: { 'content-type': 'text/html; charset=UTF-8' },
      });
    }

    // 3. Build meta tags
    const pageUrl = `${origin}/products/${productId}`;
    const seoTitle = product.meta_title || `${product.name} | Satisfaction Unity`;
    const seoDesc = product.meta_description || (product.description ? product.description.slice(0, 155) : '');
    
    // Sort images and get primary
    const sortedImages = (product.images || []).sort((a, b) => a.sort_order - b.sort_order);
    let seoImage = sortedImages[0]?.public_url || '';

    const escape = (str) =>
      String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

    const metaTags = `<title>${escape(seoTitle)}</title>
<meta name="description" content="${escape(seoDesc)}" />
<meta property="og:type" content="product" />
<meta property="og:title" content="${escape(seoTitle)}" />
<meta property="og:description" content="${escape(seoDesc)}" />
<meta property="og:url" content="${escape(pageUrl)}" />
${seoImage ? `<meta property="og:image" content="${escape(seoImage)}" />` : ''}
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escape(seoTitle)}" />
<meta name="twitter:description" content="${escape(seoDesc)}" />
${seoImage ? `<meta name="twitter:image" content="${escape(seoImage)}" />` : ''}
`;

    // 4. Inject meta tags
    if (html.includes('</head>')) {
      html = html.replace(/<title>[^<]*<\/title>/i, '');
      html = html.replace('</head>', `${metaTags}</head>`);
    }

    return new Response(html, {
      headers: { 'content-type': 'text/html; charset=UTF-8' },
    });
  } catch (err) {
    return env.ASSETS.fetch(plainPageUrl);
  }
}
```

---

## PHASE 6: Test Customer Website

### Local Testing

1. **Start a local server** (required for JavaScript modules):
   
   ```bash
   # Option 1: Python
   python -m http.server 8000
   
   # Option 2: Node.js
   npx http-server -p 8000
   
   # Option 3: VS Code Live Server extension
   ```

2. **Open in browser:**
   - Homepage: http://localhost:8000/
   - Products: http://localhost:8000/products.html
   - Product Detail: http://localhost:8000/products/lamp-01

3. **Check Browser Console** (F12 → Console tab)
   - Should see no errors
   - Products should load from Supabase
   - Images should display

### What to Test

✅ **Homepage:**
- Hero slider displays (4 slides)
- Featured products load
- All images display

✅ **Products Page:**
- Product grid displays (9 products)
- Category filters work
- Search works
- Product cards show correct data

✅ **Product Detail:**
- Product detail loads by slug
- Images display
- Price displays
- Description displays

✅ **SEO:**
- View page source (Ctrl+U)
- Check meta tags are present
- Check Open Graph tags

---

## PHASE 7: Build Admin Panel (NEXT MAJOR TASK)

This requires creating a complete admin interface. The structure:

```
/admin/
├── login.html              # Supabase Auth login
├── dashboard.html          # Overview dashboard
├── products.html           # Product list/CRUD
├── product-edit.html       # Product form
├── categories.html         # Category management
├── banners.html            # Banner management
├── settings.html           # Site settings
└── seo.html                # SEO management
```

**Would you like me to:**
1. ✅ Build the complete admin panel now?
2. ✅ First test the customer website with you?
3. ✅ Create detailed instructions for deployment?

---

## CRITICAL SECURITY NOTES

⚠️ **NEVER expose these:**
- Supabase service_role key
- Database password
- Admin credentials

✅ **Safe to use in frontend:**
- Supabase URL: `https://rguxjldnoxvwbfsgkazs.supabase.co`
- Supabase anon key: (already in code)

✅ **Security is enforced by:**
- Row Level Security (RLS) policies
- Storage policies
- Supabase Auth

---

## Next Steps

**IMMEDIATE ACTION REQUIRED:**

1. ✅ Run database migrations in Supabase dashboard
2. ✅ Create storage buckets
3. ✅ Create first admin user
4. ✅ Run data migration tool
5. ✅ Update HTML files with Supabase script tags
6. ✅ Test customer website locally

**Then let me know:**
- Did the migrations run successfully?
- Did the data migration complete?
- Are products loading on the website?

**I can then proceed to build the admin panel.**

---

## Need Help?

If you encounter any errors during setup, share:
1. The error message
2. Which step you're on
3. Any console errors (F12 → Console)

I'll help you resolve them immediately.
