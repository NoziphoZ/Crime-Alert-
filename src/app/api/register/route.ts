import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcrypt'

export async function POST(request: Request) {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      role,
    } = await request.json()

    // Validation
    if (!firstName || !lastName || !email || !password || !role) {
      return NextResponse.json(
        { success: false, error: 'All fields are required.' },
        { status: 400 }
      )
    }

    // Role validation FIXED
    if (role !== 'citizen' && role !== 'law_enforcement') {
      return NextResponse.json(
        { success: false, error: 'Invalid role selected.' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.trim().toLowerCase()

    // Check existing user
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Email already exists.' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Insert user
    const { data, error } = await supabase
      .from('users')
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: normalizedEmail,
        password_hash: passwordHash,
        role,
      })
      .select()
      .single()

    if (error) {
      console.error(error)

      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'User registered successfully',
        user: data,
      },
      { status: 201 }
    )

  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}