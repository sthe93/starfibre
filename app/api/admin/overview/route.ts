import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { supabasePublishableKey, supabaseUrl } from '@/lib/supabase'

function authedClient(accessToken: string) {
  return createClient(supabaseUrl, supabasePublishableKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  })
}

async function selectTable<T>(client: ReturnType<typeof authedClient>, table: string, orderColumn?: string) {
  const query = client.from(table).select('*')
  const { data, error } = orderColumn ? await query.order(orderColumn) : await query
  if (error) throw error
  return (data ?? []) as T[]
}

export async function GET(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

  if (!token) {
    return NextResponse.json({ error: 'Missing bearer token.' }, { status: 401 })
  }

  const client = authedClient(token)
  const { data: userData, error: userError } = await client.auth.getUser(token)

  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await client
    .from('user_profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin role required.' }, { status: 403 })
  }

  try {
    const [customers, invoices, payments, settingsRows, tickets] = await Promise.all([
      selectTable(client, 'customers'),
      selectTable(client, 'invoices', 'billing_month'),
      selectTable(client, 'payments'),
      selectTable(client, 'settings'),
      selectTable(client, 'tickets'),
    ])

    return NextResponse.json({ customers, invoices, payments, settings: settingsRows[0] ?? null, tickets })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to load admin overview.' }, { status: 500 })
  }
}
