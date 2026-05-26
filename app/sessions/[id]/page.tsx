'use client';

import { useParams } from 'next/navigation';
import SessionDetail from '@/components/SessionDetail';
import Header from '@/components/Header';

export default function SessionDetailPage() {
  const params = useParams();
  const sessionId = params.id as string;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 p-8 flex flex-col items-center gap-8">
        <div className="w-full max-w-3xl">
          <a
            href="/sessions"
            className="text-amber-600 hover:text-amber-800 text-sm font-medium"
          >
            ← Back to Sessions
          </a>
        </div>

        <div className="w-full max-w-3xl">
          <SessionDetail sessionId={sessionId} />
        </div>
      </main>
    </div>
  );
}
