/**
 * Session Manager for persisting pipeline execution sessions in Supabase.
 * Handles session creation, agent output updates, status transitions,
 * and paginated listing.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AgentName } from './agents/base-agent';
import type { Session } from './types';

// --- Constants ---

/** Maximum sessions per page for list queries */
const MAX_PAGE_SIZE = 20;

// --- Session Manager ---

export class SessionManager {
  private supabase: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Create a new session with UUID, ISO 8601 timestamp, status "in_progress",
   * and the problem description. Optionally associates the session with a user.
   */
  async create(problemDescription: string, userId?: string): Promise<Session> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const session: Session = {
      id,
      createdAt,
      status: 'in_progress',
      problemDescription,
      agentOutputs: {},
      timing: {},
    };

    const insertData: Record<string, unknown> = {
      id: session.id,
      created_at: session.createdAt,
      status: session.status,
      problem_description: session.problemDescription,
      original_language: 'en', // Default to English, updated after Arzdar runs
      agent_outputs: session.agentOutputs,
      timing: session.timing,
    };

    if (userId) {
      insertData.user_id = userId;
    }

    const { error } = await this.supabase.from('sessions').insert(insertData);

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    return session;
  }

  /**
   * Append agent output to the session's agent_outputs JSONB field.
   */
  async updateAgentOutput(
    sessionId: string,
    agentName: AgentName,
    output: unknown
  ): Promise<void> {
    // First get current agent_outputs
    const { data, error: fetchError } = await this.supabase
      .from('sessions')
      .select('agent_outputs')
      .eq('id', sessionId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch session for update: ${fetchError.message}`);
    }

    const agentOutputs = (data?.agent_outputs as Record<string, unknown>) || {};
    const agentKey = agentName.toLowerCase() as string;
    agentOutputs[agentKey] = output;

    const { error: updateError } = await this.supabase
      .from('sessions')
      .update({ agent_outputs: agentOutputs })
      .eq('id', sessionId);

    if (updateError) {
      throw new Error(`Failed to update agent output: ${updateError.message}`);
    }
  }

  /**
   * Mark a session as completed.
   */
  async markComplete(sessionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('sessions')
      .update({ status: 'completed' })
      .eq('id', sessionId);

    if (error) {
      throw new Error(`Failed to mark session complete: ${error.message}`);
    }
  }

  /**
   * Mark a session as failed with error details.
   */
  async markFailed(
    sessionId: string,
    sessionError: Session['error']
  ): Promise<void> {
    const { error } = await this.supabase
      .from('sessions')
      .update({
        status: 'failed',
        error: sessionError,
      })
      .eq('id', sessionId);

    if (error) {
      throw new Error(`Failed to mark session failed: ${error.message}`);
    }
  }

  /**
   * Get a session by its ID. If userId is provided, verifies the session belongs to that user.
   */
  async getById(sessionId: string, userId?: string): Promise<Session | null> {
    let query = this.supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      throw new Error(`Failed to get session: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.mapRowToSession(data);
  }

  /**
   * List sessions with pagination, sorted by createdAt DESC.
   * Maximum 20 sessions per page. If userId is provided, only returns that user's sessions.
   */
  async list(
    page: number,
    pageSize: number,
    userId?: string
  ): Promise<{ sessions: Session[]; total: number }> {
    const effectivePageSize = Math.min(pageSize, MAX_PAGE_SIZE);
    const offset = (page - 1) * effectivePageSize;

    // Get total count
    let countQuery = this.supabase
      .from('sessions')
      .select('*', { count: 'exact', head: true });

    if (userId) {
      countQuery = countQuery.eq('user_id', userId);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      throw new Error(`Failed to count sessions: ${countError.message}`);
    }

    // Get paginated results
    let dataQuery = this.supabase
      .from('sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + effectivePageSize - 1);

    if (userId) {
      dataQuery = dataQuery.eq('user_id', userId);
    }

    const { data, error } = await dataQuery;

    if (error) {
      throw new Error(`Failed to list sessions: ${error.message}`);
    }

    const sessions = (data || []).map((row: Record<string, unknown>) =>
      this.mapRowToSession(row)
    );

    return {
      sessions,
      total: count ?? 0,
    };
  }

  /**
   * Map a database row to a Session object.
   */
  private mapRowToSession(row: Record<string, unknown>): Session {
    return {
      id: row.id as string,
      createdAt: row.created_at as string,
      status: row.status as Session['status'],
      problemDescription: row.problem_description as string,
      agentOutputs: (row.agent_outputs as Session['agentOutputs']) || {},
      error: row.error as Session['error'],
      timing: (row.timing as Session['timing']) || {},
    };
  }
}
