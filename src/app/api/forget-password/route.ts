// src/app/api/forgot-password/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/mail';
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .single();

    // Always return same message for security (prevent user enumeration)
    if (error || !user) {
      return NextResponse.json({
        message: 'If an account exists, a reset link has been sent.',
      });
    }

    // Generate reset token (expires in 1 hour)
    const resetToken = jwt.sign(
      { userId: user.id },
      process.env.RESET_TOKEN_SECRET!,
      { expiresIn: '1h' }
    );

    // Store token in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        reset_token: resetToken,
        reset_token_expiry: new Date(Date.now() + 3600000).toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to process request' },
        { status: 500 }
      );
    }

    // Send reset email
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`;
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background: #2563eb; 
              color: white; 
              text-decoration: none; 
              border-radius: 6px; 
              margin: 20px 0;
            }
            .footer { margin-top: 30px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Reset Request</h1>
            </div>
            <p>Hi there,</p>
            <p>We received a request to reset your password for your CrimeAlert account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #f5f5f5; padding: 10px; border-radius: 4px;">
              ${resetUrl}
            </p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you didn't request this, please ignore this email.</p>
            <div class="footer">
              <p>Stay safe,<br>The CrimeAlert Team</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await sendEmail({
      to: user.email,
      subject: 'Reset Your Password - CrimeAlert',
      html: emailHtml,
      text: `Reset your password by visiting: ${resetUrl}`,
    });

    return NextResponse.json({
      message: 'If an account exists, a reset link has been sent.',
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}