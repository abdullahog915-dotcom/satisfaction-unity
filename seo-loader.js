/* ============================================================
   SEO LOADER (Supabase Version)
   Fetches SEO metadata from Supabase and injects meta title,
   meta description, Open Graph tags, canonical URL, and business
   schema into the current page's <head>.

   Add this to index.html, products.html, about.html, contact.html:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="js/supabase-client.js"></script>
     <script src="seo-loader.js" defer></script>
============================================================= */

(async function () {
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
    if (!url) return;
    let link = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  function applySEO(pageData) {
    if (!pageData) return;
    if (pageData.metaTitle) document.title = pageData.metaTitle;
    upsertMeta('name', 'description', pageData.metaDescription);
    upsertMeta('property', 'og:title', pageData.ogTitle || pageData.metaTitle);
    upsertMeta('property', 'og:description', pageData.ogDescription || pageData.metaDescription);
    upsertMeta('property', 'og:type', 'website');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', pageData.ogTitle || pageData.metaTitle);
    upsertMeta('name', 'twitter:description', pageData.ogDescription || pageData.metaDescription);
    if (pageData.ogImage) {
      upsertMeta('property', 'og:image', pageData.ogImage);
      upsertMeta('name', 'twitter:image', pageData.ogImage);
    }
    if (pageData.canonicalUrl) {
      setCanonical(pageData.canonicalUrl);
    }
  }

  function addSchema(pageData) {
    if (!pageData || !pageData.schemaData) return;
    document.querySelectorAll('script[data-supabase-seo]').forEach((node) => node.remove());
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.supabaseSeo = 'true';
    script.textContent = JSON.stringify(pageData.schemaData);
    document.head.appendChild(script);
  }

  // Determine current page
  const path = window.location.pathname.replace(/\/+$/, ''); // strip trailing slash
  let pageKey = null;
  if (path === '' || path === '/' || path === '/index' || path === '/index.html') pageKey = 'home';
  else if (path === '/products' || path === '/products.html') pageKey = 'products';
  else if (path === '/about' || path === '/about.html') pageKey = 'about';
  else if (path === '/contact' || path === '/contact.html') pageKey = 'contact';

  if (!pageKey) return;

  // Wait for Supabase client to be ready
  if (!window.supabaseClient) {
    console.error('Supabase client not initialized');
    return;
  }

  try {
    // Fetch SEO data from Supabase
    const { data, error } = await window.supabaseClient
      .from('seo_pages')
      .select('*')
      .eq('page_slug', pageKey)
      .single();

    if (error) throw error;

    const pageData = {
      metaTitle: data.meta_title,
      metaDescription: data.meta_description,
      ogTitle: data.og_title,
      ogDescription: data.og_description,
      ogImage: data.og_image_url,
      canonicalUrl: data.canonical_url,
      schemaType: data.schema_type,
      schemaData: data.schema_data
    };

    applySEO(pageData);
    addSchema(pageData);
  } catch (err) {
    console.error('SEO load failed:', err);
  }
})();
