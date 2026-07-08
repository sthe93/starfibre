import Image from 'next/image'
import { agingClass, allocatePayment, customers, formatMoney, invoices, payments, plans, settings, tickets } from '@/lib/billing'

const offerings = [
  { title: 'Offering 01', speed: '15/15 Mbps', copy: 'Symmetrical low-latency fibre for small to medium households with 1 to 5 users and one extra device.' },
  { title: 'Offering 02', speed: '20/20 Mbps', copy: 'Symmetrical 20 Mbps upload and download for homes with 5 to 7 users and one extra connected device.' },
  { title: 'Offering 03', speed: '25/25 Mbps', copy: 'Reliable uncapped fibre for 5 to 10 household users who need continuous connectivity for school, work and entertainment.' },
  { title: 'Offering 04', speed: '50/50 Mbps', copy: 'Fast symmetrical fibre for 10 to 15 users, remote work, streaming and stable low-latency browsing.' },
  { title: 'Offering 05', speed: '100/100 Mbps', copy: 'Designed for heavy internet users, larger households of 10 to 20 users and home office teams.' },
  { title: 'Offering 06', speed: '200/200 Mbps', copy: 'Star Fibre’s highest speed package for power users, home businesses and high-volume connectivity needs.' },
]

const benefits = [
  'Uninterrupted internet and consistent network coverage for Protea Glen subscribers.',
  'Stable connectivity for working from home, online learning, school projects and family entertainment.',
  'Underground fibre infrastructure that can make homes fibre-ready and improve connectivity value.',
]

