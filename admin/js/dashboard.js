(function () {
  async function render() {
    const { data, error } = await supabaseClient.rpc('admin_dashboard_counts'); if (error) throw error;
    const values = [data.products, data.active_products, data.categories, data.banners, data.admins];
    const labels = ['Total products','Active products','Categories','Banners','Admins'];
    AdminUI.content().innerHTML = `<div class="stats">${labels.map((label, index) => `<article class="stat"><span class="muted">${label}</span><strong>${values[index]}</strong></article>`).join('')}</div><div class="panel" style="margin-top:20px"><h2>Live website sync</h2><p>All modules on this dashboard write directly to Supabase. Public pages fetch the same records on reload; normal content edits do not require a GitHub commit or Cloudflare deployment.</p></div>`;
  }
  window.AdminModules = window.AdminModules || {}; window.AdminModules.dashboard = { render };
})();
