import { createClient } from '@supabase/supabase-js'
import { supabasePublishableKey, supabaseUrl } from './supabase'

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const jobsSupabase = createClient(supabaseUrl, serviceRoleKey || supabasePublishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export async function runPaymentAllocationJob(batchSize = 500) {
  const { data, error } = await jobsSupabase.rpc('allocate_approved_payments_batch', { p_limit: batchSize })
  if (error) throw new Error(`payment allocation failed: ${error.message}`)
  return { allocatedPayments: Number(data ?? 0), batchSize }
}

export async function runReminderJob(batchSize = 1000) {
  const { data, error } = await jobsSupabase.rpc('queue_overdue_reminders', { p_limit: batchSize })
  if (error) throw new Error(`reminder queue failed: ${error.message}`)
  return { queuedReminders: Number(data ?? 0), batchSize }
}

export function authorizeJobRequest(request: Request) {
  const configuredSecret = process.env.JOB_SECRET
  if (!configuredSecret) return process.env.NODE_ENV !== 'production'
  return request.headers.get('authorization') === `Bearer ${configuredSecret}`
}