const values = [
  'The network is built underground for signal strength consistency, stability, low latency and fewer glitches.',
  'Excellent data packages at reasonable prices, with no first-installation fee for the first installation.',
  'Installations and activations can happen immediately after payment and proof-of-payment verification.',
]

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
      <header id="home" className="site-header">
        <nav className="nav">
          <div className="brand">
            <Image src="/star-logo.svg" alt="Star Fibre logo" width={48} height={48} priority />
            <strong>Star Fibre</strong>
          </div>
          <a href="#home">Home</a>
          <a href="#about">About</a>
          <a href="#offerings">Offerings</a>
          <a href="#contact">Contact</a>
          <a href="#customer" className="nav-button">Customer Login</a>
          <a href="#admin" className="nav-button admin-button">Admin</a>
        </nav>
        <section className="hero">
          <div>
            <p>Starfibre Communications (Pty) Ltd · The Star Connectivity</p>
            <h1>Uncapped, unshaped, unthrottled fibre internet connectivity to the home.</h1>
            <p>
              Protea Glen’s community-focused fibre ISP, combining stable underground network infrastructure with
              a modern billing portal that tracks every invoice month clearly.
            </p>
            <div className="hero-actions">
              <a href="#contact" className="button-link">Contact Us</a>
              <a href="#customer" className="button-link secondary-link">Customer Login</a>
            </div>
          </div>
          <div className="hero-mark" aria-hidden="true">⌁</div>
        </section>
      </header>

      <main>
        <section id="about" className="content-section">
          <div className="section-head">
            <p>Who is Starfibre</p>
            <h2>Starfibre Communications is a Protea Glen fibre internet service provider.</h2>
          </div>
          <div className="about-grid">
            <article className="card story-card">
              <h3>About the company</h3>
              <p>
                Starfibre Communications was established in 2024 and registered in Johannesburg, Gauteng. The company
                was founded by Gugu Lucyl Khumalo, director and CEO, together with Linda Khumalo, co-director and COO.
              </p>
              <p>
                The company was born from a shift from a build-and-transfer model to a build-and-own model, with a focus
                on owning stable fibre network infrastructure and serving the local community directly.
              </p>
              <p>
                Star Fibre works alongside Siluthuli Construction and Projects, the fibre optic infrastructure builder,
                while Starfibre Communications operates as the ISP and reseller serving areas including Protea Glen Ext.44.
              </p>
            </article>
            <article className="card story-card">
              <h3>Mission and vision</h3>
              <p>
                The vision is to grow Starfibre Communications into one of the leading ISPs by providing first-class service
                and customer-centric connectivity.
              </p>
              <p>
                The mission is to build and operate a strong, stable network in every area served so customers can rely on
                consistent connectivity for work, school and everyday life.
              </p>
            </article>
          </div>

          <div className="grid three numbered-grid">
            {benefits.map((benefit, index) => (
              <article className="card" key={benefit}>
                <span className="number">0{index + 1}</span>
                <h3>Benefit {index + 1}</h3>
                <p>{benefit}</p>
              </article>
            ))}
          </div>

          <div className="section-head compact-head">
            <p>What sets us apart</p>
            <h2>Stable infrastructure, fair packages and quick activation.</h2>
          </div>
          <div className="grid three">
            {values.map((value, index) => (
              <article className="card" key={value}>
                <h3>Unique Value Proposition {index + 1}</h3>
                <p>{value}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="offerings" className="content-section soft-section">
          <div className="section-head">
            <p>Offerings / Services</p>
            <h2>Internet speed packages that are fast, affordable and symmetrical.</h2>
          </div>
          <div className="offerings-grid">
            {offerings.map((offering) => (
              <article className="card offering-card" key={offering.title}>
                <span>{offering.title}</span>
                <h3>{offering.speed}</h3>
                <p>{offering.copy}</p>
                <a href="#contact">Enquire about this plan</a>
              </article>
            ))}
          </div>
        </section>

        <section className="content-section testimonials">
          <div className="section-head">
            <p>Testimonials</p>
            <h2>Hear what satisfied customers say about Star Fibre.</h2>
          </div>
          <div className="grid two">
            <blockquote className="card">
              “I have now subscribed with Starfibre Communications and my life has changed for the better. I am able to enjoy internet at home without signal losses or interruptions.”
              <cite>John Mabot</cite>
            </blockquote>
            <blockquote className="card">
              “Since subscribing with Starfibre Communications I am sailing all the way with no glitches and stoppages. Starfibre is really a Star in Connectivity.”
              <cite>Bibby Cumelo</cite>
            </blockquote>
          </div>
          <div className="comment-card card">
            <h3>Please leave your comments and suggestions</h3>
            <p>Tell us how your Star Fibre connectivity is performing in your area.</p>
            <a href="#contact" className="button-link">Click here to post comment</a>
          </div>
        </section>

        <section id="contact" className="content-section contact-section">
          <div className="section-head">
            <p>Contact</p>
            <h2>We are reachable. Please do contact us.</h2>
          </div>
          <div className="grid three">
            <article className="card"><h3>Address</h3><p>21607 Kei Street<br />Protea Glen Ext.29<br />1834</p></article>
            <article className="card"><h3>Phone / WhatsApp</h3><p>011 851 1945<br />WhatsApp: 0781722024</p></article>
            <article className="card"><h3>Email</h3><p>Sales@starfibrecom.co.za<br />admin@starfibrecom.co.za<br />admin@starfibercomm.co.za</p></article>
          </div>
          <p className="contact-note">To get connected, subscribe now: call us, email us or send us a WhatsApp message.</p>
        </section>

        <section id="customer" className="portal-section">
          <div className="section-head">
            <p>Customer Portal</p>
            <h2>Customers can log in and see exactly which months are paid.</h2>
          </div>
          <div className="auth-card">🔐 <strong>Customer Login:</strong> Email/password or phone OTP through Supabase Auth.</div>

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

        <section id="admin" className="portal-section admin-portal">
          <div className="section-head">
            <p>Admin Dashboard</p>
            <h2>Managers can review revenue, arrears and disconnection risk.</h2>
          </div>
          <div className="auth-card admin-login">🛡️ <strong>Admin:</strong> Role-based access for Admin, Finance/Billing Manager and Support Staff.</div>

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
