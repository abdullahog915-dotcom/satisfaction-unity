(function () {
  const authView = () => document.getElementById('auth-view');
  const deniedView = () => document.getElementById('access-denied');
  const adminView = () => document.getElementById('admin-view');
  const message = (text, isError = true) => { const node = document.getElementById('auth-message'); node.textContent = text; node.style.color = isError ? '#b42318' : '#137a3d'; };

  async function getAdmin(user) {
    const { data, error } = await window.supabaseClient.from('admins').select('id,email,full_name,role,status').eq('id', user.id).maybeSingle();
    if (error) throw error;
    return data?.status === 'active' ? data : null;
  }
  async function authorize(session) {
    if (!session?.user) { showLogin(); return; }
    try {
      const admin = await getAdmin(session.user);
      if (!admin) { authView().classList.add('hidden'); adminView().classList.add('hidden'); deniedView().classList.remove('hidden'); return; }
      if (new URLSearchParams(location.search).has('reset')) {
        authView().classList.remove('hidden'); adminView().classList.add('hidden'); deniedView().classList.add('hidden');
        document.getElementById('login-form').classList.add('hidden'); document.getElementById('reset-form').classList.remove('hidden');
        return;
      }
      authView().classList.add('hidden'); deniedView().classList.add('hidden'); adminView().classList.remove('hidden');
      window.AdminApp.start(admin, session);
      window.supabaseClient.from('admins').update({ last_login: new Date().toISOString() }).eq('id', admin.id).then(() => {});
    } catch (error) { message(error.message); showLogin(); }
  }
  function showLogin() { authView().classList.remove('hidden'); deniedView().classList.add('hidden'); adminView().classList.add('hidden'); }
  async function signOut() { await window.supabaseClient.auth.signOut(); window.location.replace('/admin/'); }
  async function init() {
    document.getElementById('login-form').addEventListener('submit', async (event) => {
      event.preventDefault(); message('', false); const button = event.submitter; button.disabled = true;
      const { error } = await window.supabaseClient.auth.signInWithPassword({ email: document.getElementById('login-email').value.trim(), password: document.getElementById('login-password').value });
      button.disabled = false; if (error) message(error.message);
    });
    document.getElementById('forgot-password').addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim(); if (!email) { message('Enter your email address first.'); return; }
      const { error } = await window.supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/admin/?reset=1` });
      message(error ? error.message : 'Password reset email sent.', Boolean(error));
    });
    document.getElementById('reset-form').addEventListener('submit', async (event) => {
      event.preventDefault(); const { error } = await window.supabaseClient.auth.updateUser({ password: document.getElementById('new-password').value });
      if (error) message(error.message); else { history.replaceState(null, '', '/admin/'); document.getElementById('reset-form').classList.add('hidden'); const { data } = await window.supabaseClient.auth.getSession(); await authorize(data.session); }
    });
    document.getElementById('denied-signout').addEventListener('click', signOut);
    if (new URLSearchParams(location.search).has('reset')) { document.getElementById('login-form').classList.add('hidden'); document.getElementById('reset-form').classList.remove('hidden'); }
    window.supabaseClient.auth.onAuthStateChange((event, session) => { if (event === 'PASSWORD_RECOVERY') { document.getElementById('login-form').classList.add('hidden'); document.getElementById('reset-form').classList.remove('hidden'); } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') authorize(session); });
    const { data } = await window.supabaseClient.auth.getSession(); await authorize(data.session);
  }
  window.AdminAuth = { init, signOut };
})();
