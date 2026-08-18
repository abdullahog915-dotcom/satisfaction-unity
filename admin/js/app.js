(function () {
  let started = false;
  const modules = () => window.AdminModules || {};
  const titles = { dashboard: ['Dashboard','Live content overview'], products: ['Products','Catalog, stock, images and product SEO'], categories: ['Categories','Public collection filters and product choices'], banners: ['Banners','Homepage slider media and ordering'], settings: ['Site Settings','Contact information used across public pages'], seo: ['SEO','Page metadata loaded by browsers and crawlers'], admins: ['Admins','Supabase Auth administrator access'] };
  async function route(name) {
    const module = modules()[name] || modules().dashboard;
    document.querySelectorAll('[data-route]').forEach((button) => button.classList.toggle('active', button.dataset.route === name));
    const [title, subtitle] = titles[name] || titles.dashboard; AdminUI.setHeader(title, subtitle); AdminUI.loading();
    history.replaceState(null, '', `#${name}`); document.getElementById('sidebar').classList.remove('open');
    try { await module.render(window.AdminApp.admin); } catch (error) { console.error(error); AdminUI.content().innerHTML = `<div class="panel empty">${AdminUI.escape(error.message)}</div>`; AdminUI.toast(error.message, 'error'); }
  }
  function start(admin, session) {
    window.AdminApp.admin = admin; window.AdminApp.session = session; document.getElementById('admin-email').textContent = admin.email;
    if (started) return; started = true; AdminUI.bindModal();
    document.getElementById('admin-nav').addEventListener('click', (event) => { const button = event.target.closest('[data-route]'); if (button) route(button.dataset.route); });
    document.getElementById('logout-button').addEventListener('click', AdminAuth.signOut);
    document.getElementById('menu-button').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
    const initial = location.hash.slice(1); route(modules()[initial] ? initial : 'dashboard');
  }
  window.AdminModules = window.AdminModules || {}; window.AdminApp = { start, route, admin: null, session: null };
  document.addEventListener('DOMContentLoaded', () => AdminAuth.init());
})();
