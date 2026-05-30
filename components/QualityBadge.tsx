'use client';

import { useEffect, useState } from 'react';
import { ShieldCheckIcon } from '@/components/icons';

interface QualityBadgeProps {
  score: number;
}

/**
 * Returns the color class based on quality score.
 * Green ≥ 70, Yellow 50-69, Red < 50.
 */
export function getQualityColor(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 70) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

const COLOR_CONFIG = {
  green: { stroke: '#10b981', text: 'text-emerald-700', label: 'Excellent', bg: 'bg-emerald-50' },
  yellow: { stroke: '#d4a853', text: 'text-gold-600', label: 'Fair', bg: 'bg-amber-50' },
  red: { stroke: '#ef4444', text: 'text-red-700', label: 'Needs Work', bg: 'bg-red-50' },
};

/**
 * Circular progress indicator showing quality score (0-100).
 * Features a count-up animation and ShieldCheck icon.
 */
export default function QualityBadge({ score }: QualityBadgeProps) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const color = getQualityColor(clampedScore);
  const config = COLOR_CONFIG[color];

  // Animated count-up
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let current = 0;
    const step = Math.max(1, Math.floor(clampedScore / 30));
    const interval = setInterval(() => {
      current += step;
      if (current >= clampedScore) {
        current = clampedScore;
        clearInterval(interval);
      }
      setDisplayScore(current);
    }, 40);
    return () => clearInterval(interval);
  }, [clampedScore]);

  // SVG circle math
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="flex items-center gap-4 animate-count-up">
      {/* Circular progress ring - larger */}
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20" viewBox="0 0 72 72">
          {/* Background circle */}
          <circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="5"
          />
          {/* Progress circle */}
          <circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke={config.stroke}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="progress-ring-circle"
          />
        </svg>
        {/* Shield icon + score in center */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <ShieldCheckIcon className={`w-4 h-4 ${config.text} mb-0.5`} />
          <span className={`text-sm font-bold ${config.text}`}>
            {displayScore}
          </span>
        </div>
      </div>
      {/* Label */}
      <div className="flex flex-col">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Quality Score
        </span>
        <span className={`text-sm font-bold ${config.text}`}>
          {config.label}
        </span>
        <span className="text-[10px] text-slate-400 mt-0.5">
          Verified by Nyayadoot
        </span>
        <span className={`text-[11px] mt-1 leading-tight ${config.text} opacity-80`}>
          {clampedScore >= 70
            ? 'Document has all required legal elements. Ready for review by an advocate.'
            : clampedScore >= 50
            ? 'Some elements may be missing. Review the issues below before filing.'
            : 'Document needs significant revision. Consider regenerating with more details.'}
        </span>
      </div>
    </div>
  );
}
