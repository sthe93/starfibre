export const supabaseConfig = { url: import.meta.env.VITE_SUPABASE_URL, anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY }
export async function supabaseRest(path, init = {}) {
  if (!supabaseConfig.url || !supabaseConfig.anonKey) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect Supabase.')
  return fetch(`${supabaseConfig.url}/rest/v1/${path}`, { ...init, headers: { apikey: supabaseConfig.anonKey, Authorization: `Bearer ${supabaseConfig.anonKey}`, 'Content-Type': 'application/json', ...(init.headers || {}) } })
}
