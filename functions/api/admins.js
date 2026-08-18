import { DEFAULT_SUPABASE_ANON_KEY, DEFAULT_SUPABASE_URL, json } from '../_shared/supabase.js';

async function userId(url, anonKey, token) {
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: `Bearer ${token}` } });
  if (!response.ok) return '';
  return (await response.json()).id || '';
}

async function authorize(request, env) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const url = env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  const id = await userId(url, anonKey, token);
  const response = await fetch(`${url}/rest/v1/admins?select=id,email,full_name,role,status&id=eq.${encodeURIComponent(id)}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const [admin] = await response.json();
  return admin?.status === 'active' ? { ...admin, token } : null;
}

function serviceHeaders(env, extra = {}) {
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'content-type': 'application/json',
    ...extra,
  };
}

export async function onRequest({ request, env }) {
  try {
    const caller = await authorize(request, env);
    if (!caller) return json({ error: 'Unauthorized' }, 401);
    if (caller.role !== 'super_admin') return json({ error: 'Super-admin access required' }, 403);
    const url = env.SUPABASE_URL || DEFAULT_SUPABASE_URL;

    if (request.method === 'GET') {
      const response = await fetch(`${url}/rest/v1/admins?select=id,email,full_name,role,status,created_at,last_login&order=created_at.asc`, { headers: serviceHeaders(env) });
      return new Response(await response.text(), { status: response.status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    }
    if (request.method === 'POST') {
      const body = await request.json();
      const email = String(body.email || '').trim().toLowerCase();
      const role = body.role === 'super_admin' ? 'super_admin' : 'admin';
      if (!email || !/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'A valid email is required' }, 400);
      const redirectTo = `${new URL(request.url).origin}/admin/?reset=1`;
      const invite = await fetch(`${url}/auth/v1/invite?redirect_to=${encodeURIComponent(redirectTo)}`, {
        method: 'POST', headers: serviceHeaders(env),
        body: JSON.stringify({ email, data: { full_name: String(body.full_name || '').trim() } }),
      });
      const invitedUser = await invite.json();
      if (!invite.ok) return json({ error: invitedUser.msg || invitedUser.message || 'Invitation failed' }, invite.status);
      const insert = await fetch(`${url}/rest/v1/admins`, {
        method: 'POST', headers: serviceHeaders(env, { Prefer: 'return=representation,resolution=merge-duplicates' }),
        body: JSON.stringify({ id: invitedUser.id, email, full_name: String(body.full_name || '').trim() || null, role, status: 'active' }),
      });
      const inserted = await insert.json();
      if (!insert.ok) {
        await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(invitedUser.id)}`, { method: 'DELETE', headers: serviceHeaders(env) });
        return json({ error: inserted.message || 'Admin record could not be created' }, insert.status);
      }
      return json(Array.isArray(inserted) ? inserted[0] : inserted, 201);
    }
    if (request.method === 'DELETE') {
      const targetId = new URL(request.url).searchParams.get('id');
      if (!targetId) return json({ error: 'Admin id is required' }, 400);
      if (targetId === caller.id) return json({ error: 'You cannot deactivate your own account' }, 400);
      const activeResponse = await fetch(`${url}/rest/v1/admins?select=id&status=eq.active`, { headers: serviceHeaders(env) });
      const activeAdmins = await activeResponse.json();
      if (activeAdmins.length <= 1) return json({ error: 'The final active admin cannot be removed' }, 409);
      const update = await fetch(`${url}/rest/v1/admins?id=eq.${encodeURIComponent(targetId)}`, {
        method: 'PATCH', headers: serviceHeaders(env, { Prefer: 'return=representation' }),
        body: JSON.stringify({ status: 'inactive' }),
      });
      if (!update.ok) return json({ error: (await update.json()).message || 'Admin could not be deactivated' }, update.status);
      return json({ ok: true });
    }
    return json({ error: 'Method not allowed' }, 405);
  } catch (error) {
    console.error('Admin API failed', error);
    return json({ error: error.message || 'Server error' }, 500);
  }
}
