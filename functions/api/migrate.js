// functions/api/migrate.js
// Secure server-side migration endpoint for Cloudflare Pages
// CRITICAL: This function uses service_role key stored in environment variables
// The browser NEVER receives this key

import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context) {
  const { request, env } = context;

  // ============================================================
  // SECURITY: Validate request authorization
  // ============================================================
  const authHeader = request.headers.get('Authorization');
  const MIGRATION_SECRET = env.MIGRATION_SECRET; // Set in Cloudflare dashboard

  if (!authHeader || authHeader !== `Bearer ${MIGRATION_SECRET}`) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Unauthorized - Invalid migration secret'
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // ============================================================
  // SUPABASE SERVER-SIDE CLIENT (with service_role key)
  // ============================================================
  const SUPABASE_URL = env.SUPABASE_URL || 'https://rguxjldnoxvwbfsgkazs.supabase.co';
  const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY; // NEVER expose to browser

  if (!SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Server configuration error: Missing SUPABASE_SERVICE_KEY'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Initialize Supabase Admin Client (bypasses RLS)
  // Uses local npm package (@supabase/supabase-js) — no CDN dependency
  // Provide a no-op storage to work around the missing localStorage in Workers runtime
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      storage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      }
    }
  });

  try {
    const body = await request.json();
    const { action, data } = body;

    // ============================================================
    // MIGRATION ACTIONS
    // ============================================================
    switch (action) {

      case 'test_connection':
        return await testConnection(supabase, env);

      case 'debug_test':
        return await debugTestSupabase(env);

      case 'migrate_categories':
        return await migrateCategories(supabase, env, request, data);

      case 'migrate_products':
        return await migrateProducts(supabase, env, request, data);

      case 'upload_product_images':
      case 'migrate_product_images':
        return await uploadProductImages(supabase, env, request, data);

      case 'migrate_banners':
        return await migrateBanners(supabase, env, request, data);

      case 'migrate_seo':
        return await migrateSEO(supabase, env, request, data);

      case 'migrate_settings':
        return await migrateSettings(supabase, env, request, data);

      case 'verify_counts':
        return await verifyCounts(supabase);

      case 'verify_data':
        return await verifyData(supabase);

      case 'verify_seo':
        return await verifySEO(supabase);

      case 'verify_settings':
        return await verifySettings(supabase);

      default:
        return new Response(JSON.stringify({
          success: false,
          error: `Unknown action: ${action}`
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: (error && error.message) ? error.message : String(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Safely extract an error message without risking throwing if error is undefined/null
function getErrorMessage(error) {
  if (error && error.message) return error.message;
  return String(error);
}

// ============================================================
// DEBUG / DIAGNOSTIC (temporary)
// Tests whether the service role key works via raw REST fetch.
// This isolates library compatibility issues from key/auth issues.
// ============================================================
async function debugTestSupabase(env) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_KEY;

  const result = {
    url_defined: !!url,
    key_defined: !!key,
    key_length: key ? key.length : 0
  };

  try {
    const response = await fetch(`${url}/rest/v1/categories?select=id&limit=1`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });

    result.raw_status = response.status;
    result.raw_ok = response.ok;
    result.raw_body = await response.text();
  } catch (err) {
    result.raw_error = getErrorMessage(err);
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ============================================================
// MIGRATION FUNCTIONS
// ============================================================

async function testConnection(supabase, env) {
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_KEY;
  const result = {
    raw: {},
    client: {}
  };

  // Test 1: raw REST fetch with service key (definitive key/auth test).
  // This bypasses the @supabase/supabase-js library entirely so we can
  // confirm whether the service role key itself works in the edge runtime.
  try {
    const response = await fetch(`${url}/rest/v1/categories?select=id&limit=1`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json'
      }
    });
    result.raw.status = response.status;
    result.raw.ok = response.ok;
    result.raw.body = await response.text();
  } catch (err) {
    result.raw.error = getErrorMessage(err);
  }

  // Test 2: @supabase/supabase-js client
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id')
      .limit(1);
    if (error) {
      result.client.message = (error && error.message) ? error.message : String(error);
    } else {
      result.client.ok = true;
      result.client.count = data ? data.length : 0;
    }
  } catch (err) {
    result.client.error = getErrorMessage(err);
  }

  const rawOk = !!(result.raw && result.raw.ok);
  const clientOk = !!(result.client && result.client.ok);

  if (rawOk || clientOk) {
    return new Response(JSON.stringify({
      success: true,
      message: 'Connection test passed',
      raw: result.raw,
      client: result.client
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({
    success: false,
    error: 'Supabase connection failed',
    raw: result.raw,
    client: result.client
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ============================================================
// ASSET READING HELPERS
// ============================================================
// Fetch a static asset served by the same Pages project (works both
// in local `wrangler pages dev` and in production). Used to read the
// source JSON files and local images/videos server-side.
async function fetchAsset(env, request, path) {
  const origin = new URL(request.url).origin;
  const cleanPath = String(path).replace(/^\/+/, '');
  const res = await env.ASSETS.fetch(`${origin}/${cleanPath}`);
  return res;
}

async function readProductsSource(env, request, data) {
  if (data && Array.isArray(data)) return data;
  if (data && Array.isArray(data.products)) return data.products;
  const res = await fetchAsset(env, request, 'data/products.json');
  if (!res.ok) throw new Error(`Could not read data/products.json (status ${res.status})`);
  const json = await res.json();
  return json.products || json;
}

async function readBannerSource(env, request, data) {
  if (data && Array.isArray(data)) return data;
  if (data && Array.isArray(data.slides)) return data.slides;
  const res = await fetchAsset(env, request, 'data/banner.json');
  if (!res.ok) throw new Error(`Could not read data/banner.json (status ${res.status})`);
  const json = await res.json();
  return json.slides || [];
}

async function readSEOSource(env, request, data) {
  if (data && typeof data === 'object' && data.home) return data;
  const res = await fetchAsset(env, request, 'data/seo.json');
  if (!res.ok) throw new Error(`Could not read data/seo.json (status ${res.status})`);
  return await res.json();
}

async function readSettingsSource(env, request, data) {
  if (data && typeof data === 'object' && data.businessName) return data;
  const res = await fetchAsset(env, request, 'data/settings.json');
  if (!res.ok) throw new Error(`Could not read data/settings.json (status ${res.status})`);
  return await res.json();
}

function makePublicUrl(url, bucket, storagePath) {
  return `${url.replace(/\/+$/, '')}/storage/v1/object/public/${bucket}/${storagePath}`;
}

// ============================================================
// 1) MIGRATE CATEGORIES
// Apples a deterministic slug to each unique category name found in
// products.json and upserts by slug (idempotent — safe to re-run).
// ============================================================
const CATEGORY_SLUGS = {
  'table lamps': 'table-lamps',
  'vase': 'vases',
  'vases': 'vases',
  'tables': 'tables'
};

function categorySlugFor(name) {
  const lower = String(name || '').trim().toLowerCase();
  const mapped = CATEGORY_SLUGS[lower];
  if (mapped) return mapped;
  return lower.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function categoryNameFor(name) {
  const lower = String(name || '').trim().toLowerCase();
  if (lower === 'vase' || lower === 'vases') return 'Vases';
  return String(name || '').trim();
}

async function migrateCategories(supabase, env, request, data) {
  try {
    const products = await readProductsSource(env, request, data);

    // Collect unique category names from products
    const catMap = {}; // slug -> { name, slug, status, sort_order }
    for (const p of products) {
      const raw = (p.category || '').trim();
      if (!raw) continue;
      const slug = categorySlugFor(raw);
      if (!slug) continue;
      if (!catMap[slug]) {
        catMap[slug] = {
          name: categoryNameFor(raw),
          slug,
          status: 'active',
          sort_order: Object.keys(catMap).length + 1
        };
      }
    }

    const rows = Object.values(catMap);
    let inserted = 0;
    let errors = [];

    for (const row of rows) {
      const { error } = await supabase
        .from('categories')
        .upsert(row, { onConflict: 'slug' });
      if (error) {
        errors.push(`${row.slug}: ${getErrorMessage(error)}`);
      } else {
        inserted++;
      }
    }

    return new Response(JSON.stringify({
      success: errors.length === 0,
      rows,
      inserted,
      total: rows.length,
      errors: errors.length ? errors : undefined,
      message: `Categories upserted: ${inserted}/${rows.length}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: getErrorMessage(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function migrateProducts(supabase, env, request, productsData) {
  try {
    const products = await readProductsSource(env, request, productsData);

    if (!Array.isArray(products)) {
      throw new Error('Invalid products data');
    }

    // Resolve category name/slug -> UUID
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('id, slug');

    if (catError) throw catError;

    const categoryMap = {};
    (categories || []).forEach(cat => {
      categoryMap[cat.slug.toLowerCase()] = cat.id;
    });

    let upserted = 0;
    const errors = [];

    for (const product of products) {
      try {
        const slug = categorySlugFor(product.category);
        const category_id = categoryMap[slug] || categoryMap['table-lamps'];

        const productData = {
          slug: product.id,
          name: product.name,
          category_id: category_id,
          price: Number(product.price) || 0,
          description: product.description || null,
          material: product.material || 'metal',
          in_stock: product.inStock !== false,
          status: 'published',
          featured: !!product.featured,
          meta_title: (product.seo && product.seo.metaTitle) || null,
          meta_description: (product.seo && product.seo.metaDescription) || null,
          image_alt: (product.seo && product.seo.imageAlt) || null,
          sort_order: product.sort_order || 0
        };

        const { error } = await supabase
          .from('products')
          .upsert(productData, { onConflict: 'slug' });

        if (error) {
          errors.push(`${product.id}: ${getErrorMessage(error)}`);
        } else {
          upserted++;
        }
      } catch (err) {
        errors.push(`${product.id}: ${getErrorMessage(err)}`);
      }
    }

    return new Response(JSON.stringify({
      success: errors.length === 0,
      upserted,
      total: products.length,
      errors: errors.length ? errors : undefined,
      message: `Product migration: ${upserted}/${products.length} upserted (no duplicates)`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: getErrorMessage(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Infer a MIME type from a file extension (used as a fallback when the
// served asset does not include a content-type header in local dev).
function inferContentType(filename) {
  const ext = (String(filename).split('.').pop() || '').toLowerCase();
  const map = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    gif: 'image/gif',
    svg: 'image/svg+xml',
    mp4: 'video/mp4',
    webm: 'video/webm'
  };
  return map[ext] || 'application/octet-stream';
}

// ============================================================
// 3) UPLOAD PRODUCT IMAGES
// Reads each product's local image files, uploads them to the
// `product-images` bucket, and creates/updates product_images
// records linked to the product's real UUID (resolved by slug).
// Idempotent: existing storage_path records are updated, not
// duplicated. Missing asset paths are reported (not silently skipped).
// ============================================================
async function uploadProductImages(supabase, env, request, imagesData) {
  try {
    const products = await readProductsSource(env, request, imagesData);
    if (!Array.isArray(products)) throw new Error('Invalid products data');

    const slugs = products.map(p => p.id).filter(Boolean);
    const { data: prodRows, error: prodErr } = await supabase
      .from('products')
      .select('id, slug')
      .in('slug', slugs);
    if (prodErr) throw prodErr;

    const productIdBySlug = {};
    (prodRows || []).forEach(r => { productIdBySlug[r.slug] = r.id; });

    const bucket = 'product-images';
    let totalImages = 0;
    products.forEach(p => { totalImages += (p.images || []).length; });

    let inserted = 0;
    let updated = 0;
    const errors = [];
    const missingFiles = [];
    const uploadedFiles = [];

    for (const product of products) {
      const productId = productIdBySlug[product.id];
      if (!productId) {
        errors.push(`${product.id}: product row not found in DB`);
        continue;
      }
      const images = product.images || [];
      for (let i = 0; i < images.length; i++) {
        const localPath = images[i];
        const filename = String(localPath).split('/').pop();
        const storagePath = `${product.id}/${filename}`;

        // 1) Verify the local file actually exists
        const assetRes = await fetchAsset(env, request, localPath);
        if (!assetRes.ok) {
          missingFiles.push(localPath);
          errors.push(`Missing product image: ${localPath} (status ${assetRes.status})`);
          continue; // reported above — not silently skipped
        }

        // 2) Upload to bucket (upsert so re-runs never duplicate)
        const contentType = assetRes.headers.get('content-type') || inferContentType(filename);
        const bytes = await assetRes.arrayBuffer();
        const { error: upErr } = await supabase.storage
          .from(bucket)
          .upload(storagePath, bytes, { contentType, upsert: true });
        if (upErr) {
          errors.push(`Upload ${storagePath}: ${getErrorMessage(upErr)}`);
          continue;
        }

        const public_url = makePublicUrl(env.SUPABASE_URL, bucket, storagePath);
        const record = {
          product_id: productId,
          storage_path: storagePath,
          public_url,
          alt_text: (product.seo && product.seo.imageAlt) || product.name,
          sort_order: i,
          is_primary: i === 0
        };

        // 3) Upsert the DB record by storage_path (idempotent)
        const { data: existing } = await supabase
          .from('product_images')
          .select('id')
          .eq('storage_path', storagePath)
          .maybeSingle();

        let recError;
        if (existing) {
          ({ error: recError } = await supabase.from('product_images').update(record).eq('id', existing.id));
          if (!recError) updated++;
        } else {
          ({ error: recError } = await supabase.from('product_images').insert(record));
          if (!recError) inserted++;
        }
        if (recError) {
          errors.push(`DB ${storagePath}: ${getErrorMessage(recError)}`);
        } else {
          uploadedFiles.push(public_url);
        }
      }
    }

    const ok = errors.length === 0;
    return new Response(JSON.stringify({
      success: ok,
      inserted,
      updated,
      total: totalImages,
      missingFiles,
      errors: errors.length ? errors : undefined,
      uploadedFiles,
      message: `Product images: ${inserted} inserted, ${updated} updated, total ${totalImages}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: getErrorMessage(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function migrateBanners(supabase, env, request, bannersData) {
  try {
    const slides = await readBannerSource(env, request, bannersData);
    if (!Array.isArray(slides)) throw new Error('Invalid banners data');

    const bucket = 'banner-media';
    let inserted = 0;
    let updated = 0;
    const errors = [];
    const missingFiles = [];
    const uploadedFiles = [];

    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const localPath = slide.type === 'image' ? slide.image : slide.video;
      if (!localPath) {
        errors.push(`Banner ${i + 1}: missing media path in source`);
        continue;
      }
      const filename = String(localPath).split('/').pop();
      const storagePath = filename;

      // Verify the referenced local file actually exists
      const assetRes = await fetchAsset(env, request, localPath);
      if (!assetRes.ok) {
        missingFiles.push(localPath);
        errors.push(`Missing banner asset: ${localPath} (status ${assetRes.status})`);
        continue; // reported below — not silently skipped
      }

      // Upload media to the banner-media bucket (upsert to avoid duplicates)
      const contentType = assetRes.headers.get('content-type') || inferContentType(filename);
      const bytes = await assetRes.arrayBuffer();
      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(storagePath, bytes, { contentType, upsert: true });
      if (upErr) {
        errors.push(`Upload ${storagePath}: ${getErrorMessage(upErr)}`);
        continue;
      }

      const public_url = makePublicUrl(env.SUPABASE_URL, bucket, storagePath);
      const record = {
        type: slide.type,
        storage_path: storagePath,
        public_url,
        title: slide.title || null,
        subtitle: slide.subtitle || null,
        cta_text: slide.cta_text || null,
        cta_link: slide.cta_link || null,
        status: 'active',
        sort_order: i
      };

      // Upsert banner by public_url (idempotent)
      const { data: existing } = await supabase
        .from('banners')
        .select('id')
        .eq('public_url', public_url)
        .maybeSingle();

      let recError;
      if (existing) {
        ({ error: recError } = await supabase.from('banners').update(record).eq('id', existing.id));
        if (!recError) updated++;
      } else {
        ({ error: recError } = await supabase.from('banners').insert(record));
        if (!recError) inserted++;
      }
      if (recError) {
        errors.push(`DB ${storagePath}: ${getErrorMessage(recError)}`);
      } else {
        uploadedFiles.push(public_url);
      }
    }

    const ok = errors.length === 0;
    return new Response(JSON.stringify({
      success: ok,
      inserted,
      updated,
      total: slides.length,
      missingFiles,
      errors: errors.length ? errors : undefined,
      uploadedFiles,
      message: `Banners: ${inserted} inserted, ${updated} updated, total ${slides.length}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: getErrorMessage(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ============================================================
// 4) MIGRATE SEO
// Upserts the pages in seo.json into seo_pages by page_slug.
// ============================================================
async function migrateSEO(supabase, env, request, data) {
  try {
    const seoData = await readSEOSource(env, request, data);
    const schema = seoData.schema || {};
    const typeMap = { products: 'CollectionPage', about: 'AboutPage', contact: 'ContactPage' };
    const pageKeys = ['home', 'products', 'about', 'contact'];

    let upserted = 0;
    const errors = [];
    const pages = [];

    for (const key of pageKeys) {
      const page = seoData[key];
      if (!page) continue;

      let schemaData = null;
      if (key === 'home' && (schema.type || schema.name)) {
        schemaData = { '@context': 'https://schema.org', '@type': schema.type || 'HomeGoodsStore', name: schema.name || 'Satisfaction Unity' };
        if (schema.logo) schemaData.logo = schema.logo;
      } else if (typeMap[key]) {
        schemaData = { '@context': 'https://schema.org', '@type': typeMap[key] };
      }

      const record = {
        page_slug: key,
        meta_title: page.metaTitle || null,
        meta_description: page.metaDescription || null,
        og_image_url: (key === 'home' && seoData.ogImage) ? seoData.ogImage : null,
        canonical_url: null,
        schema_type: schema.type || null,
        schema_data: schemaData
      };

      const { error } = await supabase
        .from('seo_pages')
        .upsert(record, { onConflict: 'page_slug' });

      if (error) {
        errors.push(`${key}: ${getErrorMessage(error)}`);
      } else {
        upserted++;
        pages.push(key);
      }
    }

    return new Response(JSON.stringify({
      success: errors.length === 0,
      upserted,
      total: pages.length,
      pages,
      errors: errors.length ? errors : undefined,
      message: `SEO upserted: ${upserted}/${pages.length} pages`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: getErrorMessage(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ============================================================
// 5) MIGRATE SETTINGS
// Upserts settings.json into site_settings by key (idempotent).
// ============================================================
async function migrateSettings(supabase, env, request, data) {
  try {
    const s = await readSettingsSource(env, request, data);
    const rows = [
      { key: 'business_name', value: s.businessName, category: 'contact', description: 'Business name' },
      { key: 'address', value: s.address, category: 'contact', description: 'Business address' },
      { key: 'phone', value: s.phone, category: 'contact', description: 'Contact phone number' },
      { key: 'whatsapp', value: s.whatsapp, category: 'contact', description: 'WhatsApp number (without +)' },
      { key: 'email', value: s.email, category: 'contact', description: 'Contact email' }
    ];

    let upserted = 0;
    const errors = [];

    for (const row of rows) {
      // Only upsert settings that have a value, preserving any existing DB values
      if (row.value === undefined || row.value === null || row.value === '') {
        errors.push(`${row.key}: no value in settings.json (skipped)`);
        continue;
      }
      const { error } = await supabase
        .from('site_settings')
        .upsert(row, { onConflict: 'key' });
      if (error) {
        errors.push(`${row.key}: ${getErrorMessage(error)}`);
      } else {
        upserted++;
      }
    }

    return new Response(JSON.stringify({
      success: errors.length === 0,
      upserted,
      total: rows.length,
      errors: errors.length ? errors : undefined,
      message: `Settings upserted: ${upserted}/${rows.length}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: getErrorMessage(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ============================================================
// VERIFY COUNTS — returns row counts for all migrated tables
// ============================================================
async function verifyCounts(supabase) {
  const tables = ['categories', 'products', 'product_images', 'banners', 'seo_pages', 'site_settings'];
  const counts = {};
  let error = null;

  for (const t of tables) {
    try {
      const { count, error: e } = await supabase.from(t).select('id', { count: 'exact', head: true });
      if (e) {
        counts[t] = 'ERROR';
        error = error || getErrorMessage(e);
      } else {
        counts[t] = count;
      }
    } catch (err) {
      counts[t] = 'ERROR';
      error = error || getErrorMessage(err);
    }
  }

  return new Response(JSON.stringify({
    success: !error,
    counts,
    error: error || undefined
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// ============================================================
// VERIFY DATA — deep relationship check: products->categories,
// product_images->products with primary-image correctness,
// banners storage/public URLs.
// ============================================================
async function verifyData(supabase) {
  try {
    const result = {};

    // Products + category validation
    const { data: products, error: pErr } = await supabase
      .from('products')
      .select('id, slug, name, category_id');
    if (pErr) throw pErr;
    result.products = products.length;
    result.products_without_category = products.filter(p => !p.category_id).length;

    // Categories
    const { data: categories, error: cErr } = await supabase.from('categories').select('id, slug, name');
    if (cErr) throw cErr;
    result.categories = categories.length;

    // Product images + primary checks + valid product link
    const { data: images, error: imErr } = await supabase
      .from('product_images')
      .select('id, product_id, storage_path, public_url, sort_order, is_primary');
    if (imErr) throw imErr;
    result.product_images = images.length;

    const productIds = new Set(products.map(p => p.id));
    const orphans = images.filter(img => !productIds.has(img.product_id));
    result.orphan_images = orphans.length;

    // Per-product primary image check
    const perProduct = {};
    images.forEach(img => {
      if (!perProduct[img.product_id]) perProduct[img.product_id] = { count: 0, primaries: 0 };
      perProduct[img.product_id].count++;
      if (img.is_primary) perProduct[img.product_id].primaries++;
    });
    result.products_without_primary = Object.keys(perProduct).filter(id => perProduct[id].primaries === 0).length;
    result.products_with_multiple_primary = Object.keys(perProduct).filter(id => perProduct[id].primaries > 1).length;
    const perProductCounts = Object.values(perProduct).map(v => v.count);
    result.min_images_per_product = perProductCounts.length ? Math.min(...perProductCounts) : 0;
    result.max_images_per_product = perProductCounts.length ? Math.max(...perProductCounts) : 0;

    // Banners
    const { data: banners, error: bErr } = await supabase.from('banners').select('id, type, storage_path, public_url, sort_order, status');
    if (bErr) throw bErr;
    result.banners = banners.length;
    result.banners_without_public_url = banners.filter(b => !b.public_url).length;
    result.banners_by_sort_order = banners.map(b => ({ type: b.type, sort_order: b.sort_order, url: b.public_url.split('/').pop() }));

    return new Response(JSON.stringify({
      success: (orphans.length === 0 && result.products_without_primary === 0 && result.products_without_category === 0),
      ...result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: getErrorMessage(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function verifySEO(supabase) {
  try {
    const { data, error } = await supabase
      .from('seo_pages')
      .select('*');

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      count: data.length,
      message: `SEO pages exist: ${data.length} pages`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: getErrorMessage(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function verifySettings(supabase) {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*');

    if (error) throw error;

    return new Response(JSON.stringify({
      success: true,
      count: data.length,
      message: `Site settings exist: ${data.length} settings`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: getErrorMessage(error)
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ============================================================
// CORS PREFLIGHT
// ============================================================
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  });
}



