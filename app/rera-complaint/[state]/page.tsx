import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import { ScalesIcon } from '@/components/icons';

const RERA_STATES: Record<string, {
  name: string;
  shortName: string;
  authority: string;
  portalUrl: string;
  bench: string;
  interestRate: string;
  filingFee: string;
  slug: string;
  faq: { question: string; answer: string }[];
}> = {
  maharashtra: {
    name: 'Maharashtra',
    shortName: 'MahaRERA',
    authority: 'Maharashtra Real Estate Regulatory Authority',
    portalUrl: 'https://maharera.mahaonline.gov.in',
    bench: 'Mumbai',
    interestRate: 'SBI MCLR + 2% (currently approximately 10.5% p.a.)',
    filingFee: '₹5,000 for individual complaints',
    slug: 'maharashtra',
    faq: [
      {
        question: 'How do I file a complaint on the MahaRERA portal?',
        answer: 'Visit maharera.mahaonline.gov.in, register as a complainant, select "File Complaint," fill in the builder and project details, upload your agreement and payment receipts, pay the ₹5,000 filing fee online, and submit. You will receive a complaint number for tracking.',
      },
      {
        question: 'What is the interest rate for delayed possession in Maharashtra?',
        answer: 'MahaRERA awards interest at SBI MCLR + 2%, which currently works out to approximately 10.5% per annum. This is calculated from the date of promised possession until actual possession or refund.',
      },
      {
        question: 'Can I file a MahaRERA complaint if my builder is not registered?',
        answer: 'Yes. In fact, selling units in an unregistered project is a violation of Section 3 of the RERA Act. You can file a complaint seeking a full refund with interest, and the builder may also face a penalty of up to 10% of the project cost.',
      },
      {
        question: 'How long does MahaRERA take to resolve a complaint?',
        answer: 'MahaRERA is mandated to dispose of complaints within 60 days. In practice, straightforward cases are resolved in 3-4 months, while complex cases involving multiple hearings may take 6-9 months.',
      },
    ],
  },
  karnataka: {
    name: 'Karnataka',
    shortName: 'K-RERA',
    authority: 'Karnataka Real Estate Regulatory Authority',
    portalUrl: 'https://rera.karnataka.gov.in',
    bench: 'Bengaluru',
    interestRate: 'SBI MCLR + 2% (currently approximately 10.5% p.a.)',
    filingFee: '₹5,000 for individual complaints',
    slug: 'karnataka',
    faq: [
      {
        question: 'How do I file a K-RERA complaint in Karnataka?',
        answer: 'Visit rera.karnataka.gov.in, create an account, navigate to the complaint section, fill in the project and builder details, attach supporting documents including your sale agreement and payment proofs, pay the ₹5,000 fee, and submit your complaint online.',
      },
      {
        question: 'What compensation can I get through K-RERA for delayed possession?',
        answer: 'K-RERA awards interest at SBI MCLR + 2% (approximately 10.5% p.a.) for every month of delay from the promised possession date. You can also seek a full refund with interest if you no longer wish to continue with the project.',
      },
      {
        question: 'Does K-RERA cover projects in Bengaluru outskirts like Whitefield and Sarjapur?',
        answer: 'Yes. K-RERA covers all real estate projects in Karnataka, including Bengaluru urban, Bengaluru rural, and surrounding areas like Whitefield, Sarjapur Road, Electronic City, and Devanahalli, provided the project meets the threshold of 500 sq meters or 8 apartments.',
      },
      {
        question: 'Can NRIs file a K-RERA complaint for property bought in Bengaluru?',
        answer: 'Yes, NRIs can file complaints with K-RERA. You can file online through the portal or authorize someone in India through a Power of Attorney to file and attend hearings on your behalf.',
      },
    ],
  },
  'uttar-pradesh': {
    name: 'Uttar Pradesh',
    shortName: 'UP-RERA',
    authority: 'Uttar Pradesh Real Estate Regulatory Authority',
    portalUrl: 'https://www.up-rera.in',
    bench: 'Lucknow / Greater Noida',
    interestRate: 'SBI MCLR + 2% (currently approximately 10.5% p.a.)',
    filingFee: '₹5,000 for individual complaints',
    slug: 'uttar-pradesh',
    faq: [
      {
        question: 'How do I file a complaint on the UP-RERA portal?',
        answer: 'Visit up-rera.in, register with your mobile number and email, select "File Complaint," enter the RERA registration number of the project, fill in your details and grievance, upload documents, pay ₹5,000 online, and submit. You can track your complaint status online.',
      },
      {
        question: 'Which bench should I file my UP-RERA complaint at — Lucknow or Greater Noida?',
        answer: 'UP-RERA has two benches. Projects in Gautam Buddh Nagar (Noida, Greater Noida) and Ghaziabad fall under the Greater Noida bench. All other districts in UP fall under the Lucknow bench. File at the bench that has jurisdiction over your project location.',
      },
      {
        question: 'Can I file a UP-RERA complaint for projects in Noida and Greater Noida?',
        answer: 'Yes. Noida and Greater Noida have some of the highest number of RERA complaints in India due to massive delays in projects. UP-RERA has been actively ordering refunds and compensation for homebuyers in stalled projects across Noida Extension, Greater Noida West, and Yamuna Expressway.',
      },
      {
        question: 'What if my builder in Noida has gone bankrupt or is under NCLT?',
        answer: 'If your builder is undergoing insolvency proceedings under NCLT, your RERA complaint may be stayed. However, you should still file to establish your claim. In many cases, UP-RERA has directed the state government to take over stalled projects through SWAMIH fund or other mechanisms.',
      },
    ],
  },
  'tamil-nadu': {
    name: 'Tamil Nadu',
    shortName: 'TNRERA',
    authority: 'Tamil Nadu Real Estate Regulatory Authority',
    portalUrl: 'https://www.tnrera.in',
    bench: 'Chennai',
    interestRate: 'SBI MCLR + 2% (currently approximately 10.5% p.a.)',
    filingFee: '₹5,000 for individual complaints',
    slug: 'tamil-nadu',
    faq: [
      {
        question: 'How do I file a TNRERA complaint in Tamil Nadu?',
        answer: 'Visit tnrera.in, register as a complainant, go to the complaint filing section, enter the project RERA number and builder details, describe your grievance, upload supporting documents including your sale agreement, pay the ₹5,000 filing fee, and submit online.',
      },
      {
        question: 'Does TNRERA cover villa plots and plotted developments in Chennai?',
        answer: 'Yes. TNRERA covers all real estate projects including apartments, villas, plotted developments, and commercial projects in Tamil Nadu that meet the threshold of 500 sq meters or 8 units. This includes projects in Chennai, Coimbatore, Trichy, and other cities.',
      },
      {
        question: 'What is the time limit to file a TNRERA complaint?',
        answer: 'You must file your RERA complaint within one year from the date the cause of action arose (e.g., one year from the promised possession date passing). For structural defects, you can file within 5 years of possession. It is advisable to file as early as possible.',
      },
      {
        question: 'Can I get a refund through TNRERA if my builder delayed possession?',
        answer: 'Yes. Under Section 18 of the RERA Act, if the builder fails to deliver possession by the agreed date, you can either withdraw from the project and get a full refund with interest, or continue and claim interest for every month of delay until actual possession.',
      },
    ],
  },
  delhi: {
    name: 'Delhi',
    shortName: 'Delhi RERA',
    authority: 'Delhi Real Estate Regulatory Authority',
    portalUrl: 'https://rera.delhi.gov.in',
    bench: 'New Delhi',
    interestRate: 'SBI MCLR + 2% (currently approximately 10.5% p.a.)',
    filingFee: '₹5,000 for individual complaints',
    slug: 'delhi',
    faq: [
      {
        question: 'How do I file a Delhi RERA complaint?',
        answer: 'Visit rera.delhi.gov.in, create your account, navigate to the complaint section, fill in the builder and project details along with your grievance, upload your sale agreement, payment receipts, and correspondence with the builder, pay ₹5,000 filing fee, and submit.',
      },
      {
        question: 'Does Delhi RERA cover DDA flats and government housing?',
        answer: 'Delhi RERA primarily covers private real estate projects. DDA (Delhi Development Authority) projects have a separate grievance mechanism. However, if a private builder is developing a project on DDA land under a collaboration, it may fall under Delhi RERA jurisdiction.',
      },
      {
        question: 'What about projects in Dwarka, Rohini, or New Delhi — are they under Delhi RERA?',
        answer: 'Yes, all private real estate projects within the NCT of Delhi (including Dwarka, Rohini, Saket, and other areas) fall under Delhi RERA. Projects in Gurgaon fall under Haryana RERA, and projects in Noida/Ghaziabad fall under UP-RERA.',
      },
      {
        question: 'Can I file a Delhi RERA complaint for commercial property?',
        answer: 'Yes. RERA covers both residential and commercial real estate projects. If you have booked a commercial unit (office space, shop, etc.) and the builder has delayed possession or violated terms, you can file a complaint with Delhi RERA seeking refund or compensation.',
      },
    ],
  },
};

