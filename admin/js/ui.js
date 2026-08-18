(function () {
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const content = () => document.getElementById('module-content');
  function toast(message, type = 'success') {
    const node = document.createElement('div'); node.className = `toast ${type}`; node.textContent = message;
    document.getElementById('toast-region').appendChild(node); setTimeout(() => node.remove(), 4200);
  }
  function openModal(html) { document.getElementById('modal-content').innerHTML = html; document.getElementById('modal').classList.remove('hidden'); }
  function closeModal() { document.getElementById('modal').classList.add('hidden'); document.getElementById('modal-content').innerHTML = ''; }
  function loading() { content().innerHTML = '<div class="loading">Loading live Supabase data…</div>'; }
  function setHeader(title, subtitle = '') { document.getElementById('page-title').textContent = title; document.getElementById('page-subtitle').textContent = subtitle; }
  function slugify(value) { return String(value || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function safeFileName(value) { return String(value || 'upload').toLowerCase().replace(/[^a-z0-9._-]/g, '-'); }
  async function confirm(message) { return window.confirm(message); }
  function bindModal() { document.getElementById('modal-close').addEventListener('click', closeModal); document.getElementById('modal').addEventListener('click', (event) => { if (event.target.id === 'modal') closeModal(); }); }
  window.AdminUI = { escape, content, toast, openModal, closeModal, loading, setHeader, slugify, safeFileName, confirm, bindModal };
})();
