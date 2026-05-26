'use client';

import { useEffect, useState } from 'react';
import AgentPipeline from './AgentPipeline';
import DocumentViewer from './DocumentViewer';
import QualityBadge from './QualityBadge';
import ExportButtons from './ExportButtons';
import type { AgentState } from './AgentPipeline';
import type { Session } from '@/lib/types';
import type { AgentName } from '@/lib/agents/base-agent';

interface SessionDetailProps {
  sessionId: string;
}

const AGENT_ORDER: AgentName[] = ['Arzdar', 'Vivechak', 'Shodhak', 'Munshi', 'Nyayadoot'];

export default function SessionDetail({ sessionId }: SessionDetailProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSession();
  }, [sessionId]);

  async function fetchSession() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/sessions/${sessionId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError('Session not found.');
        } else {
          throw new Error('Failed to fetch session');
        }
        return;
      }
      const data: Session = await response.json();
      setSession(data);
    } catch {
      setError('Failed to load session. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <p className="text-gray-500 text-sm">Loading session...</p>;
  }

  if (error) {
    return <p className="text-red-600 text-sm">{error}</p>;
  }

  if (!session) {
    return <p className="text-gray-500 text-sm">Session not found.</p>;
  }

  // Build agent states from session data
  const agentStates: AgentState[] = AGENT_ORDER.map((name) => {
    const key = name.toLowerCase() as keyof typeof session.agentOutputs;
    const output = session.agentOutputs[key];
    const hasError = session.error?.failingAgent === name;

    let status: AgentState['status'];
    if (hasError) {
      status = 'Error';
    } else if (output) {
      status = 'Done';
    } else if (session.status === 'in_progress') {
      status = 'Waiting';
    } else {
      status = 'Waiting';
    }

    return {
      name,
      status,
      output,
      error: hasError ? session.error?.description : undefined,
    };
  });

  // Extract final document from Nyayadoot output
  const nyayadootOutput = session.agentOutputs.nyayadoot as
    | { finalDocument?: string; qualityScore?: number }
    | undefined;
  const finalDocument = nyayadootOutput?.finalDocument || null;
  const qualityScore = nyayadootOutput?.qualityScore;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Session Details</h2>
        <div className="text-sm text-gray-500 space-y-1">
          <p>ID: {session.id}</p>
          <p>Created: {new Date(session.createdAt).toLocaleString()}</p>
          <p>Status: {session.status}</p>
        </div>
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">{session.problemDescription}</p>
        </div>
      </div>

      <AgentPipeline agents={agentStates} />

      {finalDocument && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {qualityScore !== undefined && <QualityBadge score={qualityScore} />}
            <ExportButtons document={finalDocument} sessionId={session.id} />
          </div>
          <DocumentViewer document={finalDocument} qualityScore={qualityScore} />
        </div>
      )}
    </div>
  );
}
