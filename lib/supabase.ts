import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://dlcfereziopqevrgiqaj.supabase.co'
export const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_OKuLDae8kJdTbIcWx8UK1g_EV09czpp'

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
