/* Apply live site_settings values to every marked public element. */
(function () {
  const ready = (async () => {
    if (!window.SettingsService) return {};
    const settings = await window.SettingsService.getAll();
    const digits = (value) => String(value || '').replace(/\D/g, '');
    window.__siteWhatsapp = digits(settings.whatsapp);

    document.querySelectorAll('[data-setting-text]').forEach((element) => {
      const value = settings[element.dataset.settingText];
      if (value != null) element.textContent = value;
    });
    document.querySelectorAll('[data-setting-html]').forEach((element) => {
      const value = settings[element.dataset.settingHtml];
      if (value != null) element.textContent = value;
    });
    document.querySelectorAll('[data-setting-link]').forEach((element) => {
      const key = element.dataset.settingLink;
      const value = settings[key];
      if (!value) return;
      if (key === 'phone') element.href = `tel:${digits(value) ? `+${digits(value)}` : value}`;
      else if (key === 'email') element.href = `mailto:${value}`;
      else if (key === 'whatsapp') element.href = `https://wa.me/${digits(value)}`;
      else element.href = value;
    });
    document.querySelectorAll('[data-setting-alt]').forEach((element) => {
      const value = settings[element.dataset.settingAlt];
      if (value) element.alt = value;
    });
    document.querySelectorAll('[data-map-address]').forEach((element) => {
      if (settings.address) element.src = `https://maps.google.com/maps?q=${encodeURIComponent(settings.address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
    });
    document.querySelectorAll('a[href^="tel:"]').forEach((element) => {
      if (!settings.phone) return;
      element.href = `tel:+${digits(settings.phone)}`;
      if (/^[\s+()\d-]+$/.test(element.textContent)) element.textContent = settings.phone;
    });
    document.querySelectorAll('a[href^="mailto:"]').forEach((element) => {
      if (!settings.email) return;
      element.href = `mailto:${settings.email}`;
      if (element.textContent.includes('@')) element.textContent = settings.email;
    });
    document.querySelectorAll('a[href*="wa.me/"]').forEach((element) => {
      if (!settings.whatsapp) return;
      const current = new URL(element.href, window.location.origin);
      element.href = `https://wa.me/${digits(settings.whatsapp)}${current.search}`;
    });
    document.querySelectorAll('iframe[src*="maps.google"]').forEach((element) => {
      if (settings.address) element.src = `https://maps.google.com/maps?q=${encodeURIComponent(settings.address)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;
    });
    if (settings.address) {
      document.querySelectorAll('p').forEach((element) => {
        if (/Ka Lal Bagh|Mufti Tola/i.test(element.textContent)) element.textContent = settings.address;
      });
    }
    if (settings.business_name && settings.business_name !== 'Satisfaction Unity') {
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) {
        if (!['SCRIPT', 'STYLE'].includes(walker.currentNode.parentElement?.tagName)) nodes.push(walker.currentNode);
      }
      nodes.forEach((node) => { node.nodeValue = node.nodeValue.replace(/Satisfaction Unity/g, settings.business_name); });
      document.querySelectorAll('img[alt="Satisfaction Unity"]').forEach((image) => { image.alt = settings.business_name; });
    }
    window.dispatchEvent(new CustomEvent('site-settings-loaded', { detail: settings }));
    return settings;
  })().catch((error) => {
    console.error('Site settings load failed:', error);
    return {};
  });
  window.siteSettingsReady = ready;
})();
