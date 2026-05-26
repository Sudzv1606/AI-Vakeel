'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@/lib/types';

interface SessionHistoryProps {
  onSelectSession?: (sessionId: string) => void;
}

interface PaginatedResponse {
  sessions: Session[];
  total: number;
  page: number;
  pageSize: number;
}

const PAGE_SIZE = 20;

export default function SessionHistory({ onSelectSession }: SessionHistoryProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const totalPages = Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    fetchSessions(page);
  }, [page]);

  async function fetchSessions(pageNum: number) {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/sessions?page=${pageNum}&pageSize=${PAGE_SIZE}`
      );
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const data: PaginatedResponse = await response.json();
      setSessions(data.sessions);
      setTotal(data.total);
    } catch {
      setError('Failed to load sessions. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const statusStyles = {
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
  };

  return (
    <div className="w-full max-w-3xl">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Session History</h2>

      {loading && (
        <p className="text-gray-500 text-sm">Loading sessions...</p>
      )}

      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}

      {!loading && sessions.length === 0 && (
        <p className="text-gray-500 text-sm">No sessions found.</p>
      )}

      <div className="space-y-3">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelectSession?.(session.id)}
            className="w-full text-left border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">
                {new Date(session.createdAt).toLocaleString()}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  statusStyles[session.status]
                }`}
              >
                {session.status}
              </span>
            </div>
            <p className="text-sm text-gray-700 line-clamp-2">
              {session.problemDescription.substring(0, 150)}
              {session.problemDescription.length > 150 ? '…' : ''}
            </p>
          </button>
        ))}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            aria-label="Previous page"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            aria-label="Next page"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
