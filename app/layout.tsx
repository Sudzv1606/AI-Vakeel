import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Vakeel | Your AI Legal Team",
  description: "AI-powered Indian legal complaint document generator. Vakeel Panch: five AI agents working together to draft your legal complaints.",
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
