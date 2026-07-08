import { NextResponse } from 'next/server'
import { getDashboardData } from '@/lib/dashboard'

export async function GET() {
  const data = await getDashboardData({ pageSize: 25 })
  return NextResponse.json({ status: 'ok', adminActions: data.auditTrail })
}
