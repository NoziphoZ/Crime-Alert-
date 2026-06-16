import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get logged-in user
    const {
      data: user,
      error: userError
    } = await supabase
      .from('users')
      .select(
        'id, name, surname, email'
      )
      .eq(
        'email',
        session.user.email
      )
      .single()

    if (userError || !user) {
      console.error(userError)

      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Total reports
    const {
      count: totalReports
    } = await supabase
      .from('reports')
      .select('*', {
        count: 'exact',
        head: true
      })
      .eq('user_id', user.id)

    // Active reports
    const {
      count: activeReports
    } = await supabase
      .from('reports')
      .select('*', {
        count: 'exact',
        head: true
      })
      .eq('user_id', user.id)
      .eq(
        'status',
        'Submitted'
      )

    // Recent activity
    const {
      data: activities,
      error: activitiesError
    } = await supabase
      .from('reports')
      .select(
        `
        id,
        crime_type,
        status,
        created_at
        `
      )
      .eq('user_id', user.id)
      .order(
        'created_at',
        {
          ascending: false
        }
      )
      .limit(5)

    if (activitiesError) {
      console.error(
        activitiesError
      )
    }

    return NextResponse.json({
      user,

      totalReports:
        totalReports || 0,

      activeReports:
        activeReports || 0,

      activities:
        activities || [],
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        error:
          'Internal Server Error'
      },
      { status: 500 }
    )
  }
}