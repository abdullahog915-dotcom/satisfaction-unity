import { escapeHtml, publicConfig, restHeaders } from '../_shared/supabase.js';

export async function onRequest({ request, env, params }) {
  const origin = new URL(request.url).origin;
  const plainPageUrl = `${origin}/product-detail.html`;

  try {
    const htmlResponse = await env.ASSETS.fetch(plainPageUrl);
    if (!htmlResponse.ok) return env.ASSETS.fetch(request);
    let html = await htmlResponse.text();
    const { url, anonKey } = publicConfig(env);
    const query = new URL(`${url}/rest/v1/products`);
    query.searchParams.set('slug', `eq.${params.id}`);
    query.searchParams.set('status', 'eq.published');
    query.searchParams.set('select', 'slug,name,price,description,in_stock,meta_title,meta_description,image_alt,product_images(public_url,alt_text,sort_order,is_primary)');
    query.searchParams.set('limit', '1');
    const dataResponse = await fetch(query, {
      headers: restHeaders(anonKey, { 'cache-control': 'no-cache' }), cf: { cacheTtl: 0 },
    });
    if (!dataResponse.ok) throw new Error(`Product query failed: ${dataResponse.status}`);
    const [product] = await dataResponse.json();
    if (!product) return new Response(html, { headers: { 'content-type': 'text/html; charset=UTF-8' } });

    const images = (product.product_images || []).sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order);
    const pageUrl = `${origin}/products/${product.slug}`;
    const seoTitle = product.meta_title || `${product.name} | Satisfaction Unity`;
    const seoDesc = product.meta_description || (product.description || '').slice(0, 155);
    const seoImage = images[0]?.public_url || '';
    const schema = {
      '@context': 'https://schema.org', '@type': 'Product', name: product.name,
      description: product.description || '', image: images.map((image) => image.public_url),
      offers: { '@type': 'Offer', priceCurrency: 'INR', price: product.price,
        availability: product.in_stock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: pageUrl },
    };
    const tags = `<title>${escapeHtml(seoTitle)}</title>
<meta name="description" content="${escapeHtml(seoDesc)}">
<meta property="og:type" content="product">
<meta property="og:title" content="${escapeHtml(seoTitle)}">
<meta property="og:description" content="${escapeHtml(seoDesc)}">
<meta property="og:url" content="${escapeHtml(pageUrl)}">
${seoImage ? `<meta property="og:image" content="${escapeHtml(seoImage)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(seoTitle)}">
<meta name="twitter:description" content="${escapeHtml(seoDesc)}">
${seoImage ? `<meta name="twitter:image" content="${escapeHtml(seoImage)}">` : ''}
<link rel="canonical" href="${escapeHtml(pageUrl)}">
<script type="application/ld+json" data-supabase-product-seo>${JSON.stringify(schema).replace(/</g, '\\u003c')}</script>`;

    html = html
      .replace(/<title>[\s\S]*?<\/title>/i, '')
      .replace(/<meta\s+(?:name=["']description["']|property=["']og:[^"']+["']|name=["']twitter:[^"']+["'])[^>]*>\s*/gi, '')
      .replace(/<link\s+rel=["']canonical["'][^>]*>\s*/gi, '')
      .replace('</head>', `${tags}\n</head>`);
    return new Response(html, { headers: { 'content-type': 'text/html; charset=UTF-8', 'cache-control': 'public, max-age=0, must-revalidate' } });
  } catch (error) {
    console.error('Product SEO injection failed', error);
    return env.ASSETS.fetch(plainPageUrl);
  }
}