type Props = {
  params: Promise<{ state: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { state } = await params;
  const stateData = RERA_STATES[state];
  if (!stateData) return {};

  return {
    title: `${stateData.shortName} Complaint Format | File RERA Complaint ${stateData.name}`,
    description: `File a RERA complaint in ${stateData.name}. Complete guide to ${stateData.shortName} complaint format, filing fee (${stateData.filingFee}), interest rate, and online portal. Free AI-powered complaint generator.`,
    keywords: [
      `${stateData.shortName} complaint format`,
      `RERA complaint ${stateData.name}`,
      `file RERA complaint ${stateData.bench}`,
      `${stateData.shortName} online complaint`,
      `builder complaint ${stateData.name}`,
      `delayed possession ${stateData.name}`,
    ],
    openGraph: {
      title: `${stateData.shortName} Complaint Format | File RERA Complaint ${stateData.name} | AI Vakeel`,
      description: `File a RERA complaint in ${stateData.name}. Complete guide with ${stateData.shortName} portal link, filing fee, interest rate, and free AI complaint generator.`,
      url: `https://aivakeel.in/rera-complaint/${stateData.slug}`,
      siteName: 'AI Vakeel',
      locale: 'en_IN',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${stateData.shortName} Complaint Format | AI Vakeel`,
      description: `File a RERA complaint in ${stateData.name}. Free AI-powered complaint generator with proper legal format.`,
    },
    alternates: {
      canonical: `https://aivakeel.in/rera-complaint/${stateData.slug}`,
    },
  };
}

export function generateStaticParams() {
  return Object.keys(RERA_STATES).map((state) => ({ state }));
}

export default async function StateReraPage({ params }: Props) {
  const { state } = await params;
  const stateData = RERA_STATES[state];

  if (!stateData) {
    notFound();
  }

  const otherStates = Object.values(RERA_STATES).filter((s) => s.slug !== state);

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: stateData.faq.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="min-h-screen flex flex-col bg-cream">
        <Header />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="bg-gradient-to-b from-navy-900 to-navy-800 text-white py-16 px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
                File a RERA Complaint in {stateData.name}
              </h1>
              <p className="mt-6 text-lg md:text-xl text-slate-300 leading-relaxed max-w-3xl mx-auto">
                Complete guide to filing a {stateData.shortName} complaint. Get your builder to pay compensation for delayed possession, structural defects, or broken promises.
              </p>
              <Link
                href="/"
                className="mt-8 inline-flex items-center gap-2 px-8 py-4 bg-gold-400 text-navy-900 font-bold rounded-lg hover:bg-gold-500 transition-colors shadow-gold-glow text-lg"
              >
                <ScalesIcon className="w-5 h-5" />
                Generate Your {stateData.shortName} Complaint — Free
              </Link>
            </div>
          </section>

          {/* State RERA Details */}
          <section className="py-16 px-6 bg-white">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-navy-900 mb-8">
                {stateData.shortName} — {stateData.authority}
              </h2>

              <div className="grid md:grid-cols-2 gap-6 mb-10">
                <div className="bg-cream rounded-xl p-6 border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Official Portal</h3>
                  <a
                    href={stateData.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-navy-900 font-semibold hover:text-gold-500 transition-colors underline"
                  >
                    {stateData.portalUrl}
                  </a>
                </div>
                <div className="bg-cream rounded-xl p-6 border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Bench / Authority Location</h3>
                  <p className="text-navy-900 font-semibold">{stateData.bench}</p>
                </div>
                <div className="bg-cream rounded-xl p-6 border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Interest Rate for Delayed Possession</h3>
                  <p className="text-navy-900 font-semibold">{stateData.interestRate}</p>
                </div>
                <div className="bg-cream rounded-xl p-6 border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">Filing Fee</h3>
                  <p className="text-navy-900 font-semibold">{stateData.filingFee}</p>
                </div>
              </div>

              <div className="prose prose-lg text-slate-700 space-y-4">
                <p>
                  The {stateData.authority} ({stateData.shortName}) is the regulatory body responsible for overseeing real estate transactions in {stateData.name}. Established under the Real Estate (Regulation and Development) Act, 2016, {stateData.shortName} ensures that builders comply with their obligations to homebuyers.
                </p>
                <p>
                  If your builder in {stateData.name} has delayed possession beyond the agreed date, deviated from the sanctioned plan, demanded illegal extra charges, or delivered a property with structural defects, you have the right to file a complaint with {stateData.shortName} and seek compensation.
                </p>
                <p>
                  The {stateData.shortName} bench is located in <strong>{stateData.bench}</strong>. Complaints can be filed online through the official portal, and hearings are conducted at the {stateData.bench} office. The filing fee is <strong>{stateData.filingFee}</strong>, and the authority is mandated to resolve complaints within 60 days.
                </p>
              </div>
            </div>
          </section>

          {/* How to File Section */}
          <section className="py-16 px-6 bg-cream">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-navy-900 mb-8">
                How to File a {stateData.shortName} Complaint — Step by Step
              </h2>
              <div className="space-y-6">
                <div className="bg-white rounded-xl p-6 shadow-card border border-slate-100">
                  <div className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-gold-400/10 rounded-full flex items-center justify-center text-gold-500 font-bold">1</span>
                    <div>
                      <h3 className="text-lg font-semibold text-navy-900 mb-2">Gather Your Documents</h3>
                      <p className="text-slate-600">Collect your Builder-Buyer Agreement, all payment receipts, allotment letter, correspondence with the builder, and the project&rsquo;s RERA registration number from the {stateData.shortName} portal.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-card border border-slate-100">
                  <div className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-gold-400/10 rounded-full flex items-center justify-center text-gold-500 font-bold">2</span>
                    <div>
                      <h3 className="text-lg font-semibold text-navy-900 mb-2">Draft Your Complaint</h3>
                      <p className="text-slate-600">Use AI Vakeel to generate a professionally formatted {stateData.shortName} complaint with proper legal citations, section references, and prayer clauses. Our AI agents research applicable RERA provisions and draft a comprehensive complaint in minutes.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-card border border-slate-100">
                  <div className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-gold-400/10 rounded-full flex items-center justify-center text-gold-500 font-bold">3</span>
                    <div>
                      <h3 className="text-lg font-semibold text-navy-900 mb-2">File Online at {stateData.shortName} Portal</h3>
                      <p className="text-slate-600">Register on <a href={stateData.portalUrl} target="_blank" rel="noopener noreferrer" className="text-gold-500 underline">{stateData.portalUrl}</a>, upload your complaint document and supporting evidence, pay the filing fee of {stateData.filingFee}, and submit.</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-card border border-slate-100">
                  <div className="flex items-start gap-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-gold-400/10 rounded-full flex items-center justify-center text-gold-500 font-bold">4</span>
                    <div>
                      <h3 className="text-lg font-semibold text-navy-900 mb-2">Attend Hearings</h3>
                      <p className="text-slate-600">After filing, {stateData.shortName} will issue notice to the builder and schedule hearings at the {stateData.bench} bench. You can attend in person or through an authorized representative. The authority aims to resolve complaints within 60 days.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Compensation Details */}
          <section className="py-16 px-6 bg-white">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-navy-900 mb-6">
                Compensation You Can Claim Under {stateData.shortName}
              </h2>
              <div className="text-slate-700 space-y-4">
                <p>
                  Under the RERA Act, homebuyers in {stateData.name} are entitled to significant compensation when builders violate their obligations. Here&rsquo;s what you can claim through {stateData.shortName}:
                </p>
                <ul className="list-disc pl-6 space-y-3">
                  <li><strong>Full Refund with Interest:</strong> If you choose to withdraw from the project, you can get back the entire amount paid plus interest at {stateData.interestRate} from the date of each payment.</li>
                  <li><strong>Delay Compensation:</strong> If you choose to continue with the project, you can claim interest at {stateData.interestRate} for every month of delay from the promised possession date until actual possession.</li>
                  <li><strong>Structural Defect Rectification:</strong> For defects discovered within 5 years of possession, the builder must rectify them within 30 days or pay compensation.</li>
                  <li><strong>Compensation for Mental Agony:</strong> {stateData.shortName} can award additional compensation for mental harassment and agony caused by the builder&rsquo;s actions.</li>
                  <li><strong>Penalty on Builder:</strong> The authority can impose penalties up to 5% of the project cost on the builder for violations.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-16 px-6 bg-cream">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-navy-900 mb-10 text-center">
                {stateData.shortName} — Frequently Asked Questions
              </h2>
              <div className="space-y-6">
                {stateData.faq.map((faq, index) => (
                  <div key={index} className="bg-white rounded-xl p-6 shadow-card border border-slate-100">
                    <h3 className="text-lg font-semibold text-navy-900 mb-3">{faq.question}</h3>
                    <p className="text-slate-600 leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Internal Links — Other States */}
          <section className="py-12 px-6 bg-white border-t border-slate-100">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl font-bold text-navy-900 mb-6">RERA Complaints in Other States</h2>
              <div className="grid md:grid-cols-2 gap-4 mb-8">
                {otherStates.map((s) => (
                  <Link
                    key={s.slug}
                    href={`/rera-complaint/${s.slug}`}
                    className="block p-4 bg-cream rounded-lg border border-slate-200 hover:border-gold-400 transition-colors"
                  >
                    <h3 className="font-semibold text-navy-900">{s.shortName} Complaint</h3>
                    <p className="text-sm text-slate-600 mt-1">File a RERA complaint in {s.name} — {s.bench} bench</p>
                  </Link>
                ))}
              </div>

              <h2 className="text-xl font-bold text-navy-900 mb-6">Related Pages</h2>
              <div className="grid md:grid-cols-3 gap-4">
                <Link href="/rera-complaint" className="block p-4 bg-cream rounded-lg border border-slate-200 hover:border-gold-400 transition-colors">
                  <h3 className="font-semibold text-navy-900">RERA Complaint Guide</h3>
                  <p className="text-sm text-slate-600 mt-1">Complete guide to filing RERA complaints across India.</p>
                </Link>
                <Link href="/consumer-complaint" className="block p-4 bg-cream rounded-lg border border-slate-200 hover:border-gold-400 transition-colors">
                  <h3 className="font-semibold text-navy-900">Consumer Complaint</h3>
                  <p className="text-sm text-slate-600 mt-1">File a consumer complaint against companies and service providers.</p>
                </Link>
                <Link href="/examples" className="block p-4 bg-cream rounded-lg border border-slate-200 hover:border-gold-400 transition-colors">
                  <h3 className="font-semibold text-navy-900">Complaint Examples</h3>
                  <p className="text-sm text-slate-600 mt-1">See sample complaints generated by AI Vakeel.</p>
                </Link>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-16 px-6 bg-gradient-to-b from-navy-900 to-navy-800 text-white text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Ready to File Your {stateData.shortName} Complaint?
              </h2>
              <p className="text-slate-300 text-lg mb-8">
                Generate a professionally formatted RERA complaint for {stateData.name} in minutes. Free, AI-powered, and ready to file at the {stateData.bench} bench.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gold-400 text-navy-900 font-bold rounded-lg hover:bg-gold-500 transition-colors shadow-gold-glow text-lg"
              >
                Generate Your {stateData.shortName} Complaint Now
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
