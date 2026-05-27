'use client';

import { useState } from 'react';
import { QuillIcon, RoutingIcon, MagnifyingGlassBookIcon, ScrollIcon, ClipboardCheckIcon, SpinnerIcon } from '@/components/icons';
import type { AgentName, AgentStatus } from '@/lib/agents/base-agent';

interface AgentCardProps {
  name: AgentName;
  status: AgentStatus;
  summary?: string;
  output?: unknown;
  error?: string;
}

const STATUS_CONFIG: Record<AgentStatus, { border: string; bg: string; text: string; label: string }> = {
  Waiting: { border: 'border-l-slate-300', bg: 'bg-slate-50', text: 'text-slate-500', label: 'Waiting' },
  Running: { border: 'border-l-gold-400', bg: 'bg-amber-50', text: 'text-gold-600', label: 'Running' },
  Done: { border: 'border-l-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Done' },
  Error: { border: 'border-l-red-500', bg: 'bg-red-50', text: 'text-red-700', label: 'Error' },
};

const AGENT_ICONS: Record<AgentName, React.ReactNode> = {
  Arzdar: <QuillIcon className="w-5 h-5" />,
  Vivechak: <RoutingIcon className="w-5 h-5" />,
  Shodhak: <MagnifyingGlassBookIcon className="w-5 h-5" />,
  Munshi: <ScrollIcon className="w-5 h-5" />,
  Nyayadoot: <ClipboardCheckIcon className="w-5 h-5" />,
};

const AGENT_DESCRIPTIONS: Record<AgentName, string> = {
  Arzdar: 'Intake Agent: Extracts facts from your problem',
  Vivechak: 'Router Agent: Determines legal domain & forum',
  Shodhak: 'Research Agent: Finds relevant legal sections',
  Munshi: 'Draft Agent: Writes the complaint document',
  Nyayadoot: 'Review Agent: Reviews quality & completeness',
};

export default function AgentCard({ name, status, summary, output, error }: AgentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[status];

  const truncatedSummary =
    summary && summary.length > 200 ? summary.substring(0, 200) + '…' : summary;

  return (
    <div
      className={`border border-slate-200/80 ${config.border} border-l-4 rounded-lg p-4 bg-white shadow-card transition-all duration-200 hover:shadow-card-hover ${
        status === 'Running' ? 'animate-shimmer' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center justify-center w-9 h-9 rounded-lg ${
              status === 'Done'
                ? 'bg-emerald-50 text-emerald-600'
                : status === 'Running'
                ? 'bg-amber-50 text-gold-500'
                : status === 'Error'
                ? 'bg-red-50 text-red-500'
                : 'bg-slate-50 text-slate-400'
            } transition-colors`}
          >
            {AGENT_ICONS[name]}
          </span>
          <div>
            <h3 className="font-bold text-slate-900 text-base">{name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{AGENT_DESCRIPTIONS[name]}</p>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}
        >
          {status === 'Waiting' && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          )}
          {status === 'Running' && (
            <SpinnerIcon className="w-3 h-3" />
          )}
          {status === 'Done' && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {status === 'Error' && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {config.label}
        </span>
      </div>

      {/* Summary */}
      {status === 'Done' && truncatedSummary && (
        <div className="mt-3 animate-fade-in">
          <p className="text-sm text-slate-600 leading-relaxed">
            {truncatedSummary}
          </p>
          <span className="inline-block mt-1.5 text-[10px] text-slate-400 font-medium">
            ✓ Completed
          </span>
        </div>
      )}

      {/* Error */}
      {status === 'Error' && error && (
        <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-md px-3 py-2 animate-fade-in">
          {error}
        </p>
      )}

      {/* Expandable Output */}
      {status === 'Done' && output !== undefined && output !== null && (
        <div className="mt-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 text-sm text-gold-500 hover:text-gold-600 font-medium transition-colors"
            aria-expanded={expanded}
            aria-controls={`agent-output-${name}`}
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            {expanded ? 'Hide output' : 'Show output'}
          </button>
          <div
            className={`transition-height overflow-hidden ${
              expanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <pre
              id={`agent-output-${name}`}
              className="mt-2 p-4 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-700 overflow-x-auto max-h-96 overflow-y-auto font-mono"
            >
              {typeof output === 'string' ? output : JSON.stringify(output, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
