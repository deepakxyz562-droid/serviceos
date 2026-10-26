'use client';

import { useAppStore } from '@/store/app-store';
import type { ViewType } from '@/types/workflow';

const groups: { view: ViewType; label: string }[][] = [
  [{ view: 'leads', label: 'Lead Pipeline' }, { view: 'contacts', label: 'Contacts & Segments' }],
];

export function BgosViewNavigation({ className = '' }: { className?: string }) {
  const currentView = useAppStore((s) => s.currentView);
  const navigate = useAppStore((s) => s.setCurrentView);
  const items = groups.find((group) => group.some((item) => item.view === currentView));
  if (!items) return null;

  return (
    <nav
      className={`inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium ${className}`}
      aria-label="Section navigation"
    >
      {items.map((item) => {
        const active = currentView === item.view;
        return (
          <button
            key={item.view}
            type="button"
            aria-current={active ? 'page' : undefined}
            onClick={() => navigate(item.view)}
            className={`px-3 py-1.5 rounded-lg transition text-xs font-semibold ${
              active
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/50'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
