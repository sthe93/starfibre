import { unstable_cache } from 'next/cache'
import { createClient } from '@supabase/supabase-js'
import { supabasePublishableKey, supabaseUrl } from './supabase'

const PAGE_SIZE_DEFAULT = 25
const PAGE_SIZE_MAX = 100
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const serverSupabase = createClient(supabaseUrl, serviceRoleKey || supabasePublishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export type PageInput = { page?: number; pageSize?: number }

export function normalisePagination(input: PageInput) {
  const page = Math.max(1, Number(input.page || 1))
  const requested = Math.max(1, Number(input.pageSize || PAGE_SIZE_DEFAULT))
  const pageSize = Math.min(requested, PAGE_SIZE_MAX)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  return { page, pageSize, from, to }
}

async function selectPage<T>(table: string, options: PageInput & { order?: string; ascending?: boolean } = {}) {
  const { page, pageSize, from, to } = normalisePagination(options)
  let query = serverSupabase.from(table).select('*', { count: 'exact' }).range(from, to)
  if (options.order) query = query.order(options.order, { ascending: options.ascending ?? true })
  const { data, error, count } = await query
  if (error) throw new Error(`${table}: ${error.message}`)
  return { data: (data ?? []) as T[], page, pageSize, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / pageSize) }
}

export const getPublicSiteContent = unstable_cache(async () => {
  const [companyRows, benefits, values, offerings, testimonials, contacts, plans, settingsRows] = await Promise.all([
    selectPage('company_profile', { pageSize: 1 }),
    selectPage('benefits', { order: 'sort_order', pageSize: 12 }),
    selectPage('value_propositions', { order: 'sort_order', pageSize: 12 }),
    selectPage('offerings', { order: 'sort_order', pageSize: 12 }),
    selectPage('testimonials', { pageSize: 12 }),
    selectPage('contact_channels', { order: 'sort_order', pageSize: 12 }),
    selectPage('subscription_plans', { pageSize: 50 }),
    selectPage('settings', { pageSize: 1 }),
  ])

  return {
    company: companyRows.data[0] ?? null,
    benefits: benefits.data,
    values: values.data,
    offerings: offerings.data,
    testimonials: testimonials.data,
    contacts: contacts.data,
    plans: plans.data,
    settings: settingsRows.data[0] ?? null,
  }
}, ['public-site-content'], { revalidate: 300, tags: ['public-site-content'] })

export async function getDashboardData(input: PageInput = {}) {
  const publicContent = await getPublicSiteContent()
  const [customers, invoices, payments, tickets, auditTrail] = await Promise.all([
    selectPage('customers', { ...input, order: 'installation_date', ascending: false }),
    selectPage('invoices', { ...input, order: 'billing_month', ascending: false }),
    selectPage('payments', { ...input, order: 'paid_at', ascending: false }),
    selectPage('tickets', { ...input, order: 'updated_at', ascending: false }),
    selectPage('audit_trail', { page: 1, pageSize: 10, order: 'created_at', ascending: false }),
  ])

  const approvedPayments = payments.data.filter((payment: any) => payment.verification_status === 'approved')
  const pendingPayments = payments.data.filter((payment: any) => payment.verification_status === 'pending_verification')
  const totalOutstanding = invoices.data.reduce((sum: number, invoice: any) => sum + Number(invoice.amount) - Number(invoice.paid_amount), 0)

  return {
    ...publicContent,
    customers: customers.data,
    invoices: invoices.data,
    payments: payments.data,
    tickets: tickets.data,
    auditTrail: auditTrail.data,
    pagination: { customers, invoices, payments, tickets },
    managerOverview: {
      activeCustomers: customers.data.filter((customer: any) => customer.status === 'active').length,
      collectedThisPage: approvedPayments.reduce((sum: number, payment: any) => sum + Number(payment.amount), 0),
      totalOutstandingThisPage: totalOutstanding,
      openTickets: tickets.data.filter((ticket: any) => ticket.status !== 'resolved').length,
      pendingReconciliation: pendingPayments.length,
    },
  }
}
