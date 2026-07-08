import { NextRequest, NextResponse } from 'next/server'
import { getDashboardData } from '@/lib/dashboard'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const page = Number(request.nextUrl.searchParams.get('page') || 1)
  const pageSize = Number(request.nextUrl.searchParams.get('pageSize') || 25)

  try {
    return NextResponse.json(await getDashboardData({ page, pageSize }), {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=120' },
    })
  } catch (error) {
    console.error('dashboard_api_error', error)
    return NextResponse.json({ error: 'Unable to load dashboard data.' }, { status: 500 })
  }
}
