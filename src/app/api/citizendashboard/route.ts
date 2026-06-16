import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
  }

  // ---------------- USERS TABLE ----------------
  const { data: user } = await supabase
    .from('users')
    .select('name')
    .eq('id', userId)
    .single()

  // ---------------- ACTIVITIES ----------------
  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)

  // ---------------- STATS ----------------
  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .eq('user_id', userId)

  const totalReports = reports?.length || 0

  return NextResponse.json({
    user,
    activities,
    stats: {
      totalReports,
      activeAlerts: 0,
      safetyStatus: 'Safe'
    }
  })
}