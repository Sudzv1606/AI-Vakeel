'use client';

import { useState, useEffect } from 'react';

type Language = 'en' | 'hi' | 'mr';

interface WalkthroughStep {
  title: string;
  description: string;
  icon: string;
}

const WALKTHROUGH_CONTENT: Record<Language, { steps: WalkthroughStep[]; buttons: { skip: string; next: string; start: string; langLabel: string } }> = {
  en: {
    buttons: { skip: 'Skip', next: 'Next', start: 'Get Started', langLabel: 'Language' },
    steps: [
      {
        title: 'Welcome to AI Vakeel',
        icon: '⚖️',
        description:
          'AI Vakeel uses 5 specialized AI agents to generate professional legal complaint documents for you. Simply describe your problem and let the agents handle the rest.',
      },
      {
        title: 'Describe Your Problem',
        icon: '✍️',
        description:
          'Write about your legal issue in the input area. You can write in English or Hindi. Include as many details as possible: dates, names, amounts, and what happened.',
      },
      {
        title: 'Watch the Agents Work',
        icon: '🤖',
        description:
          'Five AI agents collaborate on your complaint:\n\n• Arzdar: extracts key facts\n• Vivechak: routes to the right legal category\n• Shodhak: researches relevant laws\n• Munshi: drafts the complaint\n• Nyayadoot: reviews for quality',
      },
      {
        title: 'Download Your Complaint',
        icon: '📄',
        description:
          'Once the agents finish, you can download your complaint as a PDF or copy the text directly. The document is ready to be filed or shared with a lawyer.',
      },
      {
        title: 'View Past Sessions',
        icon: '📋',
        description:
          'All your generated complaints are saved. Click "Session History" in the header to revisit, review, or re-download any previous complaint.',
      },
    ],
  },
  hi: {
    buttons: { skip: 'छोड़ें', next: 'अगला', start: 'शुरू करें', langLabel: 'भाषा' },
    steps: [
      {
        title: 'AI Vakeel में आपका स्वागत है',
        icon: '⚖️',
        description:
          'AI Vakeel 5 विशेष AI एजेंट्स का उपयोग करके आपके लिए पेशेवर कानूनी शिकायत दस्तावेज़ तैयार करता है। बस अपनी समस्या बताएं और एजेंट्स को बाकी काम करने दें।',
      },
      {
        title: 'अपनी समस्या बताएं',
        icon: '✍️',
        description:
          'इनपुट बॉक्स में अपनी कानूनी समस्या लिखें। आप हिंदी या अंग्रेजी में लिख सकते हैं। जितना हो सके विवरण दें: तारीखें, नाम, राशि, और क्या हुआ।',
      },
      {
        title: 'एजेंट्स को काम करते देखें',
        icon: '🤖',
        description:
          'पांच AI एजेंट मिलकर आपकी शिकायत तैयार करते हैं:\n\n• अर्ज़दार: मुख्य तथ्य निकालता है\n• विवेचक: सही कानूनी श्रेणी चुनता है\n• शोधक: संबंधित कानून खोजता है\n• मुंशी: शिकायत का मसौदा लिखता है\n• न्यायदूत: गुणवत्ता की समीक्षा करता है',
      },
      {
        title: 'अपनी शिकायत डाउनलोड करें',
        icon: '📄',
        description:
          'एजेंट्स का काम पूरा होने पर, आप अपनी शिकायत PDF के रूप में डाउनलोड कर सकते हैं या टेक्स्ट कॉपी कर सकते हैं। दस्तावेज़ दाखिल करने या वकील के साथ साझा करने के लिए तैयार है।',
      },
      {
        title: 'पिछले सत्र देखें',
        icon: '📋',
        description:
          'आपकी सभी शिकायतें सहेजी जाती हैं। हेडर में "Session History" पर क्लिक करके किसी भी पिछली शिकायत को दोबारा देखें या डाउनलोड करें।',
      },
    ],
  },
  mr: {
    buttons: { skip: 'वगळा', next: 'पुढे', start: 'सुरू करा', langLabel: 'भाषा' },
    steps: [
      {
        title: 'AI Vakeel मध्ये आपले स्वागत आहे',
        icon: '⚖️',
        description:
          'AI Vakeel 5 विशेष AI एजंट्स वापरून तुमच्यासाठी व्यावसायिक कायदेशीर तक्रार दस्तऐवज तयार करतो. फक्त तुमची समस्या सांगा आणि एजंट्सना बाकीचे काम करू द्या.',
      },
      {
        title: 'तुमची समस्या सांगा',
        icon: '✍️',
        description:
          'इनपुट बॉक्समध्ये तुमची कायदेशीर समस्या लिहा. तुम्ही हिंदी किंवा इंग्रजीमध्ये लिहू शकता. शक्य तितके तपशील द्या: तारखा, नावे, रक्कम आणि काय घडले.',
      },
      {
        title: 'एजंट्सचे काम पहा',
        icon: '🤖',
        description:
          'पाच AI एजंट्स मिळून तुमची तक्रार तयार करतात:\n\n• अर्जदार: मुख्य तथ्ये काढतो\n• विवेचक: योग्य कायदेशीर श्रेणी निवडतो\n• शोधक: संबंधित कायदे शोधतो\n• मुन्शी: तक्रारीचा मसुदा लिहितो\n• न्यायदूत: गुणवत्तेची तपासणी करतो',
      },
      {
        title: 'तुमची तक्रार डाउनलोड करा',
        icon: '📄',
        description:
          'एजंट्सचे काम पूर्ण झाल्यावर, तुम्ही तुमची तक्रार PDF म्हणून डाउनलोड करू शकता किंवा मजकूर कॉपी करू शकता. दस्तऐवज दाखल करण्यासाठी किंवा वकिलासोबत शेअर करण्यासाठी तयार आहे.',
      },
      {
        title: 'मागील सत्रे पहा',
        icon: '📋',
        description:
          'तुमच्या सर्व तक्रारी जतन केल्या जातात. हेडरमध्ये "Session History" वर क्लिक करून कोणतीही मागील तक्रार पुन्हा पहा किंवा डाउनलोड करा.',
      },
    ],
  },
};

