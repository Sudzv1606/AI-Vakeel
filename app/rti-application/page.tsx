import { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import { ScalesIcon } from '@/components/icons';

export const metadata: Metadata = {
  title: 'RTI Application Format | Free RTI Generator Online India',
  description: 'PIO didn\'t reply? File an RTI application or First Appeal online. Free AI-powered RTI application generator with proper format under Right to Information Act 2005. Get government information fast.',
  keywords: ['RTI application format', 'RTI online application', 'right to information application', 'RTI first appeal format', 'how to file RTI India', 'RTI Act 2005 application'],
  openGraph: {
    title: 'RTI Application Format + Auto-Generator | AI Vakeel',
    description: 'Generate a professional RTI application or First Appeal ready to submit. Free, AI-powered, proper format under RTI Act 2005.',
    url: 'https://aivakeel.in/rti-application',
    siteName: 'AI Vakeel',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RTI Application Format + Auto-Generator | AI Vakeel',
    description: 'Generate a professional RTI application ready to submit. Free AI tool for Right to Information Act.',
  },
  alternates: {
    canonical: 'https://aivakeel.in/rti-application',
  },
};

const faqData = [
  {
    question: 'What is RTI and who can file an RTI application?',
    answer: 'RTI (Right to Information) is a fundamental right under the Right to Information Act, 2005 that allows any Indian citizen to request information from public authorities. Any citizen of India can file an RTI application — there is no age limit, educational qualification, or other restriction. You can seek information from any government department, public sector undertaking, or body funded by the government. The only requirement is that you must be an Indian citizen.',
  },
  {
    question: 'What information can I get through RTI?',
    answer: 'Through RTI, you can access almost any information held by a public authority including: government records, documents, memos, emails, opinions, advices, press releases, circulars, orders, contracts, reports, papers, samples, models, and data in any electronic form. Common uses include checking status of government applications, getting details of government spending, accessing inspection reports, knowing reasons for government decisions, and getting copies of official documents. However, information affecting national security, sovereignty, or personal privacy may be exempt.',
  },
  {
    question: 'How much does it cost to file an RTI application?',
    answer: 'Filing an RTI application costs just ₹10 as the application fee for central government departments. State government fees vary but are typically ₹10-₹50. BPL (Below Poverty Line) card holders are exempt from paying any fee. Additional charges apply for photocopies (₹2 per page), printed copies (actual cost), diskette/floppy (₹50), and inspection of records (no fee for first hour, ₹5 for each subsequent hour). Payment can be made via postal order, demand draft, court fee stamp, or online through the RTI portal.',
  },
  {
    question: 'What is the time limit for RTI response and what if PIO doesn\'t reply?',
    answer: 'The Public Information Officer (PIO) must respond within 30 days of receiving your RTI application (48 hours if the information concerns life or liberty of a person). If the PIO doesn\'t respond within 30 days, or if you\'re not satisfied with the response, you can file a First Appeal with the First Appellate Authority within 30 days. If the First Appeal also fails, you can file a Second Appeal with the Central/State Information Commission. The PIO can be penalized ₹250 per day (up to ₹25,000) for delay without reasonable cause.',
  },
  {
    question: 'How do I file an RTI application online?',
    answer: 'For central government departments, you can file RTI online through the official portal rtionline.gov.in. Create an account, select the department, write your questions clearly, pay ₹10 online, and submit. For state government departments, most states have their own RTI portals. Alternatively, you can send a physical RTI application by post to the PIO of the concerned department. AI Vakeel helps you draft a properly formatted RTI application with clear, specific questions that maximize your chances of getting useful information.',
  },
];

const howToSteps = [
  {
    title: 'Tell Us What Information You Need',
    description: 'Describe what information you want from which government department. Be specific about what you want to know — our AI will help frame it as clear, answerable questions that PIOs cannot easily reject.',
  },
  {
    title: 'AI Agents Format Your Application',
    description: 'Our AI agents identify the correct public authority, frame your questions in proper RTI format, add relevant section references from RTI Act 2005, and ensure your application meets all legal requirements for acceptance.',
  },
  {
    title: 'Download Your RTI Application',
    description: 'Get a professionally formatted RTI application ready to submit online (rtionline.gov.in) or by post. The document includes proper addressing, clearly numbered questions, fee details, and all required declarations.',
  },
];

export default function RtiApplicationPage() {
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
    name: 'How to File an RTI Application Online in India',
    description: 'Step-by-step guide to generating a professional RTI application using AI Vakeel.',
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
                File an RTI Application Online
              </h1>
              <p className="mt-6 text-lg md:text-xl text-slate-300 leading-relaxed max-w-3xl mx-auto">
                PIO didn&rsquo;t reply? Need government information? Generate a properly formatted RTI application
                or First Appeal in minutes. Get the transparency you deserve.
              </p>
              <Link
                href="/"
                className="mt-8 inline-flex items-center gap-2 px-8 py-4 bg-gold-400 text-navy-900 font-bold rounded-lg hover:bg-gold-500 transition-colors shadow-gold-glow text-lg"
              >
                <ScalesIcon className="w-5 h-5" />
                Generate RTI Application — Free
              </Link>
            </div>
          </section>

          {/* Pain Point Section */}
          <section className="py-16 px-6 bg-white">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-navy-900 mb-6">
                Government Not Giving You Information? Use RTI.
              </h2>
              <div className="prose prose-lg text-slate-700 space-y-4">
                <p>
                  In a democracy, citizens have the right to know how their government functions and how their tax money is being spent. Yet, getting information from government departments often feels impossible. Applications get &ldquo;lost,&rdquo; officials give vague responses, and bureaucratic red tape makes the process frustrating.
                </p>
                <p>
                  The <strong>Right to Information Act, 2005</strong> is one of the most powerful tools available to Indian citizens. It compels government departments to provide information within 30 days, with penalties for non-compliance. Since its enactment, RTI has exposed corruption worth thousands of crores, forced accountability in government schemes, and helped millions of citizens get the information they needed.
                </p>
                <p>
                  But here&rsquo;s the catch: many RTI applications get rejected because they&rsquo;re not properly formatted, ask vague questions, or are addressed to the wrong authority. A well-drafted RTI application with specific, clear questions is much more likely to get a useful response.
                </p>
                <p>
                  AI Vakeel helps you draft RTI applications that work. Our AI understands the nuances of the RTI Act — which questions to ask, how to frame them so they can&rsquo;t be easily rejected, and which department to address. Whether you need information about a government scheme, want to check the status of your application, or need to file a First Appeal after a non-response, we&rsquo;ve got you covered.
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
                  Understanding the Right to Information Act, 2005
                </h2>
                <div className="text-slate-700 space-y-4">
                  <p>
                    The Right to Information Act, 2005 (RTI Act) is a landmark legislation that empowers Indian citizens to access information held by public authorities. The Act was born from the recognition that information is essential for democracy to function — citizens cannot hold their government accountable if they don&rsquo;t know what the government is doing.
                  </p>
                  <p>
                    Key features of the RTI Act include:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Universal Access:</strong> Any Indian citizen can file an RTI. No reason needs to be given for seeking information.</li>
                    <li><strong>Broad Coverage:</strong> Covers all public authorities — central government, state government, local bodies, and even private bodies substantially funded by the government.</li>
                    <li><strong>Time-Bound Response:</strong> PIO must respond within 30 days (48 hours for life/liberty matters).</li>
                    <li><strong>Penalties for Non-Compliance:</strong> PIO can be fined ₹250/day up to ₹25,000 for unreasonable delay or refusal.</li>
                    <li><strong>Two-Tier Appeal:</strong> First Appeal to the departmental authority, Second Appeal to the Information Commission.</li>
                    <li><strong>Proactive Disclosure:</strong> Section 4 mandates that public authorities proactively publish certain categories of information.</li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-navy-900 mb-4">
                  Common Uses of RTI Applications
                </h2>
                <div className="text-slate-700 space-y-4">
                  <p>
                    RTI applications are used for a wide variety of purposes. Here are some of the most common and effective uses:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Government Application Status:</strong> Check why your passport, driving license, building permission, or any government application is delayed.</li>
                    <li><strong>Public Spending:</strong> Get details of how government funds are being spent in your area — road construction, school budgets, hospital equipment purchases.</li>
                    <li><strong>Government Schemes:</strong> Find out eligibility criteria, beneficiary lists, and fund allocation for schemes like PM Awas Yojana, MGNREGA, or Ayushman Bharat.</li>
                    <li><strong>Recruitment and Exams:</strong> Get answer keys, cut-off marks, selection criteria, and interview marks for government job recruitments.</li>
                    <li><strong>Police and Legal:</strong> Get copies of FIRs, investigation status, or reasons for closure of cases.</li>
                    <li><strong>Municipal Issues:</strong> Information about property tax calculations, building permissions granted, or civic work contracts in your area.</li>
                    <li><strong>Education:</strong> Get information about school/college admissions, fee structures, teacher qualifications, or infrastructure spending.</li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-navy-900 mb-4">
                  Tips for Writing an Effective RTI Application
                </h2>
                <div className="text-slate-700 space-y-4">
                  <p>
                    The effectiveness of your RTI application depends largely on how well it&rsquo;s drafted. Here are key principles that AI Vakeel follows when generating your application:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Be Specific:</strong> Instead of &ldquo;Give me all information about road construction,&rdquo; ask &ldquo;Provide the total amount sanctioned and spent on road construction in Ward No. 15 during FY 2023-24, along with contractor names and completion dates.&rdquo;</li>
                    <li><strong>Ask for Documents:</strong> Request certified copies of specific documents rather than vague &ldquo;information.&rdquo; This makes it harder for the PIO to give an evasive response.</li>
                    <li><strong>One Topic Per Application:</strong> Keep each RTI focused on one topic. Multiple unrelated questions in one application can lead to delays as it gets transferred between departments.</li>
                    <li><strong>Address Correctly:</strong> Send your RTI to the correct PIO. If unsure, send it to the department head — they&rsquo;re legally required to transfer it to the correct PIO within 5 days.</li>
                    <li><strong>Keep Records:</strong> Always keep a copy of your application and the postal receipt. This is essential if you need to file a First Appeal.</li>
                  </ul>
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-navy-900 mb-4">
                  RTI First Appeal — When the PIO Doesn&rsquo;t Respond
                </h2>
                <div className="text-slate-700 space-y-4">
                  <p>
                    If the PIO doesn&rsquo;t respond within 30 days, or if you receive an incomplete or unsatisfactory response, you have the right to file a First Appeal. The First Appeal must be filed within 30 days of the expiry of the response deadline (or within 30 days of receiving an unsatisfactory response).
                  </p>
                  <p>
                    The First Appellate Authority is typically an officer senior to the PIO in the same department. They must dispose of the appeal within 30-45 days. AI Vakeel can also help you draft a First Appeal that clearly states why the PIO&rsquo;s response was inadequate and what specific information you still need.
                  </p>
                  <p>
                    If the First Appeal also fails, you can approach the Central Information Commission (for central government departments) or the State Information Commission (for state government departments) with a Second Appeal. The Information Commission has the power to impose penalties on the PIO and order disclosure of information.
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
                <Link href="/rera-complaint" className="block p-4 bg-cream rounded-lg border border-slate-200 hover:border-gold-400 transition-colors">
                  <h3 className="font-semibold text-navy-900">RERA Complaint Generator</h3>
                  <p className="text-sm text-slate-600 mt-1">File a complaint against your builder for delayed possession or broken promises.</p>
                </Link>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-16 px-6 bg-gradient-to-b from-navy-900 to-navy-800 text-white text-center">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Ready to Get the Information You Deserve?
              </h2>
              <p className="text-slate-300 text-lg mb-8">
                Information is power. Generate your RTI application in minutes and hold the government accountable.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gold-400 text-navy-900 font-bold rounded-lg hover:bg-gold-500 transition-colors shadow-gold-glow text-lg"
              >
                Start Now — Generate Your RTI Application
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
              <span>Free Legal Document Generator</span>
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
