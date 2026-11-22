import { ArrowRight, BarChart3, Layers, ShieldCheck, Sparkles } from 'lucide-react';
import { CAREER_TRACKS } from '../data/seedSessions';
import type { AppView } from '../types/interview';
import InterviewerOrb from './InterviewerOrb';

interface OverviewViewProps {
  onNavigate: (view: AppView, scrollTarget?: string) => void;
  onSelectTrack: (role: string) => void;
}

export default function OverviewView({ onNavigate, onSelectTrack }: OverviewViewProps) {
  const capabilities = [
    {
      index: '01. Adaptive Generation',
      title: 'Role-Specific 5-Question Sessions',
      description:
        'Every mock interview generates five fresh questions calibrated to your chosen engineering or design role, seniority level, and difficulty.',
    },
    {
      index: '02. Deep Evaluation',
      title: 'Honest Technical & Clarity Scoring',
      description:
        'Receive a structured 6-part breakdown after every answer: score out of 10, strengths, gaps, improvements, sample answer, and interviewer coaching.',
    },
    {
      index: '03. Session Memory',
      title: 'Context-Aware Follow-Up Coaching',
      description:
        'The AI interviewer tracks your answers across all five questions so feedback builds on your earlier responses rather than repeating generic advice.',
    },
    {
      index: '04. 3D Analytics',
      title: 'Comprehensive Final Readiness Report',
      description:
        'Inspect circular gauges, a 3D question performance chart, strongest and weakest answers, and exportable preparation plans.',
    },
  ];

  const steps = [
    {
      num: '01',
      title: 'Configure Your Track',
      description:
        'Select from 7 specialized tech roles or enter a custom role, pick Fresher or Experienced level, set difficulty, and choose Technical, HR, or Mixed (3 Technical + 2 HR).',
    },
    {
      num: '02',
      title: 'Answer Under Guidance',
      description:
        'Work through 5 structured questions alongside the reactive 3D holographic interviewer orb. Submit each response for immediate AI critique and a model answer.',
    },
    {
      num: '03',
      title: 'Review & Target Weak Areas',
      description:
        'Unlock your final /50 readiness report, download a full Markdown summary, or launch a focused follow-up session targeting your weakest topics.',
    },
  ];

  const scrollToFeatures = () => {
    const el = document.getElementById('features-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="mx-auto max-w-6xl px-6 pb-20 pt-10 md:pt-14">
      {/* Hero Split */}
      <section className="grid items-stretch gap-10 lg:grid-cols-12">
        <div className="flex flex-col justify-between lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-rose-300/90">
              <span>AI Mock Interview Studio</span>
              <span aria-hidden="true" className="text-zinc-600">
                ·
              </span>
              <span className="text-zinc-400">Technical &amp; HR Coaching</span>
            </div>

            <h1 className="mt-5 max-w-2xl font-display text-4xl font-extrabold uppercase leading-[1.03] tracking-tight text-white [text-wrap:balance] sm:text-5xl">
              Your Next Interview. Your Next Breakthrough.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-relaxed text-zinc-300">
              Practice smarter. Answer confidently. Get interview-ready with your personal AI interviewer.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => onNavigate('setup')}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-rose-700 px-5 py-3 text-sm font-semibold text-white whitespace-nowrap shrink-0 transition-colors hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                <span>Start Interview</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={scrollToFeatures}
                className="inline-flex cursor-pointer items-center rounded-lg border border-zinc-700/80 bg-zinc-950/90 px-5 py-3 text-sm font-medium text-zinc-100 whitespace-nowrap shrink-0 transition-colors hover:border-rose-500/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                Explore Features
              </button>

              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="inline-flex cursor-pointer items-center px-2 py-2 text-sm font-medium text-rose-300 whitespace-nowrap shrink-0 transition-colors hover:text-rose-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded"
              >
                Open Dashboard
              </button>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="mt-10 grid grid-cols-3 gap-6 border-t border-zinc-800/90 pt-7">
            <div>
              <div className="font-mono text-2xl font-bold tabular-nums text-white">5 Qs</div>
              <div className="mt-1 text-xs text-zinc-400">Structured per session</div>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold tabular-nums text-white">3 + 2</div>
              <div className="mt-1 text-xs text-zinc-400">Mixed Tech &amp; HR split</div>
            </div>
            <div>
              <div className="font-mono text-2xl font-bold tabular-nums text-white">6-Point</div>
              <div className="mt-1 text-xs text-zinc-400">Per-answer AI rubric</div>
            </div>
          </div>
        </div>

        {/* Right 3D Holographic Orb Showcase */}
        <div className="flex flex-col justify-between rounded-xl border border-rose-500/20 bg-[#0b080d]/95 p-5 lg:col-span-5">
          <InterviewerOrb state="idle" sizeClass="h-72 sm:h-80 w-full" />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 pt-3 text-xs">
            <span className="font-medium text-zinc-300">Interactive 3D Holographic Interviewer</span>
            <span className="font-mono text-rose-300">Real-Time Gemini Evaluation</span>
          </div>
        </div>
      </section>

      {/* Platform Capabilities */}
      <section id="features-section" className="mt-24 border-t border-zinc-800/80 pt-16">
        <div className="max-w-2xl">
          <p className="text-xs font-medium text-rose-300">Platform Capabilities</p>
          <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white [text-wrap:balance]">
            Built for realistic interview pressure and measurable growth
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Every session evaluates technical accuracy, relevance, clarity, completeness, and communication quality without inflated scores.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {capabilities.map((cap) => (
            <article
              key={cap.index}
              className="rounded-xl border border-rose-500/15 bg-[#0d0a0f]/95 p-6 transition-colors hover:border-rose-500/35"
            >
              <div className="font-mono text-xs font-medium text-rose-300">{cap.index}</div>
              <h3 className="mt-3 font-display text-lg font-semibold text-white">{cap.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{cap.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="mt-24 border-t border-zinc-800/80 pt-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-xs font-medium text-rose-300">How It Works</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white [text-wrap:balance]">
              Three steps from setup to final readiness report
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('setup')}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-rose-500/35 bg-rose-950/40 px-4 py-2.5 text-xs font-semibold text-rose-200 whitespace-nowrap shrink-0 transition-colors hover:bg-rose-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            <span>Configure a session now</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.num}
              className="rounded-xl border border-zinc-800/90 bg-[#0c090e]/95 p-6"
            >
              <div className="font-mono text-2xl font-bold tabular-nums text-rose-400">
                {step.num}
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Supported Career Tracks */}
      <section className="mt-24 border-t border-zinc-800/80 pt-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-rose-300">Supported Career Tracks</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-white [text-wrap:balance]">
              Launch directly into your target role
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Pick a preset discipline or define any custom job title. Both Fresher and Experienced difficulty calibration are built in.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-1.5 text-zinc-300">
                <ShieldCheck className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
                Strict technical accuracy rubric
              </span>
              <span aria-hidden="true" className="text-zinc-600">
                ·
              </span>
              <span className="inline-flex items-center gap-1.5 text-zinc-300">
                <Sparkles className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
                Beginner-friendly explanations
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CAREER_TRACKS.map((track) => (
            <button
              key={track.id}
              type="button"
              onClick={() => onSelectTrack(track.role)}
              className="group flex cursor-pointer flex-col justify-between rounded-xl border border-zinc-800/90 bg-[#0d0a0f]/95 p-5 text-left transition-colors hover:border-rose-500/60 hover:bg-[#130d15] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display text-base font-semibold text-white group-hover:text-rose-200">
                    {track.role}
                  </span>
                  <ArrowRight
                    className="h-4 w-4 text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:text-rose-400"
                    aria-hidden="true"
                  />
                </div>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">{track.tagline}</p>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-[11px] text-zinc-500">
                {track.isCustom ? (
                  <Layers className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
                ) : (
                  <BarChart3 className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
                )}
                <span className="truncate">{track.coreTopics.slice(0, 2).join(' · ')}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="mt-24 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-800/80 pt-8 text-xs text-zinc-500">
        <div>AetherPrep AI — 3D Mock Interview Assistant</div>
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="cursor-pointer text-zinc-400 hover:text-white transition-colors"
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => onNavigate('setup')}
            className="cursor-pointer text-rose-300 hover:text-rose-200 transition-colors"
          >
            New Interview
          </button>
        </div>
      </footer>
    </div>
  );
}
