import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = (session.user as any)?.id
    const body = await request.json()
    const { latitude, longitude } = body

    const { data, error } = await supabase
      .from('emergency_alerts')
      .insert([
        {
          user_id: userId,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          status: 'Critical',
        },
      ])
      .select()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, alert: data })
  } catch (error) {
    console.error('Emergency API error:', error)
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}