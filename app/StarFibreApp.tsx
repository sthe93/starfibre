'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'

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
type AuditEvent = { id: string; action: string; target_table: string; created_at: string }
type ManagerOverview = { activeCustomers: number; collectedThisPage: number; totalOutstandingThisPage: number; openTickets: number; pendingReconciliation: number }

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
  auditTrail: AuditEvent[]
  managerOverview: ManagerOverview | null
}

const emptyState: DatabaseState = { company: null, benefits: [], values: [], offerings: [], testimonials: [], contacts: [], plans: [], customers: [], invoices: [], payments: [], settings: null, tickets: [], auditTrail: [], managerOverview: null }
const money = (amount: number) => `R${Number(amount || 0).toLocaleString('en-ZA')}`
const latestUnpaidInvoice = (invoices: Invoice[]) => invoices.find((invoice) => invoice.status !== 'paid')

const fallbackCompany: CompanyProfile = {
  company_name: 'Star Fibre',
  tagline: 'Fast, fair internet for Protea Glen',
  hero_title: 'Reliable fibre that keeps homes and businesses connected.',
  hero_summary: 'Simple packages, clear billing and responsive local support — designed around the way customers actually use the internet.',
  about_title: 'Local connectivity with a human support team',
  about_body: 'Star Fibre helps Protea Glen residents and small businesses get online quickly with dependable broadband and transparent account management.',
  mission: 'Our mission is to make fast internet accessible, easy to understand and simple to pay for.',
  vision: 'Our vision is a connected community where every customer can learn, work and stream without friction.',
}

const fallbackBenefits: SortableContent[] = [
  { id: 'speed', title: 'Fast installs', body: 'Clear activation steps and helpful updates from sign-up to first connection.' },
  { id: 'billing', title: 'Transparent billing', body: 'Customers can quickly see balances, paid months and the next action required.' },
  { id: 'support', title: 'Local support', body: 'Friendly help for payments, disputes and service questions.' },
]

const fallbackValues: SortableContent[] = [
  { id: 'simple', title: 'Keep it simple', body: 'We reduce clutter so customers can find plans, contact details and account actions fast.' },
  { id: 'fair', title: 'Fair packages', body: 'Straightforward speed options with pricing that is easy to compare.' },
  { id: 'ready', title: 'Built to grow', body: 'Account and billing workflows are ready for customer care and finance teams.' },
]

const fallbackOfferings: SortableContent[] = [
  { id: 'starter', title: 'Starter', speed: '20 Mbps', description: 'A dependable package for browsing, messaging and light streaming.' },
  { id: 'family', title: 'Family', speed: '50 Mbps', description: 'Balanced performance for households with multiple connected devices.' },
  { id: 'business', title: 'Business', speed: '100 Mbps', description: 'More headroom for video calls, uploads and always-on work.' },
]

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

async function fetchDashboardData(page = 1) {
  const response = await fetch(`/api/dashboard?page=${page}&pageSize=25`, { cache: 'no-store' })
  if (!response.ok) throw new Error('Unable to load account information.')
  return response.json() as Promise<DatabaseState>
}

