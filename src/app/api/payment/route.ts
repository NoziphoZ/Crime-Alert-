// src/app/api/payment/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabase } from '@/lib/supabase'

/**
 * GET — returns subscription status for the current user.
 * Used by both the payment page (alreadySubscribed)
 * and the middleware (trialExpired).
 */
export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id
  const now = new Date().toISOString()

  // Active subscription?
  const { count: activeCount } = await supabase
    .from('user_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_active', true)
    .gt('end_date', now)

  const alreadySubscribed = (activeCount ?? 0) > 0

  // Any subscription at all (i.e. they registered and had a plan)?
  const { count: anyCount } = await supabase
    .from('user_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  const everHadSubscription = (anyCount ?? 0) > 0

  // Trial expired = has had a sub before, but nothing active now
  const trialExpired = everHadSubscription && !alreadySubscribed

  return NextResponse.json({ alreadySubscribed, trialExpired })
}

/**
 * POST — creates a subscription (trial or paid).
 * On success → redirect target is /login (enforced on the client).
 */
export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const userId = (session.user as any).id
    const body = await request.json()
    const { plan, isTrial, fullName } = body as {
      plan: string
      isTrial: boolean
      fullName?: string
    }

    if (!plan) {
      return NextResponse.json({ success: false, error: 'Plan is required' }, { status: 400 })
    }

    if (!isTrial && !fullName?.trim()) {
      return NextResponse.json({ success: false, error: 'Full name is required' }, { status: 400 })
    }

    // Block duplicate active subscriptions
    const now = new Date().toISOString()
    const { count: activeCount } = await supabase
      .from('user_subscriptions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('end_date', now)

    if ((activeCount ?? 0) > 0) {
      return NextResponse.json(
        { success: false, error: 'You already have an active subscription.' },
        { status: 409 }
      )
    }

    // Look up plan
    const { data: planRow, error: planError } = await supabase
      .from('subscription_plans')
      .select('id, price, duration_days')
      .eq('plan_name', plan)
      .eq('is_active', true)
      .single()

    if (planError || !planRow) {
      return NextResponse.json(
        { success: false, error: 'Selected plan not found.' },
        { status: 404 }
      )
    }

    const startDate = new Date()
    const endDate = isTrial
      ? new Date(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate())
      : new Date(startDate.getTime() + (planRow.duration_days ?? 30) * 24 * 60 * 60 * 1000)

    const { error: subError } = await supabase.from('user_subscriptions').insert({
      user_id: userId,
      subscription_plan_id: planRow.id,
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      is_active: true,
    })

    if (subError) {
      console.error('Subscription insert error:', subError)
      return NextResponse.json({ success: false, error: 'Failed to create subscription.' }, { status: 500 })
    }

    if (!isTrial) {
      const { error: payError } = await supabase.from('payment_transactions').insert({
        user_id: userId,
        subscription_plan_id: planRow.id,
        amount: planRow.price,
        payment_date: new Date().toISOString(),
        payment_status: 'Completed',
      })

      if (payError) {
        console.error('Payment record error:', payError)
      }
    }

    return NextResponse.json({ success: true, isTrial })
  } catch (error) {
    console.error('Payment processing error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}