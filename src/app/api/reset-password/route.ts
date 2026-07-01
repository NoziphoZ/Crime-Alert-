// src/app/api/reset-password/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.RESET_TOKEN_SECRET!) as { userId: string };
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Find user by ID and check token
    const { data: user, error } = await supabase
      .from('users')
      .select('id, reset_token, reset_token_expiry')
      .eq('id', decoded.userId)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if token matches
    if (user.reset_token !== token) {
      return NextResponse.json(
        { error: 'Invalid reset token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date(user.reset_token_expiry) < new Date()) {
      return NextResponse.json(
        { error: 'Reset token has expired' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear reset token
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: hashedPassword,
        reset_token: null,
        reset_token_expiry: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successful',
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}