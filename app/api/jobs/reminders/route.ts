import { NextResponse } from 'next/server'
import { authorizeJobRequest, runReminderJob } from '@/lib/jobs'

export async function POST(request: Request) {
  if (!authorizeJobRequest(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const result = await runReminderJob()
    return NextResponse.json({ status: 'ok', ...result })
  } catch (error) {
    console.error('reminder_job_failed', error)
    return NextResponse.json({ status: 'error', error: 'Reminder job failed.' }, { status: 500 })
  }
}
