import { NextResponse } from 'next/server'
import { getPublicSiteContent } from '@/lib/dashboard'

export async function GET() {
  const started = Date.now()
  try {
    await getPublicSiteContent()
    return NextResponse.json({ status: 'ok', service: 'starfibre-dashboard', latencyMs: Date.now() - started, checkedAt: new Date().toISOString() })
  } catch (error) {
    console.error('healthcheck_failed', error)
    return NextResponse.json({ status: 'error', service: 'starfibre-dashboard', latencyMs: Date.now() - started }, { status: 503 })
  }
}
