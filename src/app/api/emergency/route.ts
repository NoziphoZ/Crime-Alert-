import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any)?.id
    const body = await request.json()
    const { latitude, longitude, locationSource } = body

    // ── Server-side GPS guard: reject if coordinates are missing or non-numeric ──
    if (
      latitude  === null || latitude  === undefined || typeof latitude  !== 'number' ||
      longitude === null || longitude === undefined || typeof longitude !== 'number' ||
      isNaN(latitude) || isNaN(longitude)
    ) {
      return NextResponse.json(
        { error: 'GPS coordinates are required. Enable location access and try again.' },
        { status: 400 }
      )
    }

    // ── Sanity-check coordinate ranges ──
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Invalid GPS coordinates.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('emergency_alerts')
      .insert([{
        user_id:         userId,
        latitude,
        longitude,
        location_source: locationSource ?? 'unknown', // 'gps' | 'ip' | 'unknown'
        status:          'Critical',
      }])
      .select()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, alert: data })
  } catch (error) {
    console.error('Emergency API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}