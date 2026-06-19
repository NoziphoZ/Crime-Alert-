import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any)?.id
    const body = await request.json()
    const { 
      latitude, 
      longitude, 
      locationSource, 
      location, // ← New: address from reverse geocoding
      priority = 'Critical' // ← Default priority
    } = body

    // ── Server-side GPS guard ──
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

    // ── Validate priority ──
    const validPriorities = ['Critical', 'High', 'Medium', 'Low']
    const finalPriority = validPriorities.includes(priority) ? priority : 'Critical'

    const { data, error } = await supabase
      .from('emergency_alerts')
      .insert([{
        user_id: userId,
        latitude,
        longitude,
        location: location || `${latitude}, ${longitude}`, // ← Store the address
        status: 'Received', // ← Status is always "Received" for new alerts
        priority: finalPriority, // ← Store the priority
        is_active: true,
        location_source: locationSource ?? 'unknown',
      }])
      .select()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      alert: data,
      message: 'Emergency alert received. First responders are being dispatched.'
    })
  } catch (error) {
    console.error('Emergency API error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}