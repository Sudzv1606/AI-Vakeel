import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { loadConfig } from '@/lib/config';
import { SessionManager } from '@/lib/session-manager';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/sessions/[id]
 * Returns a single session with all agent outputs.
 * Verifies the session belongs to the authenticated user.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabaseAuth = await createSupabaseServerClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const config = loadConfig();
    const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
    const sessionManager = new SessionManager(supabase);

    const session = await sessionManager.getById(id, user.id);

    if (!session) {
      return NextResponse.json(
        { error: `Session ${id} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch session';
    console.error('Session get error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
