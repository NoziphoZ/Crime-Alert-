import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcrypt'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.trim().toLowerCase()

    // 1. GET USER FROM YOUR TABLE
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // 2. COMPARE PASSWORD WITH BCRYPT
    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    )

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // 3. SUCCESS RESPONSE
    return NextResponse.json({
      message: 'Login successful',
      role: user.role,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
      },
    })
  } catch (err) {
    console.error(err)

    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    )
  }
}