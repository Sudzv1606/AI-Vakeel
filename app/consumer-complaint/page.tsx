import { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import { ScalesIcon } from '@/components/icons';

export const metadata: Metadata = {
  title: 'File Consumer Complaint Online | Free Complaint Generator',
  description: 'Flipkart/Amazon rejected your return? File a legal consumer complaint in 10 minutes. Free AI-powered complaint generator for District Consumer Forum India. Consumer Protection Act 2019 format.',
  keywords: ['consumer complaint format', 'consumer forum complaint online', 'consumer complaint against flipkart', 'consumer complaint against amazon', 'district consumer forum complaint format', 'consumer protection act 2019 complaint'],
  openGraph: {
    title: 'File Consumer Complaint Online in 10 Minutes | AI Vakeel',
    description: 'Generate a professional consumer complaint ready for the District Consumer Disputes Redressal Commission. Free, AI-powered, legally formatted.',
    url: 'https://aivakeel.in/consumer-complaint',
    siteName: 'AI Vakeel',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'File Consumer Complaint Online in 10 Minutes | AI Vakeel',
    description: 'Generate a professional consumer complaint ready for the District Consumer Forum. Free, AI-powered.',
  },
  alternates: {
    canonical: 'https://aivakeel.in/consumer-complaint',
  },
};

const faqData = [
  {
    question: 'What is a consumer complaint and when can I file one?',
    answer: 'A consumer complaint is a formal legal document filed under the Consumer Protection Act, 2019 when a seller, service provider, or manufacturer has caused you loss or injury through defective goods, deficient services, unfair trade practices, or misleading advertisements. You can file a complaint if you purchased goods or services for personal use and faced issues like product defects, non-delivery, overcharging, or refusal of legitimate refund requests.',
  },
  {
    question: 'Where do I file a consumer complaint in India?',
    answer: 'Consumer complaints in India are filed at three levels based on the value of goods/services: District Consumer Disputes Redressal Commission (up to ₹1 crore), State Consumer Disputes Redressal Commission (₹1 crore to ₹10 crore), and National Consumer Disputes Redressal Commission (above ₹10 crore). You can also file online through the e-Daakhil portal (edaakhil.nic.in) or the INGRAM portal for quick resolution.',
  },
  {
    question: 'What documents do I need to file a consumer complaint?',
    answer: 'To file a consumer complaint, you typically need: a copy of the bill/invoice/receipt, warranty or guarantee card (if applicable), copies of correspondence with the seller/service provider (emails, chat screenshots), proof of payment (bank statement, UPI transaction), photographs of defective product (if applicable), and any other evidence supporting your claim. Our AI tool helps you organize all this information into a properly formatted complaint.',
  },
  {
    question: 'How long does it take to resolve a consumer complaint?',
    answer: 'Under the Consumer Protection Act, 2019, consumer forums are mandated to resolve complaints within 3 months (if no testing is required) or 5 months (if product testing is needed). However, in practice, cases may take 6-12 months depending on the complexity and the forum workload. Filing a well-drafted complaint with proper documentation significantly speeds up the process.',
  },
  {
    question: 'Can I file a consumer complaint against e-commerce companies like Flipkart or Amazon?',
    answer: 'Yes, absolutely. Under the Consumer Protection (E-Commerce) Rules, 2020, e-commerce platforms are liable for ensuring consumer rights. You can file complaints against them for issues like non-delivery, delivery of wrong/defective products, refund delays, misleading product descriptions, or unfair cancellation of orders. The complaint can be filed at the consumer forum where you reside — you do not need to go to the company\'s city.',
  },
];

const howToSteps = [
  {
    title: 'Describe Your Problem',
    description: 'Tell us what happened in plain language. Mention the company name, what you bought, what went wrong, and what resolution you want. No legal jargon needed — just explain your situation as you would to a friend.',
  },
  {
    title: 'AI Agents Analyze & Draft',
    description: 'Our team of 5 specialized AI agents works together: one classifies your issue, another researches applicable laws (Consumer Protection Act 2019, E-Commerce Rules 2020), a third finds relevant court precedents, and the final agents draft and review your complaint document.',
  },
  {
    title: 'Download Your Legal Complaint',
    description: 'Get a professionally formatted complaint document ready to file at the District Consumer Disputes Redressal Commission. The document includes proper legal sections, relevant act citations, prayer clauses, and is formatted per consumer forum requirements.',
  },
];

export default function ConsumerComplaintPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqData.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to File a Consumer Complaint Online in India',
    description: 'Step-by-step guide to generating a professional consumer complaint document using AI Vakeel.',
    step: howToSteps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.title,
      text: step.description,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />

      <div className="min-h-screen flex flex-col bg-cream">
        <Header />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="bg-gradient-to-b from-navy-900 to-navy-800 text-white py-16 px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                File a Consumer Complaint Online in 10 Minutes
              </h1>
              <p className="mt-6 text-lg md:text-xl text-slate-300 leading-relaxed max-w-3xl mx-auto">
                Seller rejected your return? Product defective? Service provider not responding?
                Generate a professional legal complaint ready for the District Consumer Disputes Redressal Commission.
              </p>
              <Link
                href="/"
                className="mt-8 inline-flex items-center gap-2 px-8 py-4 bg-gold-400 text-navy-900 font-bold rounded-lg hover:bg-gold-500 transition-colors shadow-gold-glow text-lg"
              >
                <ScalesIcon className="w-5 h-5" />
                Start Your Complaint — Free
              </Link>
            </div>
          </section>

          {/* Pain Point Section */}
          <section className="py-16 px-6 bg-white">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-navy-900 mb-6">
                Tired of Being Ignored by Companies?
              </h2>
              <div className="prose prose-lg text-slate-700 space-y-4">
                <p>
                  Every day, thousands of Indian consumers face the same frustrating situation: you buy a product online from Flipkart, Amazon, Myntra, or any other platform, and something goes wrong. Maybe the product arrived damaged. Maybe it was completely different from what was advertised. Maybe the seller simply refuses to process your return or refund.
                </p>
                <p>
                  You call customer support, wait on hold for hours, get transferred between departments, and eventually receive a generic response: &ldquo;We regret the inconvenience, but we cannot process your request.&rdquo; Sound familiar?
                </p>
                <p>
                  Here&rsquo;s what most people don&rsquo;t know: <strong>you have powerful legal rights under the Consumer Protection Act, 2019</strong>. The law is firmly on your side. Companies know this — that&rsquo;s why many of them settle quickly once they receive a properly formatted legal complaint. The problem? Most people don&rsquo;t know how to draft one.
                </p>
                <p>
                  That&rsquo;s exactly why we built AI Vakeel. Our AI-powered tool generates a professional, legally-sound consumer complaint in minutes — no lawyer needed, no legal knowledge required. Just describe your problem in plain language, and our 5 specialized AI agents will handle the rest.
                </p>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-16 px-6 bg-cream">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-navy-900 mb-10 text-center">
                How It Works — 3 Simple Steps
              </h2>
              <div className="grid md:grid-cols-3 gap-8">
                {howToSteps.map((step, index) => (
                  <div key={index} className="bg-white rounded-xl p-6 shadow-card border border-slate-100">
                    <div className="w-12 h-12 bg-gold-400/10 rounded-full flex items-center justify-center mb-4">
                      <span className="text-gold-500 font-bold text-xl">{index + 1}</span>
                    </div>
                    <h3 className="text-lg font-bold text-navy-900 mb-3">{step.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Detailed Content for SEO */}
          <section className="py-16 px-6 bg-white">
            <div className="max-w-4xl mx-auto space-y-12">
              <div>
                <h2 className="text-2xl font-bold text-navy-900 mb-4">
                  Understanding the Consumer Protection Act, 2019
                </h2>
                <div className="text-slate-700 space-y-4">
                  <p>
                    The Consumer Protection Act, 2019 replaced the older 1986 Act and brought significant improvements for consumer rights in India. The new Act introduced provisions for e-commerce transactions, product liability, and established the Central Consumer Protection Authority (CCPA) for quick enforcement of consumer rights.
                  </p>
                  <p>
                    Under this Act, a &ldquo;consumer&rdquo; is any person who buys goods or avails services for consideration. This includes online purchases, digital services, and even free services where personal data is the consideration. The Act covers unfair trade practices, defective goods, deficient services, misleading advertisements, and more.
                  </p>
                  <p>
                    Key rights under the Act include: the right to be protected against marketing of hazardous goods, the right to be informed about quality and standards, the right to choose from a variety of products, the right to be heard in case of dissatisfaction, and the right to seek redressal against unfair practices.
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-navy-900 mb-4">
                  Types of Consumer Complaints You Can File
                </h2>
                <div className="text-slate-700 space-y-4">
                  <p>
                    Consumer complaints can be filed for a wide range of issues. Here are the most common categories:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Defective Products:</strong> Items that are broken, malfunctioning, or not meeting the advertised specifications. This includes electronics, appliances, vehicles, and any manufactured goods.</li>
                    <li><strong>Deficient Services:</strong> Services that fall short of what was promised — including banking services, insurance claims, telecom services, healthcare, education, and hospitality.</li>
                    <li><strong>Unfair Trade Practices:</strong> False or misleading advertisements, hidden charges, bait-and-switch tactics, or any deceptive business practice.</li>
                    <li><strong>E-Commerce Issues:</strong> Non-delivery, wrong product delivery, refund refusal, fake reviews, or platform accountability failures.</li>
                    <li><strong>Overcharging:</strong> Being charged more than the MRP, hidden fees, or unauthorized deductions.</li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-navy-900 mb-4">
                  Why a Properly Formatted Complaint Matters
                </h2>
                <div className="text-slate-700 space-y-4">
                  <p>
                    Many consumers attempt to file complaints on their own but face rejection or delays because their complaint doesn&rsquo;t follow the proper format. A well-drafted consumer complaint should include:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Proper identification of the complainant and opposite party</li>
                    <li>Clear statement of facts in chronological order</li>
                    <li>Specific mention of the deficiency or defect</li>
                    <li>Reference to applicable sections of the Consumer Protection Act</li>
                    <li>Details of any prior communication with the company</li>
                    <li>Specific relief sought (refund, replacement, compensation)</li>
                    <li>Prayer clause with itemized demands</li>
                  </ul>
                  <p>
                    AI Vakeel handles all of this automatically. Our AI agents are trained on thousands of successful consumer complaints and know exactly what format the consumer forums expect.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-16 px-6 bg-cream">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-navy-900 mb-10 text-center">
                Frequently Asked Questions
              </h2>
              <div className="space-y-6">
                {faqData.map((faq, index) => (
                  <div key={index} className="bg-white rounded-xl p-6 shadow-card border border-slate-100">
                    <h3 className="text-lg font-semibold text-navy-900 mb-3">{faq.question}</h3>
                    <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Internal Links */}
          <section className="py-12 px-6 bg-white border-t border-slate-100">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl font-bold text-navy-900 mb-6">Other Legal Documents We Generate</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <Link href="/rera-complaint" className="block p-4 bg-cream rounded-lg border border-slate-200 hover:border-gold-400 transition-colors">
                  <h3 className="font-semibold text-navy-900">RERA Complaint Generator</h3>
                  <p className="text-sm text-slate-600 mt-1">File a complaint against your builder for delayed possession or broken promises.</p>
                </Link>
                <Link href="/rti-application" className="block p-4 bg-cream rounded-lg border border-slate-200 hover:border-gold-400 transition-colors">
                  <h3 className="font-semibold text-navy-900">RTI Application Generator</h3>
                  <p className="text-sm text-slate-600 mt-1">Get information from government departments using the Right to Information Act.</p>
                </Link>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-16 px-6 bg-gradient-to-b from-navy-900 to-navy-800 text-white text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Ready to File Your Consumer Complaint?
              </h2>
              <p className="text-slate-300 text-lg mb-8">
                Don&rsquo;t let companies get away with poor service. Generate your legal complaint in minutes — completely free.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gold-400 text-navy-900 font-bold rounded-lg hover:bg-gold-500 transition-colors shadow-gold-glow text-lg"
              >
                Start Now — Generate Your Complaint
              </Link>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="border-t border-slate-200/60 bg-white/80 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <ScalesIcon className="w-4 h-4 text-gold-400" />
              <span className="font-medium text-slate-700">AI Vakeel</span>
              <span className="text-slate-300">|</span>
              <span>Free Legal Complaint Generator</span>
            </div>
            <p className="text-xs text-slate-400">
              This tool generates draft documents only. Always consult a qualified lawyer for legal advice.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}
