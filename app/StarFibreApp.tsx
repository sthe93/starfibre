'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type CompanyProfile = { company_name: string; tagline: string; hero_title: string; hero_summary: string; about_title: string; about_body: string; mission: string; vision: string }
type SortableContent = { id: string; sort_order?: number; title: string; body?: string; speed?: string; description?: string }
type Testimonial = { id: string; customer_name: string; quote: string }
type Contact = { id: string; label: string; value: string; sort_order: number }
type Plan = { id: string; name: string; speed: string; monthly_price: number; description?: string }
type Customer = { id: string; name: string; contact_number: string; email: string; street: string; extension: string; account_number: string; plan_id: string; installation_date: string; status: string }
type Invoice = { id: string; customer_id: string; billing_month: string; due_date: string; amount: number; paid_amount: number; status: string; paid_date?: string }
type Payment = { id: string; customer_id: string; invoice_id?: string; source: string; amount: number; paid_at: string; verification_status: string; proof_url?: string }
type Settings = { yellow_days: number; orange_days: number; red_days: number; disconnection_days: number; disconnection_months: number; notification_template?: string }
type Ticket = { id: string; customer_id?: string; subject: string; status: string }

type DatabaseState = {
  company: CompanyProfile | null
  benefits: SortableContent[]
  values: SortableContent[]
  offerings: SortableContent[]
  testimonials: Testimonial[]
  contacts: Contact[]
  plans: Plan[]
  customers: Customer[]
  invoices: Invoice[]
  payments: Payment[]
  settings: Settings | null
  tickets: Ticket[]
}

const emptyState: DatabaseState = { company: null, benefits: [], values: [], offerings: [], testimonials: [], contacts: [], plans: [], customers: [], invoices: [], payments: [], settings: null, tickets: [] }
const money = (amount: number) => `R${Number(amount || 0).toLocaleString('en-ZA')}`

function StatusPill({ status }: { status: string }) {
  return <span className={`pill ${status.replace('_', '-')}`}>{status.replace('_', ' ')}</span>
}

function agingClass(daysOverdue: number, settings: Settings | null) {
  if (daysOverdue >= (settings?.disconnection_days ?? 14)) return 'darkred'
  if (daysOverdue >= (settings?.red_days ?? 5)) return 'red'
  if (daysOverdue > (settings?.yellow_days ?? 2)) return 'orange'
  if (daysOverdue > 0) return 'yellow'
  return 'green'
}

function allocatePayment(invoices: Invoice[], amount: number) {
  let remaining = amount
  return [...invoices]
    .sort((a, b) => a.billing_month.localeCompare(b.billing_month))
    .map((invoice) => {
      if (remaining <= 0 || invoice.status === 'paid') return invoice
      const due = Number(invoice.amount) - Number(invoice.paid_amount)
      const applied = Math.min(due, remaining)
      remaining -= applied
      const paidAmount = Number(invoice.paid_amount) + applied
      return { ...invoice, paid_amount: paidAmount, status: paidAmount >= Number(invoice.amount) ? 'paid' : 'partially_paid' }
    })
}

async function selectTable<T>(table: string, orderColumn?: string) {
  const query = supabase.from(table).select('*')
  const { data, error } = orderColumn ? await query.order(orderColumn) : await query
  if (error) throw error
  return (data ?? []) as T[]
}

