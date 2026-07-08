import { NextResponse } from 'next/server'
import { getDashboardData } from '@/lib/dashboard'

export async function GET() {
  const data = await getDashboardData({ pageSize: 100 })
  const pending = data.payments.filter((payment: any) => payment.verification_status === 'pending_verification')
  const stale = pending.filter((payment: any) => Date.now() - new Date(payment.paid_at).getTime() > 2 * 24 * 60 * 60 * 1000)
  return NextResponse.json({ status: stale.length ? 'alert' : 'ok', pendingCount: pending.length, staleCount: stale.length, stalePayments: stale })
}
