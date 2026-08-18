export const DEFAULT_SUPABASE_URL = 'https://rguxjldnoxvwbfsgkazs.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJndXhqbGRub3h2d2Jmc2drYXpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4ODEzMzksImV4cCI6MjEwMjQ1NzMzOX0.nUiAgCGDYb8i5Um_Htw7_0YVTTEDjtHSAQE1oIptYRA';

export function publicConfig(env) {
  return {
    url: env.SUPABASE_URL || DEFAULT_SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY,
  };
}

export function restHeaders(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
