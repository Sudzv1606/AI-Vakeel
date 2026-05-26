'use client';

import { useState, useCallback } from 'react';
import ProblemInput from '@/components/ProblemInput';
import AgentPipeline from '@/components/AgentPipeline';
import DocumentViewer from '@/components/DocumentViewer';
import QualityBadge from '@/components/QualityBadge';
import ExportButtons from '@/components/ExportButtons';
import Header from '@/components/Header';
import Walkthrough, { useWalkthrough } from '@/components/Walkthrough';
import { useSSE } from '@/hooks/useSSE';
import type { AgentState } from '@/components/AgentPipeline';
import type { PipelineEvent } from '@/lib/types';

const INITIAL_AGENTS: AgentState[] = [
  { name: 'Arzdar', status: 'Waiting' },
  { name: 'Vivechak', status: 'Waiting' },
  { name: 'Shodhak', status: 'Waiting' },
  { name: 'Munshi', status: 'Waiting' },
  { name: 'Nyayadoot', status: 'Waiting' },
];

export default function Home() {
  const [agents, setAgents] = useState<AgentState[]>(INITIAL_AGENTS);
  const [finalDocument, setFinalDocument] = useState<string | null>(null);
  const [qualityScore, setQualityScore] = useState<number | undefined>(undefined);
  const [pipelineActive, setPipelineActive] = useState(false);
  const [pipelineCompleted, setPipelineCompleted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const { showWalkthrough, triggerWalkthrough, closeWalkthrough } = useWalkthrough();

  const handleSSEEvent = useCallback((event: PipelineEvent) => {
    if (event.type === 'status_update' && event.agentName && event.status) {
      setAgents((prev) =>
        prev.map((agent) =>
          agent.name === event.agentName
            ? { ...agent, status: event.status!, summary: event.summary }
            : agent
        )
      );
    }

    if (event.type === 'agent_output' && event.agentName) {
      setAgents((prev) =>
        prev.map((agent) =>
          agent.name === event.agentName
            ? { ...agent, output: event.data }
            : agent
        )
      );
    }

    if (event.type === 'pipeline_complete' && event.data) {
      const data = event.data as { finalDocument?: string; qualityScore?: number };
      if (data.finalDocument) setFinalDocument(data.finalDocument);
      if (data.qualityScore !== undefined) setQualityScore(data.qualityScore);
      setPipelineActive(false);
      setPipelineCompleted(true);
    }

    if (event.type === 'pipeline_error' || event.type === 'timeout') {
      setPipelineActive(false);
      setPipelineCompleted(true);
      if (event.agentName) {
        setAgents((prev) =>
          prev.map((agent) =>
            agent.name === event.agentName
              ? { ...agent, status: 'Error', error: event.summary || 'An error occurred' }
              : agent
          )
        );
      }
    }
  }, []);

  const { error: sseError, startPipeline, sessionId } = useSSE(handleSSEEvent);

  async function handleSubmit(problemDescription: string) {
    setSubmitError('');
    setPipelineActive(true);
    setPipelineCompleted(false);
    setAgents(INITIAL_AGENTS);
    setFinalDocument(null);
    setQualityScore(undefined);

    await startPipeline(problemDescription);

    if (sseError) {
      setSubmitError(sseError);
      setPipelineActive(false);
    }
  }

  function handleReset() {
    setPipelineActive(false);
    setPipelineCompleted(false);
    setAgents(INITIAL_AGENTS);
    setFinalDocument(null);
    setQualityScore(undefined);
    setSubmitError('');
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <Header onHelpClick={triggerWalkthrough} />

      {/* Walkthrough Overlay */}
      <Walkthrough show={showWalkthrough} onClose={closeWalkthrough} />

      {/* Main Content */}
      <main className="flex-1 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-10">
          {/* Hero Section */}
          <div className="text-center max-w-2xl animate-fade-in">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Draft Legal Complaints with AI
            </h2>
            <p className="mt-3 text-slate-600 text-lg leading-relaxed">
              Describe your legal issue and our team of 5 AI agents will analyze, research, 
              and draft a professional complaint document for you.
            </p>
          </div>

          {/* Problem Input */}
          <ProblemInput onSubmit={handleSubmit} disabled={pipelineActive || pipelineCompleted} />

          {/* Generate Another button */}
          {pipelineCompleted && (
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-white border-2 border-amber-500 text-amber-700 rounded-lg font-semibold text-sm hover:bg-amber-50 transition-all shadow-sm"
            >
              + Generate Another Complaint
            </button>
          )}

          {submitError && (
            <div className="w-full max-w-3xl animate-fade-in">
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3" role="alert">
                {submitError}
              </p>
            </div>
          )}

          {/* Agent Pipeline */}
          {(pipelineActive || agents.some((a) => a.status !== 'Waiting')) && (
            <div className="animate-fade-in w-full flex justify-center">
              <AgentPipeline agents={agents} />
            </div>
          )}

          {/* Final Document */}
          {finalDocument && (
            <div className="w-full max-w-3xl space-y-6 animate-fade-in">
              <div className="flex items-center justify-between flex-wrap gap-4 bg-white rounded-xl p-4 shadow-card border border-slate-100">
                {qualityScore !== undefined && <QualityBadge score={qualityScore} />}
                <ExportButtons document={finalDocument} sessionId={sessionId || undefined} />
              </div>
              <DocumentViewer document={finalDocument} qualityScore={qualityScore} />
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>⚖️</span>
            <span className="font-medium text-slate-700">AI Vakeel</span>
            <span className="text-slate-300">|</span>
            <span>Built for OpenAI × Outskill Hackathon</span>
          </div>
          <p className="text-xs text-slate-400">
            This tool generates draft documents only. Always consult a qualified lawyer for legal advice.
          </p>
        </div>
      </footer>
    </div>
  );
}
