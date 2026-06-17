import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json(
      { error: 'Missing userId' },
      { status: 400 }
    )
  }

  // User
  const { data: user, error: userError } =
    await supabase
      .from('users')
      .select('first_name,last_name')
      .eq('id', userId)
      .single()

  // Reports
  const { data: reports, error: reportsError } =
    await supabase
      .from('crime_reports')
      .select('*')
      .eq('user_id', userId)

  if (userError || reportsError) {
    return NextResponse.json(
      {
        error: 'Database error',
        userError,
        reportsError,
      },
      { status: 500 }
    )
  }

  const activities =
    reports?.map((report) => ({
      id: report.id,
      type: report.type_of_incident,
      status: report.status,
      time: report.created_at,
    })) || []

  return NextResponse.json({
    user,
    activities,
    stats: {
      totalReports: reports?.length || 0,
      activeAlerts: 0,
      safetyStatus: 'Safe',
    },
  })
}