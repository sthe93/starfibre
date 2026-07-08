import Image from 'next/image'
import { agingClass, allocatePayment, customers, formatMoney, invoices, payments, plans, settings, tickets } from '@/lib/billing'

function StatusPill({ status }: { status: string }) {
  return <span className={`pill ${status.replace('_', '-')}`}>{status.replace('_', ' ')}</span>
}

export default function Home() {
  const customer = customers[0]
  const plan = plans.find((item) => item.id === customer.planId)!
  const customerInvoices = invoices.filter((invoice) => invoice.customerId === customer.id)
  const paymentPreview = allocatePayment(customerInvoices, 500)
  const balance = customerInvoices.reduce((sum, invoice) => sum + invoice.amount - invoice.paidAmount, 0)
  const arrears = customerInvoices.filter((invoice) => invoice.status !== 'paid').length
  const collectedThisMonth = payments.filter((payment) => payment.status === 'approved').reduce((sum, payment) => sum + payment.amount, 0)
  const totalOutstanding = invoices.reduce((sum, invoice) => sum + invoice.amount - invoice.paidAmount, 0)

  return (
    <>
      <header className="site-header">
        <nav className="nav">
          <div className="brand">
            <Image src="/star-logo.svg" alt="Star Fibre logo" width={48} height={48} priority />
            <strong>Star Fibre</strong>
          </div>
          <a href="#customer">Customer Portal</a>
          <a href="#admin">Admin Dashboard</a>
          <a href="#settings">Settings</a>
        </nav>
        <section className="hero">
          <div>
            <p>Starfibre Communications (Pty) Ltd · Protea Glen</p>
            <h1>Billing that tracks every month, not just “paid”.</h1>
            <p>
              Uncapped, unshaped, unthrottled fibre with a per-month ledger, Paystack-ready payments,
              EFT proof verification and accountable disconnection workflow.
            </p>
            <button>Get connected</button>
          </div>
          <div className="hero-mark" aria-hidden="true">⌁</div>
        </section>
      </header>

      <main>
        <section id="customer" className="portal-section">
          <div className="section-head">
            <p>Customer Portal</p>
            <h2>Customers can see exactly which months are paid.</h2>
          </div>
          <div className="auth-card">🔐 <strong>Sign in:</strong> Email/password or phone OTP through Supabase Auth.</div>

          <div className="grid four">
            <article className="card stat"><span>Current balance</span><strong>{formatMoney(balance)}</strong><small>{arrears} months in arrears</small></article>
            <article className="card stat"><span>Next due date</span><strong>2026-08-07</strong><small>Oldest unpaid invoices are settled first.</small></article>
            <article className="card stat"><span>Current plan</span><strong>{plan.speed}</strong><small>{plan.name} · {formatMoney(plan.monthlyPrice)}/month</small></article>
            <article className="card stat"><span>Account</span><strong>{customer.accountNumber}</strong><small>{customer.street}, Protea Glen {customer.extension}</small></article>
          </div>

          <div className="split">
            <article className="card">
              <h3>Full billing history / statement</h3>
              <table>
                <thead><tr><th>Month</th><th>Due</th><th>Amount</th><th>Paid date</th><th>Status</th></tr></thead>
                <tbody>
                  {customerInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td>{invoice.billingMonth}</td><td>{invoice.dueDate}</td><td>{formatMoney(invoice.amount)}</td><td>{invoice.paidDate ?? '—'}</td><td><StatusPill status={invoice.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button className="ghost">⬇️ Download PDF statement</button>
            </article>

            <article className="card actions">
              <h3>Pay and upload proof</h3>
              <label>Payment amount<input type="number" defaultValue={500} /></label>
              <button>💳 Pay now with Paystack</button>
              <button className="secondary">📤 Upload EFT proof</button>
              <p className="note">Allocation preview: a R500 payment is applied from the oldest unpaid invoice forward.</p>
              <ul>{paymentPreview.map((invoice) => <li key={invoice.id}>{invoice.billingMonth}: {formatMoney(invoice.paidAmount)} / {formatMoney(invoice.amount)} · {invoice.status}</li>)}</ul>
              <button className="ghost">🎧 Log billing dispute</button>
            </article>
          </div>
        </section>

        <section id="admin" className="portal-section">
          <div className="section-head">
            <p>Manager / Admin Dashboard</p>
            <h2>Revenue, arrears and disconnection review at a glance.</h2>
          </div>

          <div className="grid four">
            <article className="card stat"><span>👥 Active customers</span><strong>{customers.filter((item) => item.status === 'active').length}</strong></article>
            <article className="card stat"><span>✅ Collected this month</span><strong>{formatMoney(collectedThisMonth)}</strong></article>
            <article className="card stat"><span>⚠️ Outstanding balance</span><strong>{formatMoney(totalOutstanding)}</strong></article>
            <article className="card stat"><span>📊 Overdue accounts</span><strong>{customers.filter((item) => item.status !== 'active').length}</strong></article>
          </div>

          <div className="split">
            <article className="card">
              <h3>Customer aging and SLA</h3>
              <table>
                <thead><tr><th>Customer</th><th>Account</th><th>Plan</th><th>Status</th><th>SLA</th><th>Balance</th></tr></thead>
                <tbody>
                  {customers.map((item, index) => {
                    const customerLedger = invoices.filter((invoice) => invoice.customerId === item.id)
                    const customerBalance = customerLedger.reduce((sum, invoice) => sum + invoice.amount - invoice.paidAmount, 0)
                    const days = [31, 0, 62][index]
                    return (
                      <tr key={item.id}>
                        <td>{item.name}</td><td>{item.accountNumber}</td><td>{plans.find((entry) => entry.id === item.planId)?.speed}</td><td><StatusPill status={item.status} /></td><td><span className={`aging ${agingClass(days)}`}>{days ? `${days}d overdue` : 'current'}</span></td><td>{formatMoney(customerBalance)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="bulk"><button className="secondary">Send bulk reminders</button><button className="danger">Flag for disconnection review</button></div>
            </article>

            <aside className="card">
              <h3>Pending proof-of-payment queue</h3>
              {payments.filter((payment) => payment.status === 'pending_verification').map((payment) => (
                <div className="queue" key={payment.id}>
                  <span>📄</span><div><strong>{customers.find((item) => item.id === payment.customerId)?.name}</strong><p>{formatMoney(payment.amount)} paid {payment.paidAt} · approve applies to oldest unpaid month.</p></div><button>Approve</button><button className="ghost">Reject</button>
                </div>
              ))}
              <h3 id="settings">Settings</h3>
              <p>Editable thresholds: yellow {settings.yellowDays}d, orange {settings.orangeDays}d, red {settings.redDays}d, disconnection {settings.disconnectionDays}d / {settings.disconnectionMonths} months.</p>
            </aside>
          </div>

          <div className="grid three">
            <article className="card"><h3>Reports/export</h3><p>CSV/PDF exports for monthly collections, aging, balances and disconnected accounts.</p></article>
            <article className="card"><h3>Audit trail</h3><p>Approvals, rejects, disconnections and reconnections are logged with actor and timestamp.</p></article>
            <article className="card"><h3>Tickets</h3><p>{tickets.length} open billing query: {tickets[0].subject}</p></article>
          </div>
        </section>
      </main>
      <footer>© 2026 Starfibre Communications (Pty) Ltd · 21607 Kei Street Protea Glen Ext.29 · 011 851 1945</footer>
    </>
  )
}