const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  hi: 'हिंदी',
  mr: 'मराठी',
};

const STORAGE_KEY = 'walkthrough_completed';

interface WalkthroughProps {
  show: boolean;
  onClose: () => void;
}

export default function Walkthrough({ show, onClose }: WalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    if (show) setCurrentStep(0);
  }, [show]);

  if (!show) return null;

  const content = WALKTHROUGH_CONTENT[language];
  const step = content.steps[currentStep];

  function handleNext() {
    if (currentStep < content.steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  }

  function handleComplete() {
    localStorage.setItem(STORAGE_KEY, 'true');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
        {/* Top accent bar */}
        <div className="h-1.5 bg-gradient-to-r from-amber-400 to-amber-600" />

        {/* Language selector */}
        <div className="flex items-center justify-center gap-2 pt-5 px-8">
          <span className="text-xs text-slate-400 mr-1">{content.buttons.langLabel}:</span>
          {(Object.keys(LANGUAGE_LABELS) as Language[]).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                language === lang
                  ? 'bg-amber-100 text-amber-700 border border-amber-300'
                  : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'
              }`}
            >
              {LANGUAGE_LABELS[lang]}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-8 pt-5">
          {/* Icon */}
          <div className="text-5xl mb-4 text-center">{step.icon}</div>

          {/* Title */}
          <h3 className="text-xl font-bold text-slate-900 text-center mb-3">
            {step.title}
          </h3>

          {/* Description */}
          <p className="text-sm text-slate-600 leading-relaxed text-center whitespace-pre-line">
            {step.description}
          </p>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {content.steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-amber-500 w-6'
                    : index < currentStep
                    ? 'bg-amber-300 w-2'
                    : 'bg-slate-200 w-2'
                }`}
              />
            ))}
          </div>

          <p className="text-xs text-slate-400 text-center mt-2">
            {currentStep + 1} / {content.steps.length}
          </p>
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 flex items-center justify-between gap-3">
          <button
            onClick={handleComplete}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors font-medium px-4 py-2"
          >
            {content.buttons.skip}
          </button>
          <button
            onClick={handleNext}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold rounded-lg shadow-sm hover:from-amber-600 hover:to-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all text-sm"
          >
            {currentStep === content.steps.length - 1 ? content.buttons.start : content.buttons.next}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage walkthrough visibility state.
 * Shows walkthrough on first visit (checks localStorage).
 */
export function useWalkthrough() {
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  useEffect(() => {
    const completed = localStorage.getItem(STORAGE_KEY);
    if (!completed) {
      setShowWalkthrough(true);
    }
  }, []);

  function triggerWalkthrough() {
    setShowWalkthrough(true);
  }

  function closeWalkthrough() {
    setShowWalkthrough(false);
  }

  return { showWalkthrough, triggerWalkthrough, closeWalkthrough };
}
