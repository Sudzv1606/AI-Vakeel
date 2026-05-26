'use client';

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
  green: { stroke: '#10b981', text: 'text-emerald-700', label: 'Excellent' },
  yellow: { stroke: '#f59e0b', text: 'text-amber-700', label: 'Fair' },
  red: { stroke: '#ef4444', text: 'text-red-700', label: 'Needs Work' },
};

/**
 * Circular progress indicator showing quality score (0-100).
 * - Green: score ≥ 70
 * - Yellow: score 50-69
 * - Red: score < 50
 */
export default function QualityBadge({ score }: QualityBadgeProps) {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const color = getQualityColor(clampedScore);
  const config = COLOR_CONFIG[color];

  // SVG circle math
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedScore / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      {/* Circular progress ring */}
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16" viewBox="0 0 64 64">
          {/* Background circle */}
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="5"
          />
          {/* Progress circle */}
          <circle
            cx="32"
            cy="32"
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
        {/* Score number in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-bold ${config.text}`}>
            {clampedScore}
          </span>
        </div>
      </div>
      {/* Label */}
      <div className="flex flex-col">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Quality Score
        </span>
        <span className={`text-sm font-semibold ${config.text}`}>
          {config.label}
        </span>
      </div>
    </div>
  );
}
