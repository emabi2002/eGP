/* eslint-disable @typescript-eslint/ban-ts-comment */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile from users table
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*, organizations(*)')
      .eq('id', user.id)
      .single();

    if (profileError) {
      // If profile doesn't exist, return user metadata
      return NextResponse.json({
        id: user.id,
        email: user.email,
        firstName: user.user_metadata?.first_name || '',
        lastName: user.user_metadata?.last_name || '',
        role: user.user_metadata?.role || 'PUBLIC_VIEWER',
        profileExists: false,
      });
    }

    return NextResponse.json({
      ...(profile as Record<string, unknown>),
      profileExists: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Create or update user profile in users table
    // @ts-ignore - Supabase types are auto-generated
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email || body.email,
        username: body.username || user.email?.split('@')[0] || '',
        first_name: body.firstName || user.user_metadata?.first_name || '',
        last_name: body.lastName || user.user_metadata?.last_name || '',
        role: body.role || user.user_metadata?.role || 'SUPPLIER',
        organization_id: body.organizationId || null,
        is_active: true,
      })
      .select()
      .single();

    if (profileError) {
      throw profileError;
    }

    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Update user profile
    // @ts-ignore - Supabase types are auto-generated
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .update({
        first_name: body.firstName,
        last_name: body.lastName,
        username: body.username,
        organization_id: body.organizationId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
      .select()
      .single();

    if (profileError) {
      throw profileError;
    }

    // Also update Supabase auth user metadata
    await supabase.auth.updateUser({
      data: {
        first_name: body.firstName,
        last_name: body.lastName,
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
