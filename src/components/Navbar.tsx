import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import type { AppView } from '../types/interview';

interface NavbarProps {
  activeView: AppView;
  onNavigate: (view: AppView, scrollTarget?: string) => void;
}

export default function Navbar({ activeView, onNavigate }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems: Array<{ label: string; view: AppView; scrollTarget?: string; isFeatures?: boolean }> = [
    { label: 'Overview', view: 'overview' },
    { label: 'Features', view: 'overview', scrollTarget: 'features-section', isFeatures: true },
    { label: 'Dashboard', view: 'dashboard' },
    { label: 'Setup', view: 'setup' },
  ];

  const handleNavClick = (view: AppView, scrollTarget?: string) => {
    setMobileOpen(false);
    onNavigate(view, scrollTarget);
  };

  const primaryActionLabel = activeView === 'setup' || activeView === 'interview' ? 'Dashboard' : 'Start Interview';
  const primaryActionTarget: AppView = activeView === 'setup' || activeView === 'interview' ? 'dashboard' : 'setup';

  return (
    <header className="sticky top-0 z-30 border-b border-rose-500/15 bg-[#070608]/95">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
        <button
          type="button"
          onClick={() => handleNavClick('overview')}
          className="cursor-pointer font-display text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded"
        >
          AetherPrep AI
        </button>

        <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-7">
          {navItems.map((item) => {
            const isCurrent =
              !item.isFeatures &&
              ((item.view === 'overview' && activeView === 'overview') ||
                (item.view === 'dashboard' && (activeView === 'dashboard' || activeView === 'report')) ||
                (item.view === 'setup' && (activeView === 'setup' || activeView === 'interview')));
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => handleNavClick(item.view, item.scrollTarget)}
                className={`cursor-pointer border-b-2 py-1 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                  isCurrent
                    ? 'border-rose-500 text-white'
                    : 'border-transparent text-zinc-400 hover:text-white'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleNavClick(primaryActionTarget)}
            className="hidden sm:inline-flex cursor-pointer items-center justify-center rounded-lg bg-rose-700 px-4 py-2 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition-colors hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            {primaryActionLabel}
          </button>

          <button
            type="button"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex md:hidden cursor-pointer items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-200 hover:border-zinc-700"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-zinc-800/80 bg-[#0b090d] px-6 py-4 md:hidden">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleNavClick(item.view, item.scrollTarget)}
                className="cursor-pointer rounded-lg px-3 py-2.5 text-left text-sm font-medium text-zinc-200 hover:bg-zinc-900"
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleNavClick(primaryActionTarget)}
              className="mt-2 cursor-pointer rounded-lg bg-rose-700 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-rose-600"
            >
              {primaryActionLabel}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
