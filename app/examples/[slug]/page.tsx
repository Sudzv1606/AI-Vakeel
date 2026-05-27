import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import { ScalesIcon } from '@/components/icons';
import { ALL_EXAMPLES } from '@/lib/example-complaints';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const example = ALL_EXAMPLES.find((e) => e.slug === slug);
  if (!example) return {};

  return {
    title: `${example.title} | Sample Format`,
    description: example.description,
    keywords: [
      example.title.toLowerCase(),
      `${example.domain.toLowerCase()} complaint example`,
      `${example.domain.toLowerCase()} complaint format`,
      'legal complaint sample India',
    ],
    openGraph: {
      title: `${example.title} | AI Vakeel`,
      description: example.description,
      url: `https://aivakeel.in/examples/${example.slug}`,
      siteName: 'AI Vakeel',
      locale: 'en_IN',
      type: 'article',
    },
    alternates: {
      canonical: `https://aivakeel.in/examples/${example.slug}`,
    },
  };
}

export function generateStaticParams() {
  return ALL_EXAMPLES.map((example) => ({ slug: example.slug }));
}

function getDomainColor(domain: string): string {
  switch (domain) {
    case 'Consumer Protection':
      return 'bg-blue-100 text-blue-800';
    case 'RERA':
      return 'bg-green-100 text-green-800';
    case 'RTI':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-slate-100 text-slate-800';
  }
}

function getDomainLink(domain: string): string {
  switch (domain) {
    case 'Consumer Protection':
      return '/consumer-complaint';
    case 'RERA':
      return '/rera-complaint';
    case 'RTI':
      return '/rti-application';
    default:
      return '/';
  }
}

export default async function ExamplePage({ params }: Props) {
  const { slug } = await params;
  const example = ALL_EXAMPLES.find((e) => e.slug === slug);

  if (!example) {
    notFound();
  }

  const relatedExamples = ALL_EXAMPLES.filter(
    (e) => e.domain === example.domain && e.slug !== slug
  );

  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-navy-900 to-navy-800 text-white py-12 px-6">
          <div className="max-w-4xl mx-auto">
            <Link
              href="/examples"
              className="text-sm text-slate-400 hover:text-gold-400 transition-colors mb-4 inline-block"
            >
              ← Back to All Examples
            </Link>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
              {example.title}
            </h1>
            <p className="mt-4 text-slate-300 leading-relaxed max-w-3xl">
              {example.description}
            </p>
          </div>
        </section>

        {/* Content */}
        <section className="py-12 px-6 bg-white">
          <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-8">
            {/* Main Document */}
            <div className="flex-1 min-w-0">
              <div className="bg-cream rounded-xl border border-slate-200 p-6 md:p-8">
                <pre className="whitespace-pre-wrap font-mono text-sm text-slate-800 leading-relaxed overflow-x-auto">
                  {example.document}
                </pre>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="lg:w-80 flex-shrink-0">
              <div className="sticky top-6 space-y-6">
                {/* Case Details */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-card">
                  <h2 className="text-lg font-bold text-navy-900 mb-4">Case Details</h2>
                  <dl className="space-y-4">
                    <div>
                      <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Domain</dt>
                      <dd className="mt-1">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getDomainColor(example.domain)}`}>
                          {example.domain}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Forum</dt>
                      <dd className="mt-1 text-sm text-navy-900 font-medium">{example.forum}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sections Cited</dt>
                      <dd className="mt-1 flex flex-wrap gap-1.5">
                        {example.sectionsCited.map((section) => (
                          <span key={section} className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-medium">
                            {section}
                          </span>
                        ))}
                      </dd>
                    </div>
                  </dl>
                </div>

                {/* CTA */}
                <div className="bg-gradient-to-b from-navy-900 to-navy-800 rounded-xl p-6 text-white">
                  <h3 className="font-bold text-lg mb-2">Generate Your Own</h3>
                  <p className="text-sm text-slate-300 mb-4">
                    This is just a sample. Get a personalized complaint tailored to your specific situation.
                  </p>
                  <Link
                    href="/"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-gold-400 text-navy-900 font-bold rounded-lg hover:bg-gold-500 transition-colors text-sm w-full justify-center"
                  >
                    <ScalesIcon className="w-4 h-4" />
                    Generate Your Complaint
                  </Link>
                </div>

                {/* Related Link */}
                <Link
                  href={getDomainLink(example.domain)}
                  className="block p-4 bg-cream rounded-lg border border-slate-200 hover:border-gold-400 transition-colors"
                >
                  <h3 className="font-semibold text-navy-900 text-sm">Learn More About {example.domain}</h3>
                  <p className="text-xs text-slate-600 mt-1">Complete guide to filing {example.domain.toLowerCase()} documents.</p>
                </Link>
              </div>
            </aside>
          </div>
        </section>

        {/* Related Examples */}
        {relatedExamples.length > 0 && (
          <section className="py-12 px-6 bg-cream border-t border-slate-100">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-xl font-bold text-navy-900 mb-6">More {example.domain} Examples</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {relatedExamples.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/examples/${related.slug}`}
                    className="block p-4 bg-white rounded-lg border border-slate-200 hover:border-gold-400 transition-colors"
                  >
                    <h3 className="font-semibold text-navy-900 text-sm">{related.title}</h3>
                    <p className="text-xs text-slate-600 mt-1">{related.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* All Examples Link */}
        <section className="py-8 px-6 bg-white border-t border-slate-100">
          <div className="max-w-5xl mx-auto text-center">
            <Link
              href="/examples"
              className="text-gold-500 hover:text-gold-600 font-semibold transition-colors"
            >
              ← View All Example Complaints
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
  );
}
