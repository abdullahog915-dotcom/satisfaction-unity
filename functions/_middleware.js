import { escapeHtml, publicConfig, restHeaders } from './_shared/supabase.js';

const PAGE_SLUGS = new Map([
  ['/', 'home'], ['/index', 'home'], ['/index.html', 'home'],
  ['/products', 'products'], ['/products.html', 'products'],
  ['/about', 'about'], ['/about.html', 'about'],
  ['/contact', 'contact'], ['/contact.html', 'contact'],
]);

export async function onRequest(context) {
  const response = await context.next();
  const pathname = new URL(context.request.url).pathname.replace(/\/+$/, '') || '/';
  const pageSlug = PAGE_SLUGS.get(pathname);
  const contentType = response.headers.get('content-type') || '';
  if (!pageSlug || !response.ok || !contentType.includes('text/html')) return response;

  try {
    const { url, anonKey } = publicConfig(context.env);
    const query = new URL(`${url}/rest/v1/seo_pages`);
    query.searchParams.set('page_slug', `eq.${pageSlug}`);
    query.searchParams.set('select', '*');
    query.searchParams.set('limit', '1');
    const seoResponse = await fetch(query, {
      headers: restHeaders(anonKey, { 'cache-control': 'no-cache' }),
      cf: { cacheTtl: 0 },
    });
    if (!seoResponse.ok) return response;
    const [seo] = await seoResponse.json();
    if (!seo) return response;

    let html = await response.text();
    const origin = new URL(context.request.url).origin;
    const title = seo.meta_title;
    const description = seo.meta_description;
    const ogTitle = seo.og_title || title;
    const ogDescription = seo.og_description || description;
    const canonical = seo.canonical_url || `${origin}${pathname === '/' ? '/' : pathname}`;
    const tags = [
      `<title>${escapeHtml(title)}</title>`,
      `<meta name="description" content="${escapeHtml(description)}">`,
      '<meta property="og:type" content="website">',
      `<meta property="og:title" content="${escapeHtml(ogTitle)}">`,
      `<meta property="og:description" content="${escapeHtml(ogDescription)}">`,
      `<meta property="og:url" content="${escapeHtml(canonical)}">`,
      seo.og_image_url ? `<meta property="og:image" content="${escapeHtml(seo.og_image_url)}">` : '',
      '<meta name="twitter:card" content="summary_large_image">',
      `<meta name="twitter:title" content="${escapeHtml(ogTitle)}">`,
      `<meta name="twitter:description" content="${escapeHtml(ogDescription)}">`,
      seo.og_image_url ? `<meta name="twitter:image" content="${escapeHtml(seo.og_image_url)}">` : '',
      `<link rel="canonical" href="${escapeHtml(canonical)}">`,
      seo.schema_data ? `<script type="application/ld+json" data-supabase-seo>${JSON.stringify(seo.schema_data).replace(/</g, '\\u003c')}</script>` : '',
    ].filter(Boolean).join('\n');

    html = html
      .replace(/<title>[\s\S]*?<\/title>/i, '')
      .replace(/<meta\s+(?:name=["']description["']|property=["']og:[^"']+["']|name=["']twitter:[^"']+["'])[^>]*>\s*/gi, '')
      .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, '')
      .replace('</head>', `${tags}\n</head>`);

    const headers = new Headers(response.headers);
    headers.set('content-type', 'text/html; charset=UTF-8');
    headers.set('cache-control', 'public, max-age=0, must-revalidate');
    headers.delete('content-length');
    return new Response(html, { status: response.status, statusText: response.statusText, headers });
  } catch (error) {
    console.error('SEO middleware failed', error);
    return response;
  }
}
