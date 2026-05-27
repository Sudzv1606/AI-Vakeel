'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { ScalesIcon } from '@/components/icons';
import type { User } from '@supabase/supabase-js';

interface HeaderProps {
  onHelpClick?: () => void;
}

export default function Header({ onHelpClick }: HeaderProps) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  function getDisplayName(user: User): string {
    const firstName = user.user_metadata?.first_name;
    if (firstName) return firstName;
    const email = user.email || '';
    return email.split('@')[0] || 'User';
  }

  return (
    <header className="bg-gradient-to-r from-navy-900 via-navy-900 to-navy-800 text-white header-glow relative">
      {/* Subtle bottom border glow */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold-400 to-transparent opacity-60" />
      <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <ScalesIcon className="w-8 h-8 text-gold-400" />
          <div>
            <h1 className="text-xl font-bold tracking-tight">AI Vakeel</h1>
            <p className="text-xs text-gold-400 font-medium tracking-wide">
              Vakeel Panch: Your AI Legal Team
            </p>
          </div>
        </div>
        <nav className="flex items-center gap-3">
          {onHelpClick && (
            <button
              onClick={onHelpClick}
              className="text-sm text-slate-300 hover:text-white transition-colors font-medium w-8 h-8 rounded-full hover:bg-white/10 border border-white/20 flex items-center justify-center"
              aria-label="Help"
              title="Show walkthrough"
            >
              ?
            </button>
          )}
          <a
            href="/sessions"
            className="text-sm text-slate-300 hover:text-white transition-colors font-medium px-4 py-2 rounded-lg hover:bg-white/10"
          >
            Session History
          </a>
          {user && (
            <div className="flex items-center gap-3 ml-2 pl-3 border-l border-white/20">
              <a
                href="/profile"
                className="text-xs text-slate-300 hover:text-gold-400 transition-colors hidden sm:inline max-w-[150px] truncate"
                title={user.email || ''}
              >
                {getDisplayName(user)}
              </a>
              <button
                onClick={handleSignOut}
                className="text-sm text-slate-300 hover:text-white transition-colors font-medium px-3 py-1.5 rounded-lg hover:bg-white/10 border border-white/20"
              >
                Sign Out
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
