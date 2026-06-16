import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcrypt'

export async function POST(
  request: Request
) {
  try {
    const { email, password } =
      await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Email and password are required',
        },
        { status: 400 }
      )
    }

    const normalizedEmail = email
      .trim()
      .toLowerCase()

    // Find user by email
    const {
      data: user,
      error,
    } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .single()

    // User not found
    if (error || !user) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid email or password',
        },
        { status: 401 }
      )
    }

    // Compare password
    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password_hash
      )

    // Password incorrect
    if (!passwordMatch) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Invalid email or password',
        },
        { status: 401 }
      )
    }

    // Login success
    return NextResponse.json(
      {
        success: true,
        message:
          'Login successful',

        user: {
          id: user.id,
          email: user.email,
          first_name:
            user.first_name,
          last_name:
            user.last_name,
          role: user.role,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        error:
          'Internal server error',
      },
      { status: 500 }
    )
  }
}