// functions/products/[id].js
// Cloudflare Pages Function
// Runs at the edge for every request to /products/:id
// Injects correct og:image / og:title / og:description into the HTML
// BEFORE it reaches the browser or a crawler (WhatsApp, Facebook, etc).
// This is required because WhatsApp's link-preview bot does NOT run
// JavaScript, so tags added by client-side JS are invisible to it.
//
// SAFETY: everything is wrapped in try/catch. If ANYTHING goes wrong,
// we fall back to serving the plain product-detail.html page untouched,
// so the site can never end up blank/broken because of this function.

export async function onRequest(context) {
  const { request, env, params } = context;
  const origin = new URL(request.url).origin;
  const plainPageUrl = `${origin}/product-detail.html`;

  try {
    const productId = params.id;

    // 1. Get the base HTML page from the deployed static assets
    const htmlResponse = await env.ASSETS.fetch(plainPageUrl);
    if (!htmlResponse.ok) {
      return env.ASSETS.fetch(request);
    }
    let html = await htmlResponse.text();

    // 2. Get product data
    const dataResponse = await env.ASSETS.fetch(`${origin}/data/products.json`);
    if (!dataResponse.ok) {
      return new Response(html, {
        headers: { 'content-type': 'text/html; charset=UTF-8' },
      });
    }

    const data = await dataResponse.json();
    const products = Array.isArray(data) ? data : data.products;
    const product = products.find((p) => p.id === productId);

    if (!product) {
      return new Response(html, {
        headers: { 'content-type': 'text/html; charset=UTF-8' },
      });
    }

    // 3. Build the meta tag values
    const pageUrl = `${origin}/products/${product.id}`;
    const seoTitle =
      (product.seo && product.seo.metaTitle) || `${product.name} | Satisfaction Unity`;
    const seoDesc =
      (product.seo && product.seo.metaDescription) ||
      (product.description ? product.description.slice(0, 155) : '');

    let seoImage = (product.images && product.images[0]) || '';
    if (seoImage && !/^https?:\/\//i.test(seoImage)) {
      seoImage = `${origin}/${seoImage.replace(/^\//, '')}`;
    }

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

    // 4. Swap the static <title> for ours and inject the rest before </head>
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
