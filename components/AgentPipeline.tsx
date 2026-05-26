'use client';

import AgentCard from './AgentCard';
import type { AgentName, AgentStatus } from '@/lib/agents/base-agent';

export interface AgentState {
  name: AgentName;
  status: AgentStatus;
  summary?: string;
  output?: unknown;
  error?: string;
}

interface AgentPipelineProps {
  agents: AgentState[];
}

const PIPELINE_ORDER: AgentName[] = ['Arzdar', 'Vivechak', 'Shodhak', 'Munshi', 'Nyayadoot'];

export default function AgentPipeline({ agents }: AgentPipelineProps) {
  // Ensure agents are rendered in pipeline order
  const orderedAgents = PIPELINE_ORDER.map((name) => {
    const agent = agents.find((a) => a.name === name);
    return agent || { name, status: 'Waiting' as AgentStatus };
  });

  const doneCount = orderedAgents.filter((a) => a.status === 'Done').length;
  const totalCount = orderedAgents.length;

  return (
    <div className="w-full max-w-3xl">
      {/* Pipeline Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-900">Agent Pipeline</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${(doneCount / totalCount) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium text-slate-500">
              {doneCount}/{totalCount}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {orderedAgents.map((agent, index) => (
          <div key={agent.name} className="relative flex gap-4 pb-4 last:pb-0">
            {/* Timeline connector */}
            <div className="flex flex-col items-center">
              {/* Step number circle */}
              <div
                className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border-2 transition-all ${
                  agent.status === 'Done'
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : agent.status === 'Running'
                    ? 'bg-blue-500 border-blue-500 text-white animate-pulse-ring'
                    : agent.status === 'Error'
                    ? 'bg-red-500 border-red-500 text-white'
                    : 'bg-white border-slate-300 text-slate-400'
                }`}
              >
                {agent.status === 'Done' ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              {/* Vertical line */}
              {index < orderedAgents.length - 1 && (
                <div
                  className={`w-0.5 flex-1 mt-1 transition-colors duration-300 ${
                    agent.status === 'Done' ? 'bg-emerald-300' : 'bg-slate-200'
                  }`}
                />
              )}
            </div>

            {/* Agent Card */}
            <div className="flex-1 pb-2">
              <AgentCard
                name={agent.name}
                status={agent.status}
                summary={agent.summary}
                output={agent.output}
                error={agent.error}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
