import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: 'AI Vakeel | Free Legal Complaint Generator India',
    template: '%s | AI Vakeel',
  },
  description: 'Generate professional consumer complaints, RERA complaints, and RTI applications instantly. AI-powered legal document generator for Indian courts. Free, fast, accurate.',
  keywords: ['consumer complaint format India', 'RERA complaint format', 'RTI application format', 'legal complaint generator', 'consumer forum complaint online', 'consumer protection act 2019'],
  authors: [{ name: 'AI Vakeel' }],
  openGraph: {
    title: 'AI Vakeel | Free Legal Complaint Generator India',
    description: 'Generate professional consumer complaints, RERA complaints, and RTI applications instantly using AI.',
    url: 'https://aivakeel.in',
    siteName: 'AI Vakeel',
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Vakeel | Free Legal Complaint Generator India',
    description: 'Generate professional consumer complaints, RERA complaints, and RTI applications instantly using AI.',
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: 'https://aivakeel.in',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-gradient-to-b from-slate-50 to-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
