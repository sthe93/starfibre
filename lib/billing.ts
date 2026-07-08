export type AccountStatus = 'active' | 'overdue' | 'suspended' | 'disconnected'
export type InvoiceStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue'

export interface SubscriptionPlan {
  id: string
  name: string
  speed: string
  monthlyPrice: number
  description: string
}

export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  street: string
  extension: string
  accountNumber: string
  planId: string
  installationDate: string
  status: AccountStatus
}

export interface Invoice {
  id: string
  customerId: string
  billingMonth: string
  dueDate: string
  amount: number
  paidAmount: number
  status: InvoiceStatus
  paidDate?: string
}

export interface Payment {
  id: string
  customerId: string
  invoiceId: string
  source: 'paystack_online' | 'manual_eft'
  amount: number
  paidAt: string
  status: 'pending_verification' | 'approved' | 'rejected'
  proofUrl?: string
}

export const plans: SubscriptionPlan[] = [
  { id: 'p15', name: 'Community Starter', speed: '15/15 Mbps', monthlyPrice: 350, description: 'Small to medium homes with 1-5 users.' },
  { id: 'p20', name: 'Home 20', speed: '20/20 Mbps', monthlyPrice: 400, description: 'Affordable uncapped fibre for everyday browsing.' },
  { id: 'p50', name: 'Family 50', speed: '50/50 Mbps', monthlyPrice: 500, description: 'Low latency for streaming, learning and remote work.' },
  { id: 'p100', name: 'Power 100', speed: '100/100 Mbps', monthlyPrice: 600, description: 'Heavy household and home office use.' },
  { id: 'p200', name: 'Business Home 200', speed: '200/200 Mbps', monthlyPrice: 700, description: 'Highest speed package for power users.' },
]

export const settings = {
  yellowDays: 2,
  orangeDays: 4,
  redDays: 5,
  disconnectionDays: 14,
  disconnectionMonths: 2,
  notificationTemplate: 'Your Star Fibre account has an overdue balance. Payments are allocated to your oldest unpaid invoice first.',
}

export const customers: Customer[] = [
  { id: 'c1', name: 'Naledi Mokoena', phone: '078 172 2024', email: 'naledi@example.com', street: '21607 Kei Street', extension: 'Ext.29', accountNumber: 'SF-000184', planId: 'p50', installationDate: '2025-11-08', status: 'overdue' },
  { id: 'c2', name: 'Thabo Dlamini', phone: '082 555 0108', email: 'thabo@example.com', street: 'Star Village Crescent', extension: 'Ext.44', accountNumber: 'SF-000219', planId: 'p100', installationDate: '2026-01-12', status: 'active' },
  { id: 'c3', name: 'Busi Khumalo', phone: '073 432 8811', email: 'busi@example.com', street: 'Protea Boulevard', extension: 'Ext.31', accountNumber: 'SF-000247', planId: 'p20', installationDate: '2026-02-02', status: 'suspended' },
]

export const invoices: Invoice[] = [
  { id: 'i1', customerId: 'c1', billingMonth: '2026-03', dueDate: '2026-03-07', amount: 500, paidAmount: 500, status: 'paid', paidDate: '2026-03-06' },
  { id: 'i2', customerId: 'c1', billingMonth: '2026-04', dueDate: '2026-04-07', amount: 500, paidAmount: 250, status: 'partially_paid' },
  { id: 'i3', customerId: 'c1', billingMonth: '2026-05', dueDate: '2026-05-07', amount: 500, paidAmount: 0, status: 'overdue' },
  { id: 'i4', customerId: 'c1', billingMonth: '2026-06', dueDate: '2026-06-07', amount: 500, paidAmount: 0, status: 'overdue' },
  { id: 'i5', customerId: 'c1', billingMonth: '2026-07', dueDate: '2026-07-07', amount: 500, paidAmount: 0, status: 'overdue' },
  { id: 'i6', customerId: 'c2', billingMonth: '2026-07', dueDate: '2026-07-07', amount: 600, paidAmount: 600, status: 'paid', paidDate: '2026-07-01' },
  { id: 'i7', customerId: 'c3', billingMonth: '2026-05', dueDate: '2026-05-07', amount: 400, paidAmount: 0, status: 'overdue' },
  { id: 'i8', customerId: 'c3', billingMonth: '2026-06', dueDate: '2026-06-07', amount: 400, paidAmount: 0, status: 'overdue' },
]

export const payments: Payment[] = [
  { id: 'pay1', customerId: 'c1', invoiceId: 'i2', source: 'manual_eft', amount: 250, paidAt: '2026-04-10', status: 'approved', proofUrl: '/proofs/pop-naledi.pdf' },
  { id: 'pay2', customerId: 'c2', invoiceId: 'i6', source: 'paystack_online', amount: 600, paidAt: '2026-07-01', status: 'approved' },
  { id: 'pay3', customerId: 'c1', invoiceId: 'i3', source: 'manual_eft', amount: 500, paidAt: '2026-07-08', status: 'pending_verification', proofUrl: '/proofs/pending.jpg' },
]

export const tickets = [
  { id: 't1', customerId: 'c1', subject: 'I paid April balance but it still shows partial', status: 'in_review', lastUpdate: '2026-07-08' },
]

export function formatMoney(amount: number) {
  return `R${amount.toLocaleString('en-ZA')}`
}

export function allocatePayment(oldInvoices: Invoice[], amount: number) {
  let remaining = amount

  return [...oldInvoices]
    .sort((a, b) => a.billingMonth.localeCompare(b.billingMonth))
    .map((invoice) => {
      if (remaining <= 0 || invoice.status === 'paid') return invoice
      const outstanding = invoice.amount - invoice.paidAmount
      const applied = Math.min(outstanding, remaining)
      remaining -= applied
      const paidAmount = invoice.paidAmount + applied

      return {
        ...invoice,
        paidAmount,
        status: paidAmount >= invoice.amount ? ('paid' as const) : ('partially_paid' as const),
        paidDate: paidAmount >= invoice.amount ? new Date().toISOString().slice(0, 10) : invoice.paidDate,
      }
    })
}

export function agingClass(daysOverdue: number) {
  if (daysOverdue >= settings.disconnectionDays) return 'darkred'
  if (daysOverdue >= settings.redDays) return 'red'
  if (daysOverdue > settings.yellowDays) return 'orange'
  if (daysOverdue > 0) return 'yellow'
  return 'green'
}
