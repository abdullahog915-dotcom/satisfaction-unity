(function () {
  window.SUPABASE_HOME_LOADER = true;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  function renderBannerContent(slide) {
    if (!slide.title && !slide.subtitle && !slide.cta_text) return '';
    return `<div class="hero-content"><div class="hero-content-inner">
      ${slide.title ? `<h1 class="hero-text hero-text-2 font-display text-[56px] md:text-[68px] font-[700] leading-[1.05] text-white mb-5 max-md:text-[36px]">${escapeHtml(slide.title)}</h1>` : ''}
      ${slide.subtitle ? `<p class="hero-text hero-text-3 font-body text-[18px] md:text-[22px] font-[300] leading-[1.5] text-white/80 max-w-[520px] mb-10 max-md:text-[16px]">${escapeHtml(slide.subtitle)}</p>` : ''}
      ${slide.cta_text && slide.cta_link ? `<a class="hero-text hero-text-4 inline-flex items-center justify-center px-8 py-3.5 bg-white text-ink rounded-full" href="${escapeHtml(slide.cta_link)}">${escapeHtml(slide.cta_text)}</a>` : ''}
    </div></div>`;
  }

  async function loadBanners() {
    const slider = document.getElementById('hero-slider');
    const indicators = document.querySelector('.hero-indicators');
    if (!slider || !indicators) return;
    const result = await window.BannerService.getAll();
    const slides = result.slides || [];
    if (!slides.length) {
      slider.innerHTML = '<div class="hero-slide active flex items-center justify-center text-ink-muted">No active banners.</div>';
      indicators.innerHTML = '';
      return;
    }
    slider.innerHTML = slides.map((slide, index) => {
      const src = slide.type === 'video' ? slide.video : slide.image;
      const media = slide.type === 'video'
        ? `<video class="hero-slide-media" muted playsinline preload="metadata" src="${escapeHtml(src)}"></video>`
        : `<img class="hero-slide-media" src="${escapeHtml(src)}" alt="${escapeHtml(slide.title || '')}" ${index ? 'loading="lazy"' : ''}>`;
      return `<div class="hero-slide${index === 0 ? ' active' : ''}" data-index="${index}" role="group" aria-label="Slide ${index + 1} of ${slides.length}">${media}${renderBannerContent(slide)}</div>`;
    }).join('');
    indicators.innerHTML = slides.map((_, index) => `<button class="hero-ind${index === 0 ? ' active' : ''}" role="tab" aria-selected="${index === 0}" aria-label="Slide ${index + 1}" data-index="${index}" type="button"></button>`).join('');
    initSlider(slides.length);
  }

  function initSlider(total) {
    const slides = [...document.querySelectorAll('#hero-slider .hero-slide')];
    const dots = [...document.querySelectorAll('.hero-ind')];
    let current = 0;
    let timer;
    let touchStartX = 0;
    const schedule = () => { clearTimeout(timer); const video = slides[current]?.querySelector('video'); if (!video) timer = setTimeout(() => goTo(current + 1), 5000); };
    const goTo = (value) => {
      clearTimeout(timer);
      slides[current]?.querySelector('video')?.pause();
      current = (value + total) % total;
      slides.forEach((slide, index) => { slide.classList.toggle('active', index === current); slide.setAttribute('aria-hidden', String(index !== current)); });
      dots.forEach((dot, index) => { dot.classList.toggle('active', index === current); dot.setAttribute('aria-selected', String(index === current)); });
      const video = slides[current]?.querySelector('video');
      if (video) { video.currentTime = 0; video.play().catch(() => schedule()); } else schedule();
    };
    document.getElementById('hero-next')?.addEventListener('click', () => goTo(current + 1));
    document.getElementById('hero-prev')?.addEventListener('click', () => goTo(current - 1));
    dots.forEach((dot, index) => dot.addEventListener('click', () => goTo(index)));
    slides.forEach((slide) => slide.querySelector('video')?.addEventListener('ended', () => goTo(current + 1)));
    const slider = document.getElementById('hero-slider');
    slider.addEventListener('touchstart', (event) => { touchStartX = event.changedTouches[0].screenX; }, { passive: true });
    slider.addEventListener('touchend', (event) => { const delta = touchStartX - event.changedTouches[0].screenX; if (Math.abs(delta) > 50) goTo(current + (delta > 0 ? 1 : -1)); }, { passive: true });
    goTo(0);
  }

  async function loadProducts() {
    const grid = document.getElementById('home-product-grid');
    if (!grid) return;
    let products = await window.ProductService.getFeatured(6);
    if (!products.length) products = (await window.ProductService.getAll()).slice(0, 6);
    if (!products.length) {
      grid.innerHTML = '<p class="col-span-full text-center text-ink-dim">No published products are currently available.</p>';
      return;
    }
    grid.innerHTML = products.map((product, index) => {
      const images = product.images || [];
      const primaryAlt = product.imageAlts?.[0] || product.seo?.imageAlt || product.name;
      const secondaryAlt = product.imageAlts?.[1] || primaryAlt;
      const secondary = images[1] ? `<img src="${escapeHtml(images[1])}" alt="${escapeHtml(secondaryAlt)}" class="product-img-secondary" loading="lazy">` : '';
      return `<a href="/products/${encodeURIComponent(product.id)}" class="product-card group reveal" data-delay="${(index % 3) * 80}"><div class="product-img-container"><img src="${escapeHtml(images[0] || '')}" alt="${escapeHtml(primaryAlt)}" class="product-img-primary" loading="lazy">${secondary}<div class="absolute top-3 left-3 z-10"><span class="bg-white/90 text-ink text-[10px] font-[600] uppercase px-2.5 py-1 rounded-full">${escapeHtml(product.category)}</span></div></div><div class="p-5"><h3 class="font-display text-[17px] font-[600] text-ink mb-1">${escapeHtml(product.name)}</h3><p class="font-body text-[12px] text-ink-dim uppercase mb-3">${escapeHtml(product.material || '')}</p><span class="font-body text-[17px] font-[600] text-ink">₹${Number(product.price).toLocaleString('en-IN')}</span></div></a>`;
    }).join('');
    window.dispatchEvent(new Event('public-products-rendered'));
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadBanners().catch((error) => console.error('Banner load failed:', error));
    loadProducts().catch((error) => console.error('Featured products load failed:', error));
  });
})();
