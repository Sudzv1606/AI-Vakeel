'use client';

import { useState } from 'react';
import { SpinnerIcon } from '@/components/icons';

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
      <div className="bg-white rounded-xl shadow-legal border border-slate-200/80 p-6 transition-all hover:shadow-gold-glow relative overflow-hidden">
        {/* Subtle gold accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold-400/0 via-gold-400 to-gold-400/0" />

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <label
            htmlFor="problem-input"
            className="block text-base font-semibold text-slate-800"
          >
            Describe your legal problem
          </label>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cream border border-gold-400/30 rounded-full text-xs font-medium text-gold-600">
            <span>🌐</span> Hindi / English
          </span>
        </div>

        {/* Textarea with relative positioning for character counter */}
        <div className="relative">
          <textarea
            id="problem-input"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (validationMessage) setValidationMessage('');
            }}
            disabled={disabled}
            placeholder="अपनी कानूनी समस्या का विस्तार से वर्णन करें (हिंदी या अंग्रेजी में)। पार्टियों के नाम, तारीखें, क्या हुआ, और आप क्या राहत चाहते हैं शामिल करें...&#10;&#10;Describe your legal issue in detail (English or Hindi). Include names of parties, dates, what happened, and what relief you seek..."
            className="w-full h-48 p-4 pb-8 border border-slate-200 rounded-lg resize-y text-slate-800 placeholder:text-slate-400 placeholder:text-sm focus-gold-glow focus:outline-none disabled:bg-slate-50 disabled:cursor-not-allowed transition-all"
            maxLength={MAX_LENGTH + 100}
            aria-describedby="char-count validation-message"
          />
          {/* Character counter inside textarea */}
          <span
            className={`absolute bottom-3 right-3 text-xs font-medium px-2 py-0.5 rounded bg-white/80 backdrop-blur-sm ${
              charCount < MIN_LENGTH
                ? 'text-amber-500'
                : charCount > MAX_LENGTH
                ? 'text-red-500'
                : 'text-emerald-500'
            }`}
          >
            {charCount.toLocaleString()} / {MAX_LENGTH.toLocaleString()}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              charCount < MIN_LENGTH
                ? 'bg-gold-400'
                : charCount > MAX_LENGTH
                ? 'bg-red-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Tip helper text */}
        <div className="mt-3 flex items-start gap-2">
          <span className="text-amber-500 text-sm mt-0.5">💡</span>
          <p className="text-xs text-slate-500 leading-relaxed">
            <span className="font-medium text-slate-600">Tip:</span> Include specific dates, names of parties involved, amounts (if any), and the relief you seek for the best results.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4">
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
            {charCount < MIN_LENGTH && (
              <span className="text-slate-400 font-normal">min {MIN_LENGTH} characters</span>
            )}
          </span>
          <button
            onClick={handleSubmit}
            disabled={disabled || !isValid}
            className="relative px-6 py-2.5 bg-gradient-to-r from-gold-400 to-gold-500 text-white rounded-lg font-semibold text-sm hover:from-gold-500 hover:to-gold-600 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md hover:gold-glow-sm active:scale-[0.98]"
            aria-label="Submit problem description"
          >
            {disabled ? (
              <span className="flex items-center gap-2">
                <SpinnerIcon className="h-4 w-4" />
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
