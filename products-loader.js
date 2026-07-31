/* ============================================================
   PRODUCTS LOADER
   Reads data/products.json (edited via the CMS at /admin) and
   renders product cards into any element with id="product-grid".

   Add this to products.html:
     <div id="product-grid"></div>
     <script src="products-loader.js"></script>
============================================================= */

(async function () {
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  try {
    const res = await fetch('/data/products.json', { cache: 'no-store' });
    const data = await res.json();
    const items = data.items || [];

    if (items.length === 0) {
      grid.innerHTML = '<p class="no-products">No products yet. Add some from the admin panel.</p>';
      return;
    }

    grid.innerHTML = items.map(renderCard).join('');
  } catch (err) {
    console.error('Failed to load products:', err);
    grid.innerHTML = '<p class="no-products">Unable to load products right now.</p>';
  }

  function renderCard(p) {
    const stockLabel = p.inStock ? 'In Stock' : 'Out of Stock';
    const stockClass = p.inStock ? 'in-stock' : 'out-of-stock';
    return `
      <article class="product-card" data-sku="${escapeHtml(p.sku || '')}">
        <div class="product-card__image-wrap">
          <img src="${escapeHtml(p.image || '')}" alt="${escapeHtml(p.name)}" loading="lazy">
          <span class="product-card__stock ${stockClass}">${stockLabel}</span>
        </div>
        <div class="product-card__body">
          <span class="product-card__category">${escapeHtml(p.category || '')}</span>
          <h3 class="product-card__name">${escapeHtml(p.name)}</h3>
          <p class="product-card__desc">${escapeHtml(p.shortDescription || '')}</p>
          <div class="product-card__footer">
            <span class="product-card__price">₹${Number(p.price || 0).toLocaleString('en-IN')}</span>
          </div>
        </div>
      </article>
    `;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
