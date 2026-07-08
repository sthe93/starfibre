import { NextResponse } from 'next/server'
import { authorizeJobRequest, runPaymentAllocationJob } from '@/lib/jobs'

export async function POST(request: Request) {
  if (!authorizeJobRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await runPaymentAllocationJob()
    return NextResponse.json({ status: 'ok', ...result })
  } catch (error) {
    console.error('payment_allocation_job_failed', error)
    return NextResponse.json({ status: 'error', error: 'Payment allocation job failed.' }, { status: 500 })
  }
}
