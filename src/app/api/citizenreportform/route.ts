import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = (session.user as any)?.id

    const { data, error } = await supabase
      .from('crime_reports')
      .select('id, type_of_incident, location, incident_date_time, status')
      .eq('user_id', userId)
      .order('incident_date_time', { ascending: false })
      .limit(10)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ reports: data })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()

    const userId = (session.user as any)?.id

    const {
      is_anonymous,
      full_name,
      contact_info,
      location,
      incident_date_time,
      type_of_incident,
      priority,
      description,
      witnesses,
      additional_information,
      evidence_url,
    } = body

    const { data, error } = await supabase
      .from('crime_reports')
      .insert([
        {
          user_id: userId,
          is_anonymous,
          full_name,
          contact_info,
          location,
          incident_date_time,
          type_of_incident,
          priority,
          description,
          witnesses,
          additional_information,
          evidence_url,
          status: 'Submitted',
        },
      ])
      .select()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      report: data,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}