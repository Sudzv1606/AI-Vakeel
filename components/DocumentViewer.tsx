'use client';

import { useState } from 'react';
import { GavelIcon } from '@/components/icons';

interface DocumentViewerProps {
  document: string | null;
  qualityScore?: number;
  onDocumentEdit?: (editedDocument: string) => void;
}

/**
 * Renders the final complaint document as formatted text with headings,
 * paragraphs, and legal references. Paper-like styling for legal documents.
 * Supports edit mode for user modifications before download.
 */
export default function DocumentViewer({ document, onDocumentEdit }: DocumentViewerProps) {
  const [editing, setEditing] = useState(false);
  const [editedDocument, setEditedDocument] = useState(document || '');
  const [showSaved, setShowSaved] = useState(false);

  // Keep editedDocument in sync when document prop changes
  if (document && document !== editedDocument && !editing) {
    setEditedDocument(document);
  }

  if (!document) {
    return null;
  }

  const displayDocument = editedDocument || document;
  const lines = displayDocument.split('\n');

  // Detect unfilled placeholders
  const placeholderMatches = displayDocument.match(/\[([^\]]*(?:TO BE PROVIDED|NOT PROVIDED|PLACEHOLDER|CITY|DATE|AMOUNT|AGE|ADDRESS|PARENT|NAME)[^\]]*)\]/gi) || [];
  const hasPlaceholders = placeholderMatches.length > 0;

  function handleToggleEdit() {
    if (editing && onDocumentEdit) {
      onDocumentEdit(editedDocument);
    }
    setEditing(!editing);
  }

  function handleEditChange(value: string) {
    setEditedDocument(value);
    if (onDocumentEdit) {
      onDocumentEdit(value);
    }
  }

  function handleSave() {
    if (onDocumentEdit) {
      onDocumentEdit(editedDocument);
    }
    setEditing(false);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  }

  return (
    <div className="w-full max-w-3xl animate-fade-in">
      {/* Placeholder Warning */}
      {hasPlaceholders && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800 font-medium mb-2">
            📝 This document has {placeholderMatches.length} field(s) that need your input before filing:
          </p>
          <ul className="text-xs text-blue-700 space-y-1 ml-4">
            {[...new Set(placeholderMatches)].slice(0, 5).map((p, i) => (
              <li key={i} className="list-disc">{p}</li>
            ))}
            {placeholderMatches.length > 5 && <li className="list-disc">...and {placeholderMatches.length - 5} more</li>}
          </ul>
          <button
            onClick={() => setEditing(true)}
            className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
          >
            Click "Edit Document" to fill in these fields →
          </button>
        </div>
      )}

      {/* Disclaimer Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
        <p className="text-sm text-amber-800 font-medium">
          ⚠️ This document is AI-generated and not a substitute for advice from a licensed advocate. Verify all citations and facts before filing. AI Vakeel does not provide legal advice.
        </p>
      </div>

      {/* Legal document header bar */}
      <div className="flex items-center gap-3 mb-4 px-1">
        <div className="flex items-center gap-2 text-gold-500">
          <GavelIcon className="w-5 h-5" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Generated Complaint
        </h2>
        <div className="flex-1 h-px bg-gradient-to-r from-gold-400/40 to-transparent" />
        {showSaved && (
          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full animate-fade-in">
            Saved
          </span>
        )}
        {/* Edit/Preview toggle button */}
        <button
          onClick={handleToggleEdit}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all
            bg-white text-slate-700 border-slate-200 hover:border-gold-400/50 hover:text-gold-600 hover:bg-gold-50"
        >
          {editing ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Document
            </>
          )}
        </button>
      </div>

      {/* Paper container */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-document overflow-hidden">
        {/* Paper header accent */}
        <div className="h-1 bg-gradient-to-r from-gold-400 via-gold-500 to-gold-400" />

        {editing ? (
          /* Edit mode: textarea */
          <div className="p-4">
            <textarea
              value={editedDocument}
              onChange={(e) => handleEditChange(e.target.value)}
              className="w-full h-[500px] p-4 font-mono text-sm border border-slate-200 rounded-lg resize-y focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30"
              placeholder="Edit your document here..."
            />
            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-gold-400 to-gold-500 rounded-lg hover:from-gold-500 hover:to-gold-600 transition-all shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          /* Read mode: rendered document with line numbers */
          <div className="max-h-[400px] md:max-h-[600px] overflow-y-auto paper-texture">
            <div className="flex">
              {/* Line numbers - hidden on mobile */}
              <div className="hidden md:flex flex-shrink-0 flex-col py-8 pl-3 pr-2 border-r border-slate-100 select-none">
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
              <div className="flex-1 p-6 md:p-8 md:pl-6">
                <div className="prose prose-sm max-w-none font-serif text-[13px] md:text-[15px]">
                  <MarkdownRenderer content={displayDocument} />
                </div>
              </div>
            </div>
          </div>
        )}
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
        <p key={key++} className="mb-2 leading-[1.75rem] text-slate-800">
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
