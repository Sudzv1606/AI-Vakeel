'use client';

import { GavelIcon } from '@/components/icons';

interface DocumentViewerProps {
  document: string | null;
  qualityScore?: number;
}

/**
 * Renders the final complaint document as formatted text with headings,
 * paragraphs, and legal references. Paper-like styling for legal documents.
 */
export default function DocumentViewer({ document }: DocumentViewerProps) {
  if (!document) {
    return null;
  }

  const lines = document.split('\n');

  return (
    <div className="w-full max-w-3xl animate-fade-in">
      {/* Legal document header bar */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <div className="flex items-center gap-2 text-gold-500">
          <GavelIcon className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Generated Complaint
        </h2>
        <div className="flex-1 h-px bg-gradient-to-r from-gold-400/40 to-transparent" />
      </div>

      {/* Paper container */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-document overflow-hidden">
        {/* Paper header accent */}
        <div className="h-1 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-400" />

        {/* Document content with line numbers */}
        <div className="max-h-[600px] overflow-y-auto paper-texture">
          <div className="flex">
            {/* Line numbers */}
            <div className="flex-shrink-0 py-8 pl-3 pr-2 border-r border-slate-100 select-none">
              {lines.map((_, i) => (
                <div
                  key={i}
                  className="text-[10px] text-slate-300 font-mono leading-[1.75rem] text-right w-6"
                >
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Document content */}
            <div className="flex-1 p-8 pl-6">
              <div className="prose prose-sm max-w-none font-serif">
                <MarkdownRenderer content={document} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Simple markdown-to-HTML renderer for complaint documents.
 * Handles headings, paragraphs, bold, and numbered lists.
 */
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let key = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h4
          key={key++}
          className="text-sm font-bold uppercase tracking-wide text-slate-700 mt-6 mb-2 pb-1 border-b border-slate-100 font-sans"
        >
          {trimmed.slice(4)}
        </h4>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h3
          key={key++}
          className="text-lg font-bold text-slate-900 mt-8 mb-3 pb-2 border-b border-gold-400/30 font-sans flex items-center gap-2"
        >
          <span className="w-1 h-5 bg-gold-400 rounded-full inline-block" />
          {trimmed.slice(3)}
        </h3>
      );
    } else if (trimmed.startsWith('# ')) {
      elements.push(
        <h2
          key={key++}
          className="text-xl font-bold text-slate-900 mt-8 mb-4 pb-2 border-b-2 border-gold-400 font-sans"
        >
          {trimmed.slice(2)}
        </h2>
      );
    } else if (trimmed === '') {
      elements.push(<div key={key++} className="h-3" />);
    } else {
      // Render bold text within paragraphs
      const parts = trimmed.split(/\*\*(.*?)\*\*/g);
      elements.push(
        <p key={key++} className="mb-2 leading-[1.75rem] text-slate-800 text-[15px]">
          {parts.map((part, i) =>
            i % 2 === 1 ? (
              <strong key={i} className="font-bold text-slate-900">{part}</strong>
            ) : (
              <span key={i}>{part}</span>
            )
          )}
        </p>
      );
    }
  }

  return <>{elements}</>;
}
