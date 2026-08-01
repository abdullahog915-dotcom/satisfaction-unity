/* ============================================================
   SEO LOADER
   Reads data/seo.json (edited via the CMS at /admin) and injects
   meta title, meta description, Open Graph tags, canonical URL,
   and business schema into the current page's <head>.

   Add this to index.html, products.html, about.html, contact.html:
     <script src="seo-loader.js" defer></script>
============================================================= */

(function () {
  function upsertMeta(attr, key, content) {
    if (!content) return;
    let tag = document.querySelector('meta[' + attr + '="' + key + '"]');
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute(attr, key);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  }

  function setCanonical(url) {
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  function applySEO(pageData, ogImage) {
    if (!pageData) return;
    if (pageData.metaTitle) document.title = pageData.metaTitle;
    upsertMeta('name', 'description', pageData.metaDescription);
    upsertMeta('property', 'og:title', pageData.metaTitle);
    upsertMeta('property', 'og:description', pageData.metaDescription);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', pageData.metaTitle);
    upsertMeta('name', 'twitter:description', pageData.metaDescription);
    if (ogImage) {
      upsertMeta('property', 'og:image', ogImage);
      upsertMeta('name', 'twitter:image', ogImage);
    }
    // Canonical left as current path only (no domain) until custom
    // domain is finalized. Safe to leave relative-free for now.
  }

  function addSchema(seo) {
    if (!seo || !seo.schema) return;
    const s = seo.schema;
    const ld = {
      '@context': 'https://schema.org',
      '@type': s.type || 'HomeGoodsStore',
      name: s.name || 'Satisfaction Unity'
    };
    if (s.logo) ld.logo = s.logo;
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(ld);
    document.head.appendChild(script);
  }

  const path = window.location.pathname;
  let pageKey = null;
  if (path === '/' || path.endsWith('/index.html') || path === '') pageKey = 'home';
  else if (path.endsWith('/products.html')) pageKey = 'products';
  else if (path.endsWith('/about.html')) pageKey = 'about';
  else if (path.endsWith('/contact.html')) pageKey = 'contact';

  if (!pageKey) return;

  fetch('/data/seo.json', { cache: 'no-store' })
    .then(function (res) { return res.json(); })
    .then(function (seo) {
      applySEO(seo[pageKey], seo.ogImage);
      addSchema(seo);
    })
    .catch(function (err) { console.error('SEO load failed:', err); });
})();
