import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { loadConfig } from '@/lib/config';
import { SessionManager } from '@/lib/session-manager';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/sessions?page=1&pageSize=20
 * Lists sessions with pagination, sorted by most recent first.
 * Only returns sessions belonging to the authenticated user.
 */
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabaseAuth = await createSupabaseServerClient();
    const { data: { user } } = await supabaseAuth.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(20, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));

    const config = loadConfig();
    const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
    const sessionManager = new SessionManager(supabase);

    const { sessions, total } = await sessionManager.list(page, pageSize, user.id);

    // Filter out failed sessions from the list
    const visibleSessions = sessions.filter(s => s.status !== 'failed');

    return NextResponse.json({
      sessions: visibleSessions,
      total: total - (sessions.length - visibleSessions.length),
      page,
      pageSize,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch sessions';
    console.error('Sessions list error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