function AdminManagerOverview({ plans }: { plans: Plan[] }) {
  const [email, setEmail] = useState('admin@starfibrecom.co.za')
  const [password, setPassword] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [overview, setOverview] = useState<AdminOverviewData | null>(null)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [adminLoading, setAdminLoading] = useState(false)

  async function loadAdminOverview(activeSession: Session) {
    setAdminLoading(true)
    setAdminError(null)
    try {
      const response = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${activeSession.access_token}` },
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error ?? 'Unable to load admin overview.')
      setOverview(payload as AdminOverviewData)
    } catch (error) {
      setOverview(null)
      setAdminError(error instanceof Error ? error.message : 'Unable to load admin overview.')
    } finally {
      setAdminLoading(false)
    }
  }

  async function signInAdmin() {
    setAdminLoading(true)
    setAdminError(null)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.session) {
      setAdminLoading(false)
      setAdminError(error?.message ?? 'Unable to sign in.')
      return
    }
    setSession(data.session)
    await loadAdminOverview(data.session)
  }

  async function signOutAdmin() {
    await supabase.auth.signOut()
    setSession(null)
    setOverview(null)
    setPassword('')
  }

  const customers = overview?.customers ?? []
  const invoices = overview?.invoices ?? []
  const payments = overview?.payments ?? []
  const settings = overview?.settings ?? null
  const tickets = overview?.tickets ?? []
  const collectedThisMonth = payments.filter((payment) => payment.verification_status === 'approved').reduce((sum, payment) => sum + Number(payment.amount), 0)
  const totalOutstanding = invoices.reduce((sum, invoice) => sum + Number(invoice.amount) - Number(invoice.paid_amount), 0)

  return (
    <section id="admin" className="portal-section admin-portal">
      <div className="section-head"><p>Admin only</p><h2>Manager overview is loaded through Supabase Auth and server-side role checks.</h2></div>
      {!session || !overview ? (
        <article className="card admin-gate">
          <h3>Administrator sign in</h3>
          <p>Sign in with a Supabase Auth admin user. The server validates the session and the <code>user_profiles.role</code> value before returning operational data.</p>
          <div className="login-grid">
            <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Password<input type="password" placeholder="StarAdmin#2026" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          </div>
          <button onClick={signInAdmin} disabled={adminLoading || !email || !password}>{adminLoading ? 'Checking access…' : 'Sign in and load manager overview'}</button>
          {adminError && <p className="auth-error">{adminError}</p>}
          <p className="note">Seeded admin: admin@starfibrecom.co.za · seeded customer: customer@starfibrecom.co.za. Customer accounts receive a 403 if they request the admin API.</p>
        </article>
      ) : (
        <>
          <div className="admin-toolbar"><span>Signed in as {session.user.email}</span><button className="ghost" onClick={() => loadAdminOverview(session)} disabled={adminLoading}>Refresh</button><button className="secondary" onClick={signOutAdmin}>Sign out</button></div>
          {adminError && <p className="auth-error">{adminError}</p>}
          <div className="grid four"><article className="card stat"><span>Active customers</span><strong>{customers.filter((item) => item.status === 'active').length}</strong></article><article className="card stat"><span>Collected this month</span><strong>{money(collectedThisMonth)}</strong></article><article className="card stat"><span>Outstanding balance</span><strong>{money(totalOutstanding)}</strong></article><article className="card stat"><span>Open tickets</span><strong>{tickets.length}</strong></article></div>
          <div className="split"><article className="card"><h3>Customer aging</h3><div className="table-wrap"><table><thead><tr><th>Customer</th><th>Plan</th><th>Status</th><th>SLA</th><th>Balance</th></tr></thead><tbody>{customers.slice(0, 6).map((item, index) => { const ledger = invoices.filter((invoice) => invoice.customer_id === item.id); const customerBalance = ledger.reduce((sum, invoice) => sum + Number(invoice.amount) - Number(invoice.paid_amount), 0); const days = [31, 0, 62][index] ?? 0; return <tr key={item.id}><td>{item.name}</td><td>{plans.find((entry) => entry.id === item.plan_id)?.speed}</td><td><StatusPill status={item.status} /></td><td><span className={`aging ${agingClass(days, settings)}`}>{days ? `${days}d overdue` : 'current'}</span></td><td>{money(customerBalance)}</td></tr> })}</tbody></table></div><div className="bulk"><button className="secondary">Send reminders</button><button className="danger">Review disconnections</button></div></article><aside className="card"><h3>Proof-of-payment queue</h3>{payments.filter((payment) => payment.verification_status === 'pending_verification').slice(0, 3).map((payment) => <div className="queue" key={payment.id}><div><strong>{customers.find((item) => item.id === payment.customer_id)?.name}</strong><p>{money(Number(payment.amount))} paid {payment.paid_at}</p></div><button>Approve</button><button className="ghost">Reject</button></div>)}<h3 id="settings">Thresholds</h3><p>Yellow {settings?.yellow_days ?? 2}d, orange {settings?.orange_days ?? 4}d, red {settings?.red_days ?? 5}d, disconnection {settings?.disconnection_days ?? 14}d.</p></aside></div>
        </>
      )}
    </section>
  )
}

function PageSkeleton() {
  return (
    <main className="loading-screen" aria-label="Preparing your Star Fibre experience">
      <div className="loading-shell">
        <div className="skeleton-brand"><div className="skeleton-logo" /><span /></div>
        <div className="skeleton-line hero-line" />
        <div className="skeleton-line" />
        <div className="skeleton-line short" />
        <div className="skeleton-grid"><span /><span /><span /></div>
      </div>
    </main>
  )
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
        setData(await fetchDashboardData())
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load account information.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const company = data.company ?? fallbackCompany
  const benefits = data.benefits.length ? data.benefits : fallbackBenefits
  const values = data.values.length ? data.values : fallbackValues
  const offerings = data.offerings.length ? data.offerings : fallbackOfferings
  const selectedCustomer = data.customers[0]
  const selectedPlan = data.plans.find((plan) => plan.id === selectedCustomer?.plan_id)
  const customerInvoices = useMemo(() => data.invoices.filter((invoice) => invoice.customer_id === selectedCustomer?.id), [data.invoices, selectedCustomer?.id])
  const paymentPreview = useMemo(() => allocatePayment(customerInvoices, 500), [customerInvoices])
  const balance = customerInvoices.reduce((sum, invoice) => sum + Number(invoice.amount) - Number(invoice.paid_amount), 0)
  const arrears = customerInvoices.filter((invoice) => invoice.status !== 'paid').length
  const collectedThisMonth = data.managerOverview?.collectedThisPage ?? data.payments.filter((payment) => payment.verification_status === 'approved').reduce((sum, payment) => sum + Number(payment.amount), 0)
  const totalOutstanding = data.managerOverview?.totalOutstandingThisPage ?? data.invoices.reduce((sum, invoice) => sum + Number(invoice.amount) - Number(invoice.paid_amount), 0)
  const unpaidInvoice = latestUnpaidInvoice(customerInvoices)

  if (loading) return <PageSkeleton />

  return (
    <>
      <header id="home" className="site-header">
        <nav className="nav" aria-label="Primary navigation">
          <a className="brand" href="#home"><Image src="/star-logo.svg" alt="Star Fibre logo" width={56} height={56} priority /><strong>Star Fibre</strong></a>
          <div className="nav-links"><a href="#about-us">About us</a><a href="#offerings">Plans</a><a href="#contact">Contact</a><a href="#customer" className="nav-button">Customer portal</a></div>
        </nav>
        {error && <div className="error-banner">Some live information could not be refreshed. Showing the available experience while we reconnect.</div>}
        <section className="hero">
          <div>
            <p className="eyebrow">{company.company_name} · {company.tagline}</p>
            <h1>{company.hero_title}</h1>
            <p>{company.hero_summary}</p>
            <div className="hero-actions"><a href="#offerings" className="button-link">Compare premium fibre plans</a><a href="#about-us" className="button-link secondary-link">About Star Fibre</a></div>
          </div>
          <div className="hero-panel" aria-label="Service promise"><strong>99%</strong><span>Designed for uptime, clear billing and quick support.</span></div>
        </section>
      </header>

      <main>
        <section id="about-us" className="content-section about-page">
          <div className="section-head"><p>About us</p><h2>About Star Fibre: {company.about_title}</h2></div>
          <div className="about-grid">
            <article className="card story-card"><h3>About Star Fibre</h3><p>{company.about_body}</p></article>
            <article className="card story-card accent-card"><h3>Mission and vision</h3><p>{company.vision}</p><p>{company.mission}</p></article>
          </div>
          <div className="grid three numbered-grid">{benefits.slice(0, 3).map((benefit, index) => <article className="card" key={benefit.id}><span className="number">0{index + 1}</span><h3>{benefit.title}</h3><p>{benefit.body}</p></article>)}</div>
          <div className="section-head compact-head"><p>Simple by design</p><h2>Helpful information first, fewer distractions on every page.</h2></div>
          <div className="grid three">{values.slice(0, 3).map((value) => <article className="card" key={value.id}><h3>{value.title}</h3><p>{value.body}</p></article>)}</div>
        </section>

        <section id="offerings" className="content-section soft-section">
          <div className="section-head"><p>Internet packages</p><h2>Choose the speed that matches your home or business.</h2></div>
          <div className="offerings-grid">{offerings.slice(0, 3).map((offering) => <article className="card offering-card" key={offering.id}><span>{offering.title}</span><h3>{offering.speed}</h3><p>{offering.description}</p><a href="#contact">Enquire about this plan</a></article>)}</div>
        </section>

        {!!data.testimonials.length && <section className="content-section testimonials"><div className="section-head"><p>Customer voices</p><h2>Real feedback from people using Star Fibre.</h2></div><div className="grid two">{data.testimonials.slice(0, 2).map((testimonial) => <blockquote className="card" key={testimonial.id}>“{testimonial.quote}”<cite>{testimonial.customer_name}</cite></blockquote>)}</div></section>}

        <section id="contact" className="content-section contact-section">
          <div className="section-head"><p>Ready to connect?</p><h2>Talk to a person and get the right package.</h2></div><div className="connect-banner"><strong>Ready to connect?</strong><span>Availability checks, installation scheduling and proof-of-payment support live on this contact page only.</span></div>
          <div className="grid three">{data.contacts.map((contact) => <article className="card contact-card" key={contact.id}><h3>{contact.label}</h3><p>{contact.value}</p></article>)}</div>
          <p className="contact-note">Call, email or WhatsApp us to check availability, choose a plan and arrange installation.</p>
        </section>

        <section id="customer" className="portal-section">
          <div className="section-head"><p>Customer portal preview</p><h2>Account actions are grouped so customers are not overwhelmed.</h2></div>
          {selectedCustomer ? <><div className="grid four"><article className="card stat primary-stat"><span>Current balance</span><strong>{money(balance)}</strong><small>{arrears ? `${arrears} unpaid month${arrears > 1 ? 's' : ''}` : 'Account is current'}</small></article><article className="card stat"><span>Next action</span><strong>{unpaidInvoice?.due_date ?? 'All paid'}</strong><small>{unpaidInvoice ? 'Oldest unpaid month is prioritised.' : 'No payment required today.'}</small></article><article className="card stat"><span>Current plan</span><strong>{selectedPlan?.speed ?? 'No plan'}</strong><small>{selectedPlan?.name} · {money(Number(selectedPlan?.monthly_price ?? 0))}/month</small></article><article className="card stat"><span>Account</span><strong>{selectedCustomer.account_number}</strong><small>{selectedCustomer.street}, Protea Glen {selectedCustomer.extension}</small></article></div><div className="split"><article className="card"><h3>Billing history</h3><div className="table-wrap"><table><thead><tr><th>Month</th><th>Due</th><th>Amount</th><th>Paid date</th><th>Status</th></tr></thead><tbody>{customerInvoices.map((invoice) => <tr key={invoice.id}><td>{invoice.billing_month}</td><td>{invoice.due_date}</td><td>{money(Number(invoice.amount))}</td><td>{invoice.paid_date ?? '—'}</td><td><StatusPill status={invoice.status} /></td></tr>)}</tbody></table></div><button className="ghost">Download statement</button></article><article className="card actions"><h3>Pay or upload proof</h3><label>Payment amount<input type="number" defaultValue={500} /></label><button>Pay now</button><button className="secondary">Upload EFT proof</button><p className="note">Payments are allocated from the oldest unpaid invoice first.</p><ul>{paymentPreview.slice(0, 3).map((invoice) => <li key={invoice.id}>{invoice.billing_month}: {money(Number(invoice.paid_amount))} / {money(Number(invoice.amount))} · {invoice.status.replace('_', ' ')}</li>)}</ul></article></div></> : <div className="card empty-card"><h3>Customer portal coming online</h3><p>Once an account is selected, customers will see balances, statements and payment actions here.</p></div>}
        </section>

        <section id="admin" className="portal-section admin-portal">
          <div className="section-head"><p>Manager overview</p><h2>Operational data is condensed into the decisions teams need most.</h2></div>
          <div className="grid four"><article className="card stat"><span>Active customers</span><strong>{data.managerOverview?.activeCustomers ?? data.customers.filter((item) => item.status === 'active').length}</strong></article><article className="card stat"><span>Collected this month</span><strong>{money(collectedThisMonth)}</strong></article><article className="card stat"><span>Outstanding balance</span><strong>{money(totalOutstanding)}</strong></article><article className="card stat"><span>Open tickets</span><strong>{data.managerOverview?.openTickets ?? data.tickets.length}</strong></article></div>
          <div className="split"><article className="card"><h3>Customer aging</h3><div className="table-wrap"><table><thead><tr><th>Customer</th><th>Plan</th><th>Status</th><th>SLA</th><th>Balance</th></tr></thead><tbody>{data.customers.slice(0, 6).map((item, index) => { const ledger = data.invoices.filter((invoice) => invoice.customer_id === item.id); const customerBalance = ledger.reduce((sum, invoice) => sum + Number(invoice.amount) - Number(invoice.paid_amount), 0); const days = [31, 0, 62][index] ?? 0; return <tr key={item.id}><td>{item.name}</td><td>{data.plans.find((entry) => entry.id === item.plan_id)?.speed}</td><td><StatusPill status={item.status} /></td><td><span className={`aging ${agingClass(days, data.settings)}`}>{days ? `${days}d overdue` : 'current'}</span></td><td>{money(customerBalance)}</td></tr> })}</tbody></table></div><div className="bulk"><button className="secondary">Send reminders</button><button className="danger">Review disconnections</button></div></article><aside className="card"><h3>Proof-of-payment queue</h3>{data.payments.filter((payment) => payment.verification_status === 'pending_verification').slice(0, 3).map((payment) => <div className="queue" key={payment.id}><div><strong>{data.customers.find((item) => item.id === payment.customer_id)?.name}</strong><p>{money(Number(payment.amount))} paid {payment.paid_at}</p></div><button>Approve</button><button className="ghost">Reject</button></div>)}<h3 id="settings">Thresholds</h3><p>Yellow {data.settings?.yellow_days ?? 2}d, orange {data.settings?.orange_days ?? 4}d, red {data.settings?.red_days ?? 5}d, disconnection {data.settings?.disconnection_days ?? 14}d.</p></aside></div>
          <div className="split observability-grid"><article className="card"><h3>Launch observability</h3><ul><li>Uptime: <code>/api/observability/health</code></li><li>Error tracking: server route errors are logged with stable event names.</li><li>Payment reconciliation: {data.managerOverview?.pendingReconciliation ?? 0} pending payment proof(s).</li></ul></article><article className="card"><h3>Admin audit dashboard</h3>{data.auditTrail.length ? data.auditTrail.map((event) => <div className="queue" key={event.id}><div><strong>{event.action}</strong><p>{event.target_table} · {event.created_at}</p></div></div>) : <p>No admin actions recorded in this page.</p>}</article></div>
        </section>
      </main>
      <footer>{company.company_name} · © 2026</footer>
    </>
  )
}
