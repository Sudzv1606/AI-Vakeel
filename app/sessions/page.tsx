'use client';

import { useRouter } from 'next/navigation';
import SessionHistory from '@/components/SessionHistory';
import Header from '@/components/Header';

export default function SessionsPage() {
  const router = useRouter();

  function handleSelectSession(sessionId: string) {
    router.push(`/sessions/${sessionId}`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 p-8 flex flex-col items-center gap-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Session History</h1>
          <p className="mt-2 text-gray-600">
            View your previous complaint generation sessions
          </p>
        </div>

        <SessionHistory onSelectSession={handleSelectSession} />

        <a
          href="/"
          className="text-amber-600 hover:text-amber-800 text-sm font-medium"
        >
          ← Back to Home
        </a>
      </main>
    </div>
  );
}