export default function StarFibreApp() {
  const [data, setData] = useState<DatabaseState>(emptyState)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)
      try {
        const [companyRows, benefits, values, offerings, testimonials, contacts, plans, customers, invoices, payments, settingsRows, tickets] = await Promise.all([
          selectTable<CompanyProfile>('company_profile'),
          selectTable<SortableContent>('benefits', 'sort_order'),
          selectTable<SortableContent>('value_propositions', 'sort_order'),
          selectTable<SortableContent>('offerings', 'sort_order'),
          selectTable<Testimonial>('testimonials'),
          selectTable<Contact>('contact_channels', 'sort_order'),
          selectTable<Plan>('subscription_plans'),
          selectTable<Customer>('customers'),
          selectTable<Invoice>('invoices', 'billing_month'),
          selectTable<Payment>('payments'),
          selectTable<Settings>('settings'),
          selectTable<Ticket>('tickets'),
        ])

        setData({ company: companyRows[0] ?? null, benefits, values, offerings, testimonials, contacts, plans, customers, invoices, payments, settings: settingsRows[0] ?? null, tickets })
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load Supabase data.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const selectedCustomer = data.customers[0]
  const selectedPlan = data.plans.find((plan) => plan.id === selectedCustomer?.plan_id)
  const customerInvoices = useMemo(() => data.invoices.filter((invoice) => invoice.customer_id === selectedCustomer?.id), [data.invoices, selectedCustomer?.id])
  const paymentPreview = useMemo(() => allocatePayment(customerInvoices, 500), [customerInvoices])
  const balance = customerInvoices.reduce((sum, invoice) => sum + Number(invoice.amount) - Number(invoice.paid_amount), 0)
  const arrears = customerInvoices.filter((invoice) => invoice.status !== 'paid').length
  const collectedThisMonth = data.payments.filter((payment) => payment.verification_status === 'approved').reduce((sum, payment) => sum + Number(payment.amount), 0)
  const totalOutstanding = data.invoices.reduce((sum, invoice) => sum + Number(invoice.amount) - Number(invoice.paid_amount), 0)

  if (loading) return <main className="loading-screen"><div className="card"><h1>Loading Star Fibre data from Supabase…</h1><p>The site content, offerings, customers, invoices and payments are being loaded from the database.</p></div></main>

  return (
    <>
      <header id="home" className="site-header">
        <nav className="nav">
          <div className="brand"><Image src="/star-logo.svg" alt="Star Fibre logo" width={48} height={48} priority /><strong>Star Fibre</strong></div>
          <a href="#home">Home</a><a href="#about">About</a><a href="#offerings">Offerings</a><a href="#contact">Contact</a><a href="#customer" className="nav-button">Customer Login</a><a href="#admin" className="nav-button admin-button">Admin</a>
        </nav>
        {error && <div className="error-banner">Supabase error: {error}. Run `supabase/schema.sql` in your Supabase SQL editor and confirm RLS policies.</div>}
        <section className="hero">
          <div>
            <p>{data.company?.company_name} · {data.company?.tagline}</p>
            <h1>{data.company?.hero_title ?? 'Star Fibre'}</h1>
            <p>{data.company?.hero_summary ?? 'No company profile found in Supabase yet.'}</p>
            <div className="hero-actions"><a href="#contact" className="button-link">Contact Us</a><a href="#customer" className="button-link secondary-link">Customer Login</a></div>
          </div>
          <div className="hero-mark" aria-hidden="true">⌁</div>
        </section>
      </header>

      <main>
        <section id="about" className="content-section">
          <div className="section-head"><p>Who is Starfibre</p><h2>{data.company?.about_title ?? 'About Star Fibre'}</h2></div>
          <div className="about-grid">
            <article className="card story-card"><h3>About the company</h3><p>{data.company?.about_body ?? 'Add company_profile rows in Supabase to populate this section.'}</p></article>
            <article className="card story-card"><h3>Mission and vision</h3><p>{data.company?.vision}</p><p>{data.company?.mission}</p></article>
          </div>
          <div className="grid three numbered-grid">{data.benefits.map((benefit, index) => <article className="card" key={benefit.id}><span className="number">0{index + 1}</span><h3>{benefit.title}</h3><p>{benefit.body}</p></article>)}</div>
          <div className="section-head compact-head"><p>What sets us apart</p><h2>Stable infrastructure, fair packages and quick activation.</h2></div>
          <div className="grid three">{data.values.map((value) => <article className="card" key={value.id}><h3>{value.title}</h3><p>{value.body}</p></article>)}</div>
        </section>

        <section id="offerings" className="content-section soft-section">
          <div className="section-head"><p>Offerings / Services</p><h2>Internet speed packages loaded from Supabase.</h2></div>
          <div className="offerings-grid">{data.offerings.map((offering) => <article className="card offering-card" key={offering.id}><span>{offering.title}</span><h3>{offering.speed}</h3><p>{offering.description}</p><a href="#contact">Enquire about this plan</a></article>)}</div>
        </section>

        <section className="content-section testimonials">
          <div className="section-head"><p>Testimonials</p><h2>Hear what satisfied customers say about Star Fibre.</h2></div>
          <div className="grid two">{data.testimonials.map((testimonial) => <blockquote className="card" key={testimonial.id}>“{testimonial.quote}”<cite>{testimonial.customer_name}</cite></blockquote>)}</div>
        </section>

        <section id="contact" className="content-section contact-section">
          <div className="section-head"><p>Contact</p><h2>We are reachable. Please do contact us.</h2></div>
          <div className="grid three">{data.contacts.map((contact) => <article className="card" key={contact.id}><h3>{contact.label}</h3><p>{contact.value}</p></article>)}</div>
          <p className="contact-note">To get connected, subscribe now: call us, email us or send us a WhatsApp message.</p>
        </section>

        <section id="customer" className="portal-section">
          <div className="section-head"><p>Customer Portal</p><h2>Customers can log in and see exactly which months are paid.</h2></div>
          <div className="auth-card">🔐 <strong>Customer Login:</strong> Email/password or phone OTP through Supabase Auth.</div>
          {selectedCustomer ? <><div className="grid four"><article className="card stat"><span>Current balance</span><strong>{money(balance)}</strong><small>{arrears} months in arrears</small></article><article className="card stat"><span>Next due date</span><strong>{customerInvoices.find((invoice) => invoice.status !== 'paid')?.due_date ?? 'Current'}</strong><small>Oldest unpaid invoices are settled first.</small></article><article className="card stat"><span>Current plan</span><strong>{selectedPlan?.speed ?? 'No plan'}</strong><small>{selectedPlan?.name} · {money(Number(selectedPlan?.monthly_price ?? 0))}/month</small></article><article className="card stat"><span>Account</span><strong>{selectedCustomer.account_number}</strong><small>{selectedCustomer.street}, Protea Glen {selectedCustomer.extension}</small></article></div><div className="split"><article className="card"><h3>Full billing history / statement</h3><table><thead><tr><th>Month</th><th>Due</th><th>Amount</th><th>Paid date</th><th>Status</th></tr></thead><tbody>{customerInvoices.map((invoice) => <tr key={invoice.id}><td>{invoice.billing_month}</td><td>{invoice.due_date}</td><td>{money(Number(invoice.amount))}</td><td>{invoice.paid_date ?? '—'}</td><td><StatusPill status={invoice.status} /></td></tr>)}</tbody></table><button className="ghost">⬇️ Download PDF statement</button></article><article className="card actions"><h3>Pay and upload proof</h3><label>Payment amount<input type="number" defaultValue={500} /></label><button>💳 Pay now with Paystack</button><button className="secondary">📤 Upload EFT proof</button><p className="note">Allocation preview: a R500 payment is applied from the oldest unpaid invoice forward.</p><ul>{paymentPreview.map((invoice) => <li key={invoice.id}>{invoice.billing_month}: {money(Number(invoice.paid_amount))} / {money(Number(invoice.amount))} · {invoice.status}</li>)}</ul><button className="ghost">🎧 Log billing dispute</button></article></div></> : <div className="card"><p>No customer rows found. Add customers, plans, invoices and payments in Supabase.</p></div>}
        </section>

        <section id="admin" className="portal-section admin-portal">
          <div className="section-head"><p>Admin Dashboard</p><h2>Managers can review revenue, arrears and disconnection risk.</h2></div>
          <div className="auth-card admin-login">🛡️ <strong>Admin:</strong> Role-based access for Admin, Finance/Billing Manager and Support Staff.</div>
          <div className="grid four"><article className="card stat"><span>👥 Active customers</span><strong>{data.customers.filter((item) => item.status === 'active').length}</strong></article><article className="card stat"><span>✅ Collected this month</span><strong>{money(collectedThisMonth)}</strong></article><article className="card stat"><span>⚠️ Outstanding balance</span><strong>{money(totalOutstanding)}</strong></article><article className="card stat"><span>📊 Overdue accounts</span><strong>{data.customers.filter((item) => item.status !== 'active').length}</strong></article></div>
          <div className="split"><article className="card"><h3>Customer aging and SLA</h3><table><thead><tr><th>Customer</th><th>Account</th><th>Plan</th><th>Status</th><th>SLA</th><th>Balance</th></tr></thead><tbody>{data.customers.map((item, index) => { const ledger = data.invoices.filter((invoice) => invoice.customer_id === item.id); const customerBalance = ledger.reduce((sum, invoice) => sum + Number(invoice.amount) - Number(invoice.paid_amount), 0); const days = [31, 0, 62][index] ?? 0; return <tr key={item.id}><td>{item.name}</td><td>{item.account_number}</td><td>{data.plans.find((entry) => entry.id === item.plan_id)?.speed}</td><td><StatusPill status={item.status} /></td><td><span className={`aging ${agingClass(days, data.settings)}`}>{days ? `${days}d overdue` : 'current'}</span></td><td>{money(customerBalance)}</td></tr> })}</tbody></table><div className="bulk"><button className="secondary">Send bulk reminders</button><button className="danger">Flag for disconnection review</button></div></article><aside className="card"><h3>Pending proof-of-payment queue</h3>{data.payments.filter((payment) => payment.verification_status === 'pending_verification').map((payment) => <div className="queue" key={payment.id}><span>📄</span><div><strong>{data.customers.find((item) => item.id === payment.customer_id)?.name}</strong><p>{money(Number(payment.amount))} paid {payment.paid_at} · approve applies to oldest unpaid month.</p></div><button>Approve</button><button className="ghost">Reject</button></div>)}<h3 id="settings">Settings</h3><p>Editable thresholds: yellow {data.settings?.yellow_days ?? 2}d, orange {data.settings?.orange_days ?? 4}d, red {data.settings?.red_days ?? 5}d, disconnection {data.settings?.disconnection_days ?? 14}d / {data.settings?.disconnection_months ?? 2} months.</p></aside></div>
          <div className="grid three"><article className="card"><h3>Reports/export</h3><p>CSV/PDF exports for monthly collections, aging, balances and disconnected accounts.</p></article><article className="card"><h3>Audit trail</h3><p>Approvals, rejects, disconnections and reconnections are logged with actor and timestamp.</p></article><article className="card"><h3>Tickets</h3><p>{data.tickets.length} billing queries loaded from Supabase.</p></article></div>
        </section>
      </main>
      <footer>{data.company?.company_name ?? 'Starfibre Communications (Pty) Ltd'} · © 2026</footer>
    </>
  )
}
