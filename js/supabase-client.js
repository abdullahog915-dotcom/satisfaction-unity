/* ============================================================
   SUPABASE CLIENT
   Initialize Supabase client for customer-facing website
   SECURITY: Only use publishable/anon key in frontend
============================================================= */

const SUPABASE_URL = 'https://rguxjldnoxvwbfsgkazs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJndXhqbGRub3h2d2Jmc2drYXpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4ODEzMzksImV4cCI6MjEwMjQ1NzMzOX0.nUiAgCGDYb8i5Um_Htw7_0YVTTEDjtHSAQE1oIptYRA';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other scripts
window.supabaseClient = supabase;
