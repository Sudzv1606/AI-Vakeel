/**
 * Unit tests for SessionManager.
 * Tests session creation, agent output updates, status transitions,
 * getById, and paginated listing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SessionManager } from './session-manager';
import type { SupabaseClient } from '@supabase/supabase-js';

// --- Mock Supabase Client ---

function createMockSupabase(overrides: Record<string, unknown> = {}): SupabaseClient {
  const mockFrom = {
    insert: vi.fn().mockReturnValue({ error: null }),
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: [], error: null }),
    ...overrides,
  };

  // Make chainable methods return the mock itself
  mockFrom.select.mockReturnValue(mockFrom);
  mockFrom.update.mockReturnValue(mockFrom);

  return {
    from: vi.fn().mockReturnValue(mockFrom),
  } as unknown as SupabaseClient;
}

// --- Tests ---

describe('SessionManager', () => {
  describe('create', () => {
    it('should create a session with UUID, ISO timestamp, and in_progress status', async () => {
      const mockFrom = {
        insert: vi.fn().mockReturnValue({ error: null }),
      };
      const supabase = { from: vi.fn().mockReturnValue(mockFrom) } as unknown as SupabaseClient;
      const manager = new SessionManager(supabase);

      const session = await manager.create('My legal problem description that is long enough');

      expect(session.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      expect(session.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(session.status).toBe('in_progress');
      expect(session.problemDescription).toBe('My legal problem description that is long enough');
      expect(session.agentOutputs).toEqual({});
      expect(session.timing).toEqual({});
    });

    it('should call supabase insert with correct data', async () => {
      const insertFn = vi.fn().mockReturnValue({ error: null });
      const mockFrom = { insert: insertFn };
      const supabase = { from: vi.fn().mockReturnValue(mockFrom) } as unknown as SupabaseClient;
      const manager = new SessionManager(supabase);

      await manager.create('Test problem');

      expect(supabase.from).toHaveBeenCalledWith('sessions');
      expect(insertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'in_progress',
          problem_description: 'Test problem',
          agent_outputs: {},
          timing: {},
        })
      );
    });

    it('should throw on insert error', async () => {
      const mockFrom = {
        insert: vi.fn().mockReturnValue({ error: { message: 'Insert failed' } }),
      };
      const supabase = { from: vi.fn().mockReturnValue(mockFrom) } as unknown as SupabaseClient;
      const manager = new SessionManager(supabase);

      await expect(manager.create('Test')).rejects.toThrow('Failed to create session');
    });
  });

  describe('updateAgentOutput', () => {
    it('should append agent output to existing agent_outputs', async () => {
      const updateFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ error: null }),
      });
      const selectFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { agent_outputs: { arzdar: { test: 'existing' } } },
            error: null,
          }),
        }),
      });
      const mockFrom = { select: selectFn, update: updateFn };
      const supabase = { from: vi.fn().mockReturnValue(mockFrom) } as unknown as SupabaseClient;
      const manager = new SessionManager(supabase);

      await manager.updateAgentOutput('session-123', 'Vivechak', { domain: 'consumer' });

      expect(updateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          agent_outputs: {
            arzdar: { test: 'existing' },
            vivechak: { domain: 'consumer' },
          },
        })
      );
    });

    it('should throw on fetch error', async () => {
      const selectFn = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      });
      const mockFrom = { select: selectFn };
      const supabase = { from: vi.fn().mockReturnValue(mockFrom) } as unknown as SupabaseClient;
      const manager = new SessionManager(supabase);

      await expect(
        manager.updateAgentOutput('session-123', 'Arzdar', {})
      ).rejects.toThrow('Failed to fetch session for update');
    });
  });

  describe('markComplete', () => {
    it('should update session status to completed', async () => {
      const eqFn = vi.fn().mockReturnValue({ error: null });
      const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
      const mockFrom = { update: updateFn };
      const supabase = { from: vi.fn().mockReturnValue(mockFrom) } as unknown as SupabaseClient;
      const manager = new SessionManager(supabase);

      await manager.markComplete('session-123');

      expect(updateFn).toHaveBeenCalledWith({ status: 'completed' });
      expect(eqFn).toHaveBeenCalledWith('id', 'session-123');
    });

    it('should throw on update error', async () => {
      const eqFn = vi.fn().mockReturnValue({ error: { message: 'Update failed' } });
      const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
      const mockFrom = { update: updateFn };
      const supabase = { from: vi.fn().mockReturnValue(mockFrom) } as unknown as SupabaseClient;
      const manager = new SessionManager(supabase);

      await expect(manager.markComplete('session-123')).rejects.toThrow('Failed to mark session complete');
    });
  });

  describe('markFailed', () => {
    it('should update session status to failed with error details', async () => {
      const eqFn = vi.fn().mockReturnValue({ error: null });
      const updateFn = vi.fn().mockReturnValue({ eq: eqFn });
      const mockFrom = { update: updateFn };
      const supabase = { from: vi.fn().mockReturnValue(mockFrom) } as unknown as SupabaseClient;
      const manager = new SessionManager(supabase);

      const sessionError = {
        failingAgent: 'Arzdar' as const,
        category: 'llm_timeout',
        description: 'Request timed out',
      };

      await manager.markFailed('session-123', sessionError);

      expect(updateFn).toHaveBeenCalledWith({
        status: 'failed',
        error: sessionError,
      });
      expect(eqFn).toHaveBeenCalledWith('id', 'session-123');
    });
  });

  describe('getById', () => {
    it('should return session when found', async () => {
      const singleFn = vi.fn().mockResolvedValue({
        data: {
          id: 'session-123',
          created_at: '2024-01-15T10:00:00.000Z',
          status: 'completed',
          problem_description: 'Test problem',
          agent_outputs: { arzdar: { test: true } },
          error: null,
          timing: { Arzdar: { startMs: 0, endMs: 100, durationMs: 100 } },
        },
        error: null,
      });
      const eqFn = vi.fn().mockReturnValue({ single: singleFn });
      const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
      const mockFrom = { select: selectFn };
      const supabase = { from: vi.fn().mockReturnValue(mockFrom) } as unknown as SupabaseClient;
      const manager = new SessionManager(supabase);

      const session = await manager.getById('session-123');

      expect(session).not.toBeNull();
      expect(session!.id).toBe('session-123');
      expect(session!.status).toBe('completed');
      expect(session!.problemDescription).toBe('Test problem');
    });

    it('should return null when session not found', async () => {
      const singleFn = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows' },
      });
      const eqFn = vi.fn().mockReturnValue({ single: singleFn });
      const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
      const mockFrom = { select: selectFn };
      const supabase = { from: vi.fn().mockReturnValue(mockFrom) } as unknown as SupabaseClient;
      const manager = new SessionManager(supabase);

      const session = await manager.getById('nonexistent');

      expect(session).toBeNull();
    });

    it('should throw on unexpected error', async () => {
      const singleFn = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'OTHER', message: 'Database error' },
      });
      const eqFn = vi.fn().mockReturnValue({ single: singleFn });
      const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
      const mockFrom = { select: selectFn };
      const supabase = { from: vi.fn().mockReturnValue(mockFrom) } as unknown as SupabaseClient;
      const manager = new SessionManager(supabase);

      await expect(manager.getById('session-123')).rejects.toThrow('Failed to get session');
    });
  });

  describe('list', () => {
    it('should return paginated sessions sorted by createdAt DESC', async () => {
      const rangeFn = vi.fn().mockResolvedValue({
        data: [
          {
            id: 'session-2',
            created_at: '2024-01-16T10:00:00.000Z',
            status: 'completed',
            problem_description: 'Problem 2',
            agent_outputs: {},
            error: null,
            timing: {},
          },
          {
            id: 'session-1',
            created_at: '2024-01-15T10:00:00.000Z',
            status: 'in_progress',
            problem_description: 'Problem 1',
            agent_outputs: {},
            error: null,
            timing: {},
          },
        ],
        error: null,
      });
      const orderFn = vi.fn().mockReturnValue({ range: rangeFn });

      const selectFn = vi.fn().mockImplementation((_selector: string, opts?: { count?: string; head?: boolean }) => {
        if (opts && opts.head) {
          // Count query - Supabase returns a thenable PostgrestBuilder
          return Promise.resolve({ count: 5, error: null });
        }
        // Data query returns chainable
        return { order: orderFn };
      });

      const mockFrom = { select: selectFn };
      const supabase = { from: vi.fn().mockReturnValue(mockFrom) } as unknown as SupabaseClient;
      const manager = new SessionManager(supabase);

      const result = await manager.list(1, 10);

      expect(result.sessions).toHaveLength(2);
      expect(result.sessions[0].id).toBe('session-2');
      expect(result.sessions[1].id).toBe('session-1');
      expect(result.total).toBe(5);
    });

    it('should cap page size at 20', async () => {
      const rangeFn = vi.fn().mockResolvedValue({ data: [], error: null });
      const orderFn = vi.fn().mockReturnValue({ range: rangeFn });

      let callCount = 0;
      const selectFn = vi.fn().mockImplementation((...args: unknown[]) => {
        callCount++;
        if (callCount === 1) {
          return { count: 0, error: null };
        }
        return { order: orderFn };
      });

      const mockFrom = { select: selectFn };
      const supabase = { from: vi.fn().mockReturnValue(mockFrom) } as unknown as SupabaseClient;
      const manager = new SessionManager(supabase);

      await manager.list(1, 50); // Request 50, should be capped at 20

      // The range should be 0 to 19 (20 items max)
      expect(rangeFn).toHaveBeenCalledWith(0, 19);
    });

    it('should calculate correct offset for page 2', async () => {
      const rangeFn = vi.fn().mockResolvedValue({ data: [], error: null });
      const orderFn = vi.fn().mockReturnValue({ range: rangeFn });

      let callCount = 0;
      const selectFn = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return { count: 30, error: null };
        }
        return { order: orderFn };
      });

      const mockFrom = { select: selectFn };
      const supabase = { from: vi.fn().mockReturnValue(mockFrom) } as unknown as SupabaseClient;
      const manager = new SessionManager(supabase);

      await manager.list(2, 10);

      // Page 2 with pageSize 10: offset = (2-1) * 10 = 10, range = 10 to 19
      expect(rangeFn).toHaveBeenCalledWith(10, 19);
    });

    it('should throw on count error', async () => {
      const selectFn = vi.fn().mockReturnValue({ count: null, error: { message: 'Count failed' } });
      const mockFrom = { select: selectFn };
      const supabase = { from: vi.fn().mockReturnValue(mockFrom) } as unknown as SupabaseClient;
      const manager = new SessionManager(supabase);

      await expect(manager.list(1, 10)).rejects.toThrow('Failed to count sessions');
    });
  });
});
