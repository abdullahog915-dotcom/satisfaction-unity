// functions/products/[id].js
// Cloudflare Pages Function
// Runs at the edge for every request to /products/:id
// Injects correct og:image / og:title / og:description into the HTML
// BEFORE it reaches the browser or a crawler (WhatsApp, Facebook, etc).
// This is required because WhatsApp's link-preview bot does NOT run
// JavaScript, so tags added by client-side JS are invisible to it.

export async function onRequest(context) {
  const { request, env, params } = context;
  const productId = params.id;

  // 1. Get the base HTML page (product-detail.html) from the deployed assets
  const baseUrl = new URL('/product-detail.html', request.url);
  const htmlResponse = await env.ASSETS.fetch(new Request(baseUrl, request));
  let html = await htmlResponse.text();

  // 2. Get product data
  const dataUrl = new URL('/data/products.json', request.url);
  const dataResponse = await env.ASSETS.fetch(new Request(dataUrl, request));

  if (!dataResponse.ok) {
    // Fallback: just serve the plain page if data fetch fails
    return new Response(html, {
      headers: { 'content-type': 'text/html; charset=UTF-8' },
    });
  }

  const data = await dataResponse.json();
  const products = Array.isArray(data) ? data : data.products;
  const product = products.find((p) => p.id === productId);

  if (!product) {
    return new Response(html, {
      status: 404,
      headers: { 'content-type': 'text/html; charset=UTF-8' },
    });
  }

  // 3. Build the meta tag values
  const pageUrl = `https://satisfaction-unity.pages.dev/products/${product.id}`;
  const seoTitle =
    (product.seo && product.seo.metaTitle) || `${product.name} | Satisfaction Unity`;
  const seoDesc =
    (product.seo && product.seo.metaDescription) ||
    (product.description ? product.description.slice(0, 155) : '');
  let seoImage = (product.images && product.images[0]) || '';
  if (seoImage && !/^https?:\/\//i.test(seoImage)) {
    // Convert relative path (e.g. "assets/products/lamp-02-1.png") to an
    // absolute URL, since WhatsApp/Facebook require a full URL for previews.
    seoImage = new URL(seoImage, request.url).toString();
  }

  const escape = (str) =>
    String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

  const metaTags = `
<title>${escape(seoTitle)}</title>
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

  // 4. Remove any existing <title> tag from the template and inject our tags
  //    right before </head>, so they load instantly with the raw HTML.
  html = html.replace(/<title>.*?<\/title>/i, '');
  html = html.replace('</head>', `${metaTags}\n</head>`);

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=UTF-8' },
  });
}
