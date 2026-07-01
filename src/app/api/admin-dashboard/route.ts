// src/app/api/admin-dashboard/route.ts

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const userRole = (session.user as any)?.role;
    if (userRole?.toLowerCase() !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    console.log('✅ Admin authenticated:', session.user.email);

    // Fetch all statistics in parallel
    const [
      totalUsers,
      activeReports,
      pendingReviews,
      satisfactionRating,
      recentActivities
    ] = await Promise.all([
      getTotalUsers(),
      getActiveReports(),
      getPendingReviews(),
      getAverageSatisfactionRating(),
      getRecentActivities(10)
    ]);

    const stats = {
      totalUsers,
      activeReports,
      pendingReviews,
      satisfactionRating
    };

    return NextResponse.json({
      success: true,
      stats,
      recentActivities
    });

  } catch (error) {
    console.error('Dashboard API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ─── Helper Functions ──────────────────────────────────────────────────────

async function getTotalUsers(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('getTotalUsers Error:', error);
    return 0;
  }
}

async function getActiveReports(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('crime_reports')
      .select('*', { count: 'exact', head: true })
      .in('status', ['Submitted', 'Under Investigation', 'Dispatched']);

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('getActiveReports Error:', error);
    return 0;
  }
}

async function getPendingReviews(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('crime_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Submitted');

    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('getPendingReviews Error:', error);
    return 0;
  }
}

async function getAverageSatisfactionRating(): Promise<number | null> {
  try {
    // Try to get from citizen_feedback table if it exists
    const { data, error } = await supabase
      .from('citizen_feedback')
      .select('response_time_rating, professionalism_rating, follow_up_rating, app_helpfulness_rating, app_usability_rating')
      .eq('is_active', true);

    if (error) {
      // Table might not exist, return null
      console.log('Feedback table not found or error:', error.message);
      return null;
    }
    
    if (!data || data.length === 0) return null;

    let totalRatings = 0;
    let count = 0;

    data.forEach(record => {
      const ratings = [
        record.response_time_rating,
        record.professionalism_rating,
        record.follow_up_rating,
        record.app_helpfulness_rating,
        record.app_usability_rating
      ].filter(r => r !== null && r !== undefined);

      ratings.forEach(r => {
        totalRatings += r;
        count++;
      });
    });

    if (count === 0) return null;
    const avg = totalRatings / count;
    return Math.min(Math.max(avg, 0), 5);
  } catch (error) {
    console.error('getAverageSatisfactionRating Error:', error);
    return null;
  }
}

async function getRecentActivities(limit: number = 10): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('crime_reports')
      .select('id, type_of_incident, location_text, status, incident_date_time, priority')
      .order('incident_date_time', { ascending: false })
      .limit(limit);

    if (error) throw error;
    
    return data?.map(report => ({
      id: report.id,
      report_number: report.id.slice(0, 8).toUpperCase(),
      type_of_incident: report.type_of_incident,
      location_text: report.location_text,
      status: report.status,
      incident_date_time: report.incident_date_time,
      priority: report.priority
    })) || [];
  } catch (error) {
    console.error('getRecentActivities Error:', error);
    return [];
  }
}

// Handle OPTIONS request for CORS if needed
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}