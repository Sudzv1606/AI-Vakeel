'use client';

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

  return (
    <div className="w-full max-w-3xl animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">📄</span>
        <h2 className="text-lg font-bold text-slate-900">
          Generated Complaint Document
        </h2>
      </div>
      {/* Paper container */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-document overflow-hidden">
        {/* Paper header accent */}
        <div className="h-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />
        {/* Document content */}
        <div className="p-8 max-h-[600px] overflow-y-auto bg-gradient-to-b from-white to-slate-50/50">
          <div className="prose prose-sm max-w-none font-serif">
            <MarkdownRenderer content={document} />
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
          className="text-lg font-bold text-slate-900 mt-8 mb-3 pb-2 border-b border-amber-200 font-sans"
        >
          {trimmed.slice(3)}
        </h3>
      );
    } else if (trimmed.startsWith('# ')) {
      elements.push(
        <h2
          key={key++}
          className="text-xl font-bold text-slate-900 mt-8 mb-4 pb-2 border-b-2 border-amber-400 font-sans"
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
        <p key={key++} className="mb-2 leading-relaxed text-slate-800 text-[15px]">
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
