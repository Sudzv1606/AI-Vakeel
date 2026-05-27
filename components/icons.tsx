import React from 'react';

interface IconProps {
  className?: string;
}

/** Scales of Justice - stylized modern icon for logo/header */
export function ScalesIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v18" />
      <path d="M12 3l-8 4" />
      <path d="M12 3l8 4" />
      <path d="M4 7l1.5 6" />
      <path d="M4 7l-1.5 6" />
      <path d="M2.5 13a2.5 2.5 0 005 0" />
      <path d="M20 7l1.5 6" />
      <path d="M20 7l-1.5 6" />
      <path d="M18.5 13a2.5 2.5 0 005 0" />
      <path d="M9 21h6" />
    </svg>
  );
}

/** Judge's Gavel - for legal actions */
export function GavelIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 3.5l6 6" />
      <rect x="13" y="2" width="8" height="2" rx="1" transform="rotate(45 17 4)" />
      <path d="M4 20l8-8" />
      <path d="M14 10l-4 4" />
      <rect x="2" y="19" width="8" height="2.5" rx="1.25" />
    </svg>
  );
}

/** Legal Scroll/Document - for Munshi/document generation */
export function ScrollIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 3H6a2 2 0 00-2 2v1a2 2 0 002 2h1" />
      <path d="M8 3v5a2 2 0 01-2 2H5" />
      <path d="M8 3h8a2 2 0 012 2v12a2 2 0 01-2 2h-1" />
      <path d="M15 21v-5a2 2 0 012-2h1" />
      <path d="M15 21H7a2 2 0 01-2-2v-1a2 2 0 012-2h1" />
      <path d="M18 14h-1a2 2 0 00-2 2v5h3a2 2 0 002-2v-3a2 2 0 00-2-2z" />
      <path d="M10 9h4" />
      <path d="M10 12h3" />
    </svg>
  );
}

/** Magnifying Glass over Book - for Shodhak/research */
export function MagnifyingGlassBookIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 016.5 17H14" />
      <path d="M4 4.5A2.5 2.5 0 016.5 2H14v13H6.5A2.5 2.5 0 004 17.5v-13z" />
      <circle cx="17" cy="13" r="3.5" />
      <path d="M19.5 15.5L22 18" />
      <path d="M7 6h5" />
      <path d="M7 9h3" />
    </svg>
  );
}

/** Branching Paths/Router - for Vivechak/routing */
export function RoutingIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="4" r="2" />
      <circle cx="6" cy="20" r="2" />
      <circle cx="18" cy="20" r="2" />
      <path d="M12 6v4" />
      <path d="M12 10c-4 0-6 4-6 8" />
      <path d="M12 10c4 0 6 4 6 8" />
    </svg>
  );
}

/** Clipboard with Checkmark - for Nyayadoot/review */
export function ClipboardCheckIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 3h6v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V3z" />
      <path d="M9 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2h-2" />
      <path d="M9 14l2 2 4-4" />
    </svg>
  );
}

/** Quill Pen Writing - for Arzdar/intake */
export function QuillIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 2c-2 0-6 2-8 6-1 2-1.5 4-1.5 6" />
      <path d="M10.5 14L4 21" />
      <path d="M4 21l1-4" />
      <path d="M4 21l4-1" />
      <path d="M20 2c0 2-1 4-3 6s-4 3-6.5 4" />
      <path d="M15 4c-1 2-2 4-4 5.5" />
    </svg>
  );
}

/** Shield with Checkmark - for quality/trust */
export function ShieldCheckIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2l7 3.5v5c0 5-3 9.5-7 11-4-1.5-7-6-7-11v-5L12 2z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

/** Download Arrow */
export function DownloadIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 4v12" />
      <path d="M8 12l4 4 4-4" />
      <path d="M4 18h16" />
    </svg>
  );
}

/** Copy/Clipboard */
export function CopyIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 012-2h10" />
    </svg>
  );
}

/** Animated Loading Spinner */
export function SpinnerIcon({ className }: IconProps) {
  return (
    <svg
      className={`animate-spin ${className || ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <path d="M12 2a10 10 0 019.8 8" opacity="0.9" />
      <path d="M12 2a10 10 0 00-9.8 8" opacity="0.3" />
      <path d="M2.2 10A10 10 0 0012 22" opacity="0.5" />
      <path d="M12 22a10 10 0 009.8-8" opacity="0.7" />
    </svg>
  );
}
