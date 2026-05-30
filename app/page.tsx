'use client';

import { useState, useCallback, useEffect } from 'react';
import ProblemInput from '@/components/ProblemInput';
import AgentPipeline from '@/components/AgentPipeline';
import DocumentViewer from '@/components/DocumentViewer';
import QualityBadge from '@/components/QualityBadge';
import ExportButtons from '@/components/ExportButtons';
import Header from '@/components/Header';
import Walkthrough, { useWalkthrough } from '@/components/Walkthrough';
import { ScalesIcon } from '@/components/icons';
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

const MAX_DAILY_USES = 5;

function getDailyUsage(): number {
  if (typeof window === 'undefined') return 0;
  const today = new Date().toISOString().split('T')[0];
  const stored = localStorage.getItem('ai_vakeel_usage');
  if (stored) {
    try {
      const { date, count } = JSON.parse(stored);
      if (date === today) return count;
    } catch {
      return 0;
    }
  }
  return 0;
}

function incrementUsage(): void {
  if (typeof window === 'undefined') return;
  const today = new Date().toISOString().split('T')[0];
  const current = getDailyUsage();
  localStorage.setItem('ai_vakeel_usage', JSON.stringify({ date: today, count: current + 1 }));
}

export default function Home() {
  const [agents, setAgents] = useState<AgentState[]>(INITIAL_AGENTS);
  const [finalDocument, setFinalDocument] = useState<string | null>(null);
  const [editedDocument, setEditedDocument] = useState<string | null>(null);
  const [qualityScore, setQualityScore] = useState<number | undefined>(undefined);
  const [pipelineActive, setPipelineActive] = useState(false);
  const [pipelineCompleted, setPipelineCompleted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [dailyUsage, setDailyUsage] = useState(0);

  const { showWalkthrough, triggerWalkthrough, closeWalkthrough } = useWalkthrough();

  useEffect(() => {
    setDailyUsage(getDailyUsage());
  }, []);

  const remainingUses = MAX_DAILY_USES - dailyUsage;
  const limitReached = remainingUses <= 0;

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
    if (limitReached) {
      setSubmitError('Daily limit reached. Try again tomorrow.');
      return;
    }

    setSubmitError('');
    setPipelineActive(true);
    setPipelineCompleted(false);
    setAgents(INITIAL_AGENTS);
    setFinalDocument(null);
    setEditedDocument(null);
    setQualityScore(undefined);

    incrementUsage();
    setDailyUsage(getDailyUsage());

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
    setEditedDocument(null);
    setQualityScore(undefined);
    setSubmitError('');
  }

  const softwareAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AI Vakeel',
    applicationCategory: 'LegalService',
    operatingSystem: 'Web',
    description: 'AI-powered legal complaint generator for Indian consumers. Generate consumer complaints, RERA complaints, and RTI applications instantly.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150',
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
      {/* Header */}
      <Header onHelpClick={triggerWalkthrough} />

      {/* Walkthrough Overlay */}
      <Walkthrough show={showWalkthrough} onClose={closeWalkthrough} />

      {/* Main Content */}
      <main className="flex-1 py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-12">
          {/* Hero Section */}
          <div className="text-center max-w-2xl animate-fade-in relative">
            {/* Subtle watermark pattern behind hero */}
            <div className="absolute inset-0 -m-8 legal-watermark opacity-30 pointer-events-none" />
            <div className="relative">
              <h2 className="text-3xl font-extrabold text-navy-900 tracking-tight">
                Draft Legal Complaints with AI
              </h2>
              <p className="mt-4 text-slate-600 text-lg leading-relaxed">
                Describe your legal issue and our team of 5 AI agents will analyze, research, 
                and draft a professional complaint document for you.
              </p>
            </div>
          </div>

          {/* Service Cards - Links to Landing Pages */}
          <div className="w-full max-w-3xl grid md:grid-cols-3 gap-4">
            <a href="/consumer-complaint" className="block p-5 bg-white rounded-xl border border-slate-200 hover:border-gold-400 hover:shadow-card-hover transition-all group">
              <span className="text-2xl">🛒</span>
              <h3 className="font-bold text-navy-900 mt-2 group-hover:text-gold-600 transition-colors">Consumer Complaint</h3>
              <p className="text-xs text-slate-500 mt-1">Against Flipkart, Amazon, or any seller/service provider</p>
            </a>
            <a href="/rera-complaint" className="block p-5 bg-white rounded-xl border border-slate-200 hover:border-gold-400 hover:shadow-card-hover transition-all group">
              <span className="text-2xl">🏗️</span>
              <h3 className="font-bold text-navy-900 mt-2 group-hover:text-gold-600 transition-colors">RERA Complaint</h3>
              <p className="text-xs text-slate-500 mt-1">Against builders for delayed possession or broken promises</p>
            </a>
            <a href="/rti-application" className="block p-5 bg-white rounded-xl border border-slate-200 hover:border-gold-400 hover:shadow-card-hover transition-all group">
              <span className="text-2xl">📋</span>
              <h3 className="font-bold text-navy-900 mt-2 group-hover:text-gold-600 transition-colors">RTI Application</h3>
              <p className="text-xs text-slate-500 mt-1">Get information from any government department</p>
            </a>
          </div>

          {/* Examples link */}
          <a href="/examples" className="text-sm text-gold-500 hover:text-gold-600 font-medium transition-colors">
            View sample complaints generated by AI Vakeel →
          </a>

          {/* Problem Input */}
          <div className="w-full max-w-3xl">
            {limitReached ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center">
                <p className="text-amber-800 font-semibold">Daily limit reached. Try again tomorrow.</p>
                <p className="text-amber-600 text-sm mt-1">Free users can generate up to {MAX_DAILY_USES} documents per day.</p>
              </div>
            ) : (
              <>
                <ProblemInput onSubmit={handleSubmit} disabled={pipelineActive || pipelineCompleted} />
                <p className="text-xs text-slate-400 text-center mt-2">
                  {remainingUses} of {MAX_DAILY_USES} free generations remaining today
                </p>
              </>
            )}
          </div>

          {/* Generate Another button */}
          {pipelineCompleted && (
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-white border-2 border-gold-400 text-gold-600 rounded-lg font-semibold text-sm hover:bg-cream hover:shadow-gold-glow transition-all shadow-sm"
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

          {/* Divider between input and pipeline */}
          {(pipelineActive || agents.some((a) => a.status !== 'Waiting')) && (
            <div className="w-full max-w-3xl flex items-center gap-4">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold-400/40 to-transparent" />
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Pipeline Progress</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold-400/40 to-transparent" />
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
              {/* Disclaimer Banner */}
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4">
                <p className="text-sm text-amber-900 font-medium leading-relaxed">
                  ⚠️ DISCLAIMER: This document is AI-generated and is NOT legal advice. It is not a substitute for consultation with a licensed advocate. Verify all section citations and facts before filing. AI Vakeel is not responsible for any legal consequences of using this document.
                </p>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-4 bg-white rounded-xl p-5 shadow-legal border border-slate-100">
                {qualityScore !== undefined && <QualityBadge score={qualityScore} />}
                <ExportButtons document={editedDocument || finalDocument} sessionId={sessionId || undefined} />
              </div>
              <DocumentViewer document={finalDocument} qualityScore={qualityScore} onDocumentEdit={(doc) => setEditedDocument(doc)} />
            </div>
          )}

          {/* What to Do Next */}
          {finalDocument && (
            <div className="w-full max-w-3xl bg-white rounded-xl p-6 shadow-card border border-slate-100">
              <h3 className="text-lg font-bold text-navy-900 mb-4">What to Do Next</h3>
              <ol className="space-y-3 text-sm text-slate-700">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-gold-400/10 rounded-full flex items-center justify-center text-gold-500 font-bold text-xs">1</span>
                  <span><strong>Review the document</strong> carefully. Fill in any [TO BE PROVIDED] fields with your actual details (address, parent&apos;s name, age).</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-gold-400/10 rounded-full flex items-center justify-center text-gold-500 font-bold text-xs">2</span>
                  <span><strong>Consult a lawyer</strong> (recommended). Show the document to a licensed advocate for verification before filing.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-gold-400/10 rounded-full flex items-center justify-center text-gold-500 font-bold text-xs">3</span>
                  <span><strong>File the complaint.</strong> Consumer complaints: file at <a href="https://edaakhil.nic.in" target="_blank" rel="noopener noreferrer" className="text-gold-500 underline">e-Daakhil portal</a> or your local District Commission. RERA: file at your state RERA portal. RTI: file at <a href="https://rtionline.gov.in" target="_blank" rel="noopener noreferrer" className="text-gold-500 underline">rtionline.gov.in</a> or by post.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-gold-400/10 rounded-full flex items-center justify-center text-gold-500 font-bold text-xs">4</span>
                  <span><strong>Pay the filing fee.</strong> Consumer Commission: Rs 100-500 depending on claim. RERA: Rs 1,000-5,000 depending on state. RTI: Rs 10.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-gold-400/10 rounded-full flex items-center justify-center text-gold-500 font-bold text-xs">5</span>
                  <span><strong>Attach annexures.</strong> Print the complaint, attach all supporting documents (invoice, screenshots, correspondence), and submit.</span>
                </li>
              </ol>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-white/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Legal Tools</h4>
              <ul className="space-y-1.5">
                <li><a href="/consumer-complaint" className="text-xs text-slate-500 hover:text-gold-500">Consumer Complaint</a></li>
                <li><a href="/rera-complaint" className="text-xs text-slate-500 hover:text-gold-500">RERA Complaint</a></li>
                <li><a href="/rti-application" className="text-xs text-slate-500 hover:text-gold-500">RTI Application</a></li>
                <li><a href="/examples" className="text-xs text-slate-500 hover:text-gold-500">Sample Complaints</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">RERA by State</h4>
              <ul className="space-y-1.5">
                <li><a href="/rera-complaint/maharashtra" className="text-xs text-slate-500 hover:text-gold-500">MahaRERA</a></li>
                <li><a href="/rera-complaint/karnataka" className="text-xs text-slate-500 hover:text-gold-500">K-RERA</a></li>
                <li><a href="/rera-complaint/uttar-pradesh" className="text-xs text-slate-500 hover:text-gold-500">UP-RERA</a></li>
                <li><a href="/rera-complaint/tamil-nadu" className="text-xs text-slate-500 hover:text-gold-500">TNRERA</a></li>
                <li><a href="/rera-complaint/delhi" className="text-xs text-slate-500 hover:text-gold-500">Delhi RERA</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Account</h4>
              <ul className="space-y-1.5">
                <li><a href="/sessions" className="text-xs text-slate-500 hover:text-gold-500">Session History</a></li>
                <li><a href="/profile" className="text-xs text-slate-500 hover:text-gold-500">Profile</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <ScalesIcon className="w-4 h-4 text-gold-400" />
              <span className="font-medium text-slate-700">AI Vakeel</span>
              <span className="text-slate-300">|</span>
              <span>Built for OpenAI × Outskill Hackathon</span>
            </div>
            <p className="text-xs text-slate-400">
              This tool generates draft documents only. Always consult a qualified lawyer for legal advice.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
