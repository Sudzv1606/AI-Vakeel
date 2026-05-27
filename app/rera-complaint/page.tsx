import { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import { ScalesIcon } from '@/components/icons';

export const metadata: Metadata = {
  title: 'File RERA Complaint Against Builder | Free RERA Complaint Format',
  description: 'Builder delayed possession? File a RERA complaint online. Free AI-powered RERA complaint generator with proper format for Real Estate Regulatory Authority. Get compensation for delayed projects.',
  keywords: ['RERA complaint format', 'RERA complaint against builder', 'RERA complaint online', 'builder delayed possession complaint', 'real estate regulatory authority complaint', 'RERA Act 2016 complaint'],
  openGraph: {
    title: 'File RERA Complaint Against Builder | AI Vakeel',
    description: 'Builder delayed possession? Generate a professional RERA complaint ready for the Real Estate Regulatory Authority. Free, AI-powered, legally formatted.',
    url: 'https://aivakeel.in/rera-complaint',
    siteName: 'AI Vakeel',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'File RERA Complaint Against Builder | AI Vakeel',
    description: 'Generate a professional RERA complaint for delayed possession or broken promises. Free AI tool.',
  },
  alternates: {
    canonical: 'https://aivakeel.in/rera-complaint',
  },
};

const faqData = [
  {
    question: 'What is RERA and how does it protect homebuyers?',
    answer: 'RERA (Real Estate Regulatory Authority) was established under the Real Estate (Regulation and Development) Act, 2016 to protect homebuyers from unscrupulous builders. It mandates that all real estate projects above 500 sq meters or 8 apartments must be registered with RERA. Builders must disclose project details, timelines, and cannot change plans without buyer consent. If a builder fails to deliver on time, buyers are entitled to a full refund with interest or compensation for the delay.',
  },
  {
    question: 'When can I file a RERA complaint against my builder?',
    answer: 'You can file a RERA complaint when: the builder has delayed possession beyond the agreed date in the agreement, the builder has deviated from the sanctioned plan without your consent, there are structural defects within 5 years of possession, the builder has made false promises in advertisements, the builder has not registered the project with RERA, or the builder is demanding extra charges not mentioned in the agreement. The complaint must be filed within one year of the cause of action.',
  },
  {
    question: 'What compensation can I get through a RERA complaint?',
    answer: 'Through a RERA complaint, you can seek: full refund of the amount paid with interest (typically SBI MCLR + 2%), compensation for mental agony and harassment, interest for delayed possession (calculated from the promised date to actual possession), refund of extra charges illegally demanded, and penalty on the builder for violations. The interest rate varies by state but is typically between 9-12% per annum.',
  },
  {
    question: 'How do I file a RERA complaint online?',
    answer: 'Each state has its own RERA website where complaints can be filed online. You need to create an account, fill in the complaint form, upload supporting documents (agreement, payment receipts, correspondence), and pay the filing fee (typically ₹1,000-₹5,000 depending on the state). AI Vakeel helps you draft the complaint document that you can then submit through your state RERA portal. The complaint should clearly state facts, violations, and relief sought.',
  },
  {
    question: 'What documents do I need for a RERA complaint?',
    answer: 'Essential documents for a RERA complaint include: the Builder-Buyer Agreement (BBA), all payment receipts and bank statements showing payments made, allotment letter, possession letter (if received), all correspondence with the builder (emails, letters, notices), brochure or advertisement material showing promises made, RERA registration number of the project, and any legal notices sent or received. Our AI tool helps you organize these into a properly structured complaint.',
  },
];

const howToSteps = [
  {
    title: 'Describe Your Builder Issue',
    description: 'Tell us about your situation in plain language — the builder name, project name, what was promised, what went wrong, and how much you have paid. Include dates like agreement date and promised possession date.',
  },
  {
    title: 'AI Agents Research & Draft',
    description: 'Our specialized AI agents analyze your case under RERA Act 2016, identify applicable sections and penalties, research similar RERA orders for precedent, and draft a comprehensive complaint with proper legal formatting and prayer clauses.',
  },
  {
    title: 'Download RERA Complaint',
    description: 'Get a professionally formatted RERA complaint document ready to file at your State Real Estate Regulatory Authority. The document includes all required sections: facts, violations, legal grounds, and specific relief sought with interest calculations.',
  },
];

export default function ReraComplaintPage() {
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
    name: 'How to File a RERA Complaint Against Your Builder',
    description: 'Step-by-step guide to generating a professional RERA complaint document using AI Vakeel.',
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
                File a RERA Complaint Against Your Builder
              </h1>
              <p className="mt-6 text-lg md:text-xl text-slate-300 leading-relaxed max-w-3xl mx-auto">
                Builder delayed possession? Deviated from the plan? Demanding extra charges?
                Generate a professional RERA complaint with proper legal format and get the compensation you deserve.
              </p>
              <Link
                href="/"
                className="mt-8 inline-flex items-center gap-2 px-8 py-4 bg-gold-400 text-navy-900 font-bold rounded-lg hover:bg-gold-500 transition-colors shadow-gold-glow text-lg"
              >
                <ScalesIcon className="w-5 h-5" />
                Start Your RERA Complaint — Free
              </Link>
            </div>
          </section>

          {/* Pain Point Section */}
          <section className="py-16 px-6 bg-white">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-navy-900 mb-6">
                Builder Broke Their Promise? You Have Legal Rights.
              </h2>
              <div className="prose prose-lg text-slate-700 space-y-4">
                <p>
                  Buying a home is the biggest financial decision most Indians make in their lifetime. You save for years, take a massive home loan, and trust a builder with your life savings. Then the nightmare begins: the promised possession date passes, months turn into years, and the builder keeps giving excuses.
                </p>
                <p>
                  Maybe your builder promised possession in 2022 but it&rsquo;s now 2025 and the project is still incomplete. Maybe they&rsquo;re demanding &ldquo;extra charges&rdquo; for things that were supposed to be included. Maybe the flat you received is nothing like what was shown in the brochure — smaller area, different layout, poor construction quality.
                </p>
                <p>
                  Before RERA, homebuyers had little recourse. But the <strong>Real Estate (Regulation and Development) Act, 2016</strong> changed everything. Under RERA, builders are legally obligated to deliver on their promises, and if they don&rsquo;t, you&rsquo;re entitled to a full refund with interest or compensation for every month of delay.
                </p>
                <p>
                  The challenge? Filing a RERA complaint requires a properly formatted legal document that clearly states the violations, applicable sections, and relief sought. Most homebuyers don&rsquo;t know the format or the legal language required. That&rsquo;s where AI Vakeel comes in — we generate your RERA complaint in minutes, with all the right legal citations and formatting.
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
                  Understanding RERA Act 2016 — Your Rights as a Homebuyer
                </h2>
                <div className="text-slate-700 space-y-4">
                  <p>
                    The Real Estate (Regulation and Development) Act, 2016 was enacted to bring transparency and accountability to the Indian real estate sector. Before RERA, builders operated with impunity — delaying projects by years, diverting funds to other projects, and making false promises in advertisements.
                  </p>
                  <p>
                    Key provisions that protect homebuyers include:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Mandatory Registration:</strong> All projects above 500 sq meters or 8 apartments must be registered with the state RERA authority before advertising or selling.</li>
                    <li><strong>70% Fund Rule:</strong> Builders must deposit 70% of the amount collected from buyers in a separate escrow account, to be used only for that project&rsquo;s construction.</li>
                    <li><strong>Timely Delivery:</strong> Builders must deliver possession on the date mentioned in the agreement. Failure attracts interest payment to buyers.</li>
                    <li><strong>No Plan Changes:</strong> Builders cannot change the sanctioned plan, layout, or specifications without the written consent of 2/3rd of the allottees.</li>
                    <li><strong>Structural Defect Liability:</strong> Builders are liable for structural defects for 5 years after possession and must rectify them within 30 days of complaint.</li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-navy-900 mb-4">
                  Common RERA Violations by Builders
                </h2>
                <div className="text-slate-700 space-y-4">
                  <p>
                    Based on thousands of RERA orders across India, here are the most common violations that homebuyers face:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Delayed Possession:</strong> The most common complaint. Builders promise possession in 3-4 years but take 6-8 years or more. Under RERA, you&rsquo;re entitled to interest for every month of delay.</li>
                    <li><strong>Carpet Area Mismatch:</strong> The actual carpet area is less than what was promised in the agreement. RERA mandates that builders sell on carpet area basis only.</li>
                    <li><strong>Extra Charges:</strong> Demanding charges for car parking, club membership, maintenance deposit, or other amenities that were supposed to be included in the basic price.</li>
                    <li><strong>Quality Issues:</strong> Poor construction quality, water seepage, structural cracks, or use of substandard materials.</li>
                    <li><strong>False Advertising:</strong> Promising amenities like swimming pool, gym, garden, or metro connectivity that are never delivered.</li>
                    <li><strong>Unregistered Projects:</strong> Selling units in projects not registered with RERA, which is a criminal offense under the Act.</li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-navy-900 mb-4">
                  RERA Complaint Format — What Your Complaint Must Include
                </h2>
                <div className="text-slate-700 space-y-4">
                  <p>
                    A properly formatted RERA complaint should contain the following sections:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Details of the complainant (name, address, contact)</li>
                    <li>Details of the respondent builder (company name, registered address, RERA registration number)</li>
                    <li>Project details (name, location, unit number, agreement date)</li>
                    <li>Statement of facts in chronological order</li>
                    <li>Specific RERA violations with section references</li>
                    <li>Details of payments made with dates</li>
                    <li>Correspondence history with the builder</li>
                    <li>Relief sought (refund with interest / possession with compensation / both)</li>
                    <li>Prayer clause with specific amounts</li>
                  </ul>
                  <p>
                    AI Vakeel automatically structures your complaint in this format, ensuring nothing is missed and all relevant RERA sections are cited correctly.
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
                <Link href="/consumer-complaint" className="block p-4 bg-cream rounded-lg border border-slate-200 hover:border-gold-400 transition-colors">
                  <h3 className="font-semibold text-navy-900">Consumer Complaint Generator</h3>
                  <p className="text-sm text-slate-600 mt-1">File a complaint against e-commerce companies, service providers, or manufacturers.</p>
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
                Ready to Hold Your Builder Accountable?
              </h2>
              <p className="text-slate-300 text-lg mb-8">
                Don&rsquo;t wait any longer. Generate your RERA complaint today and get the refund or compensation you deserve.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gold-400 text-navy-900 font-bold rounded-lg hover:bg-gold-500 transition-colors shadow-gold-glow text-lg"
              >
                Start Now — Generate Your RERA Complaint
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
