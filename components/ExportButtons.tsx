'use client';

import { useState } from 'react';
import { DownloadIcon, CopyIcon } from '@/components/icons';

interface ExportButtonsProps {
  document: string;
  sessionId?: string;
}

/**
 * Download PDF button, copy-to-clipboard button, and share button.
 * Styled as a pill-shaped toolbar group.
 */
export default function ExportButtons({ document, sessionId }: ExportButtonsProps) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [shareTooltip, setShareTooltip] = useState(false);

  async function handleDownloadPdf() {
    setDownloading(true);
    setDownloadError('');

    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document, sessionId }),
      });

      if (!response.ok) {
        throw new Error('PDF generation failed');
      }

      // Open the HTML response in a new tab for print-to-PDF
      const html = await response.text();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');

      // Clean up after a delay
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      setDownloadError('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  }

  async function handleDownloadText() {
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document, sessionId, format: 'text' }),
      });

      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `complaint-${sessionId || 'document'}.txt`;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Text download failed.');
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(document);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback for older browsers
      const textarea = window.document.createElement('textarea');
      textarea.value = document;
      window.document.body.appendChild(textarea);
      textarea.select();
      window.document.execCommand('copy');
      window.document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  }

  function handleShare() {
    setShareTooltip(true);
    setTimeout(() => setShareTooltip(false), 2500);
  }

  return (
    <div className="flex items-center gap-2">
      {/* Pill-shaped toolbar container */}
      <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50/80 p-1 gap-0.5">
        <button
          onClick={handleDownloadPdf}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white rounded-full shadow-sm border border-slate-200/80 hover:bg-slate-50 hover:border-gold-400/50 hover:text-gold-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          aria-label="Download complaint as PDF"
        >
          <DownloadIcon className="w-4 h-4" />
          {downloading ? 'Preparing...' : 'PDF'}
        </button>

        <button
          onClick={handleDownloadText}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white rounded-full shadow-sm border border-slate-200/80 hover:bg-slate-50 hover:border-gold-400/50 hover:text-gold-600 transition-all"
          aria-label="Download complaint as text file"
        >
          <DownloadIcon className="w-4 h-4" />
          .txt
        </button>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        <button
          onClick={handleCopy}
          className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full shadow-sm border transition-all ${
            copied
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50 hover:border-gold-400/50 hover:text-gold-600'
          }`}
          aria-label={copied ? 'Copied to clipboard' : 'Copy complaint text to clipboard'}
        >
          {copied ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Copied
            </>
          ) : (
            <>
              <CopyIcon className="w-4 h-4" />
              Copy
            </>
          )}
        </button>

        <div className="w-px h-5 bg-slate-200 mx-0.5" />

        {/* Share button */}
        <div className="relative">
          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-white rounded-full shadow-sm border border-slate-200/80 hover:bg-slate-50 hover:border-gold-400/50 hover:text-gold-600 transition-all"
            aria-label="Share document"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 0m-3.935 0a2.25 2.25 0 00-3.935 0m3.935-12.628a2.25 2.25 0 103.935 0m-3.935 0a2.25 2.25 0 00-3.935 0" />
            </svg>
            Share
          </button>
          {/* Tooltip */}
          {shareTooltip && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-navy-900 text-white text-xs rounded-lg whitespace-nowrap animate-fade-in shadow-lg">
              Coming soon
              <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-navy-900 rotate-45 -mt-1" />
            </div>
          )}
        </div>
      </div>

      {downloadError && (
        <span className="text-xs text-red-500 font-medium">{downloadError}</span>
      )}
    </div>
  );
}
