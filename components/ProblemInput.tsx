'use client';

import { useState } from 'react';

interface ProblemInputProps {
  onSubmit: (problemDescription: string) => void;
  disabled?: boolean;
}

const MIN_LENGTH = 50;
const MAX_LENGTH = 5000;

export default function ProblemInput({ onSubmit, disabled = false }: ProblemInputProps) {
  const [text, setText] = useState('');
  const [validationMessage, setValidationMessage] = useState('');

  const charCount = text.length;
  const isValid = charCount >= MIN_LENGTH && charCount <= MAX_LENGTH;

  function handleSubmit() {
    if (charCount < MIN_LENGTH) {
      setValidationMessage(
        `Problem description must be at least ${MIN_LENGTH} characters. Currently ${charCount} characters.`
      );
      return;
    }
    if (charCount > MAX_LENGTH) {
      setValidationMessage(
        `Problem description must not exceed ${MAX_LENGTH} characters. Currently ${charCount} characters.`
      );
      return;
    }
    setValidationMessage('');
    onSubmit(text);
  }

  const progressPercent = Math.min((charCount / MAX_LENGTH) * 100, 100);

  return (
    <div className="w-full max-w-3xl">
      <div className="bg-white rounded-xl shadow-card border border-slate-200 p-6 transition-shadow hover:shadow-card-hover">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <label
            htmlFor="problem-input"
            className="block text-base font-semibold text-slate-800"
          >
            Describe your legal problem
          </label>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-medium text-amber-700">
            <span>🌐</span> Hindi / English
          </span>
        </div>

        {/* Textarea */}
        <textarea
          id="problem-input"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (validationMessage) setValidationMessage('');
          }}
          disabled={disabled}
          placeholder="अपनी कानूनी समस्या का विस्तार से वर्णन करें (हिंदी या अंग्रेजी में)। पार्टियों के नाम, तारीखें, क्या हुआ, और आप क्या राहत चाहते हैं शामिल करें...&#10;&#10;Describe your legal issue in detail (English or Hindi). Include names of parties, dates, what happened, and what relief you seek..."
          className="w-full h-48 p-4 border border-slate-200 rounded-lg resize-y text-slate-800 placeholder:text-slate-400 placeholder:text-sm focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 disabled:bg-slate-50 disabled:cursor-not-allowed transition-all"
          maxLength={MAX_LENGTH + 100}
          aria-describedby="char-count validation-message"
        />

        {/* Progress bar */}
        <div className="mt-3 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              charCount < MIN_LENGTH
                ? 'bg-amber-400'
                : charCount > MAX_LENGTH
                ? 'bg-red-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3">
          <span
            id="char-count"
            className={`text-sm font-medium ${
              charCount < MIN_LENGTH
                ? 'text-amber-600'
                : charCount > MAX_LENGTH
                ? 'text-red-600'
                : 'text-emerald-600'
            }`}
          >
            {charCount.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
            {charCount < MIN_LENGTH && (
              <span className="text-slate-400 font-normal"> (min {MIN_LENGTH})</span>
            )}
          </span>
          <button
            onClick={handleSubmit}
            disabled={disabled || !isValid}
            className="relative px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg font-semibold text-sm hover:from-amber-600 hover:to-amber-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
            aria-label="Submit problem description"
          >
            {disabled ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin-slow h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </span>
            ) : (
              'Generate Complaint →'
            )}
          </button>
        </div>

        {validationMessage && (
          <p
            id="validation-message"
            className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
            role="alert"
          >
            {validationMessage}
          </p>
        )}
      </div>
    </div>
  );
}
