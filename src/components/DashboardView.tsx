import { ArrowRight, Lightbulb, Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { InterviewSession, InterviewType, OrbState } from '../types/interview';
import { computeDashboardKPIs } from '../utils/scoring';
import InterviewerOrb from './InterviewerOrb';

interface DashboardViewProps {
  sessions: InterviewSession[];
  onStartNew: (focusAreas?: string[]) => void;
  onInspectReport: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
}

export default function DashboardView({
  sessions,
  onStartNew,
  onInspectReport,
  onDeleteSession,
}: DashboardViewProps) {
  const [orbPreviewState, setOrbPreviewState] = useState<OrbState>('idle');
  const [filterType, setFilterType] = useState<'All' | InterviewType>('All');

  const kpis = useMemo(() => computeDashboardKPIs(sessions), [sessions]);

  const filteredSessions = useMemo(() => {
    const ordered = [...sessions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    if (filterType === 'All') return ordered;
    return ordered.filter((s) => s.config.type === filterType);
  }, [sessions, filterType]);

  const latestSession = useMemo(() => {
    if (sessions.length === 0) return null;
    return [...sessions].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )[0];
  }, [sessions]);

  // SVG trajectory plot coordinates
  const svgW = 540;
  const svgH = 190;
  const padL = 42;
  const padR = 36;
  const padT = 24;
  const padB = 34;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const points = useMemo(() => {
    const series = kpis.progressSeries;
    if (series.length === 0) return [];
    return series.map((item, idx) => {
      const x =
        series.length === 1
          ? padL + plotW / 2
          : padL + (idx / (series.length - 1)) * plotW;
      const clamped = Math.min(10, Math.max(0, item.score));
      const y = padT + (1 - clamped / 10) * plotH;
      return { ...item, x, y };
    });
  }, [kpis.progressSeries, padL, padT, plotW, plotH]);

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  const orbStates: Array<{ id: OrbState; label: string }> = [
    { id: 'idle', label: 'Idle' },
    { id: 'generating', label: 'Generating' },
    { id: 'evaluating', label: 'Evaluating' },
    { id: 'feedback', label: 'Feedback' },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 pb-20 pt-8">
      {/* Welcome Hero + AI Interviewer Core */}
      <section className="grid items-stretch gap-5 lg:grid-cols-12">
        <div className="flex flex-col justify-between rounded-xl border border-rose-500/20 bg-[#0d0a0f]/95 p-7 lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
              <span className="text-rose-300">Performance Command Center</span>
              <span aria-hidden="true" className="text-zinc-600">
                ·
              </span>
              <span className="font-mono tabular-nums text-zinc-300">
                {kpis.completedCount} Completed {kpis.completedCount === 1 ? 'Session' : 'Sessions'}
              </span>
            </div>

            <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Welcome back to your AI Interview Studio
            </h1>
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-zinc-400">
              Track your technical precision, communication clarity, and interview confidence across practice rounds. Launch a fresh 5-question mock interview anytime.
            </p>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onStartNew()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white whitespace-nowrap shrink-0 transition-colors hover:bg-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Start New Interview</span>
            </button>

            {latestSession && (
              <button
                type="button"
                onClick={() => onInspectReport(latestSession.id)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700/90 bg-zinc-950/90 px-4 py-2.5 text-sm font-medium text-zinc-100 whitespace-nowrap shrink-0 transition-colors hover:border-rose-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                <span>Inspect Latest Report</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        {/* Right: AI Interviewer Core */}
        <div className="flex flex-col justify-between rounded-xl border border-rose-500/20 bg-[#0d0a0f]/95 p-5 lg:col-span-5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-zinc-300">AI Interviewer Core</span>
            <span className="font-mono capitalize text-rose-300">{orbPreviewState}</span>
          </div>

          <InterviewerOrb state={orbPreviewState} sizeClass="h-48 w-full my-1" />

          <div className="grid grid-cols-4 gap-1.5 rounded-lg border border-zinc-800/80 bg-zinc-950/90 p-1">
            {orbStates.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setOrbPreviewState(st.id)}
                className={`cursor-pointer rounded-md px-2 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  orbPreviewState === st.id
                    ? 'bg-rose-700 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4 KPI Strip */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-800/90 bg-[#0d0a0f]/95 p-5">
          <div className="text-xs text-zinc-400">Overall Performance Score</div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-bold tabular-nums text-white">
              {kpis.overallMean.toFixed(1)}
            </span>
            <span className="font-mono text-xs text-zinc-500">/ 10</span>
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-rose-600 transition-all"
              style={{ width: `${Math.min(100, kpis.overallMean * 10)}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800/90 bg-[#0d0a0f]/95 p-5">
          <div className="text-xs text-zinc-400">Technical Skills Score</div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-rose-300">
            {kpis.technicalPct}%
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-rose-500 transition-all"
              style={{ width: `${Math.min(100, kpis.technicalPct)}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800/90 bg-[#0d0a0f]/95 p-5">
          <div className="text-xs text-zinc-400">Communication Score</div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-white">
            {kpis.communicationPct}%
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-zinc-200 transition-all"
              style={{ width: `${Math.min(100, kpis.communicationPct)}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800/90 bg-[#0d0a0f]/95 p-5">
          <div className="text-xs text-zinc-400">Confidence Score</div>
          <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-rose-200">
            {kpis.confidencePct}%
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-rose-400 transition-all"
              style={{ width: `${Math.min(100, kpis.confidencePct)}%` }}
            />
          </div>
        </div>
      </section>

      {/* Progress Trajectory + Improvement Recommendations */}
      <section className="grid gap-5 lg:grid-cols-12">
        <div className="rounded-xl border border-zinc-800/90 bg-[#0d0a0f]/95 p-6 lg:col-span-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">Interview Progress</h2>
              <p className="mt-0.5 text-xs text-zinc-400">
                Average score trajectory across completed mock sessions
              </p>
            </div>
            <span className="font-mono text-xs text-rose-300">Scale 0–10</span>
          </div>

          {points.length === 0 ? (
            <div className="mt-8 flex h-44 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-800 text-center">
              <p className="text-sm text-zinc-400">No completed sessions yet.</p>
              <button
                type="button"
                onClick={() => onStartNew()}
                className="mt-3 cursor-pointer text-xs font-semibold text-rose-300 hover:underline"
              >
                Start your first mock interview
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <svg
                role="img"
                aria-label="Interview score progression chart"
                viewBox={`0 0 ${svgW} ${svgH}`}
                className="w-full overflow-visible"
              >
                {[2, 4, 6, 8, 10].map((tick) => {
                  const y = padT + (1 - tick / 10) * plotH;
                  return (
                    <g key={tick}>
                      <line
                        x1={padL}
                        x2={svgW - padR}
                        y1={y}
                        y2={y}
                        stroke="rgba(255,255,255,0.06)"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={padL - 10}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-zinc-500 font-mono text-[10px]"
                      >
                        {tick}
                      </text>
                    </g>
                  );
                })}

                {points.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#e11d48"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polylinePoints}
                  />
                )}

                {points.map((pt) => (
                  <g key={pt.sessionId}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="5"
                      fill="#070608"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                    />
                    <text
                      x={pt.x}
                      y={pt.y - 12}
                      textAnchor="middle"
                      className="fill-white font-mono text-[11px] font-semibold"
                    >
                      {pt.score.toFixed(1)}
                    </text>
                    <text
                      x={pt.x}
                      y={svgH - 8}
                      textAnchor="middle"
                      className="fill-zinc-400 font-mono text-[10px]"
                    >
                      {pt.label}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          )}
        </div>

        {/* Improvement Recommendations */}
        <div className="flex flex-col justify-between rounded-xl border border-zinc-800/90 bg-[#0d0a0f]/95 p-6 lg:col-span-5">
          <div>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-rose-400" aria-hidden="true" />
              <h2 className="font-display text-lg font-semibold text-white">
                Improvement Recommendations
              </h2>
            </div>

            <ul className="mt-4 space-y-2.5">
              {kpis.topRecommendations.map((rec, idx) => (
                <li
                  key={idx}
                  className="rounded-lg border border-zinc-800/90 bg-zinc-950/75 px-3.5 py-2.5 text-xs leading-relaxed text-zinc-300"
                >
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => onStartNew(kpis.topRecommendations)}
            className="mt-5 w-full cursor-pointer rounded-lg border border-rose-500/40 bg-rose-950/40 px-4 py-2.5 text-xs font-semibold text-rose-200 transition-colors hover:bg-rose-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            Practice Recommended Focus Areas
          </button>
        </div>
      </section>

      {/* Previous Interview Sessions */}
      <section className="rounded-xl border border-zinc-800/90 bg-[#0d0a0f]/95 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">
              Previous Interview Sessions
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              Select any completed session to review detailed AI feedback and 3D analytics
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950/90 p-1">
            {(['All', 'Mixed', 'Technical', 'HR'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterType(tab)}
                className={`cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  filterType === tab
                    ? 'bg-rose-700 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed border-zinc-800 px-6 py-10 text-center">
            <p className="text-sm text-zinc-400">
              {sessions.length === 0
                ? 'No saved interview sessions yet.'
                : `No ${filterType} interview sessions found.`}
            </p>
            <button
              type="button"
              onClick={() => onStartNew()}
              className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-rose-700 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-600"
            >
              Launch New Interview
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-zinc-800/90 bg-zinc-950/75 px-5 py-4 transition-colors hover:border-rose-500/35"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-base font-semibold text-white">
                      {session.config.role}
                    </span>
                    {session.isBenchmark && (
                      <span className="text-xs text-rose-300/80">· Sample Benchmark</span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    <span>{session.config.experience}</span>
                    <span aria-hidden="true">·</span>
                    <span>{session.config.difficulty}</span>
                    <span aria-hidden="true">·</span>
                    <span>{session.config.type}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{session.displayDate}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="text-right">
                    <div className="font-mono text-sm font-bold tabular-nums text-white">
                      {session.metrics.totalScore.toFixed(1)} / 50
                    </div>
                    <div className="font-mono text-xs tabular-nums text-rose-300">
                      Avg {session.metrics.averageScore.toFixed(1)}/10
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onInspectReport(session.id)}
                    className="cursor-pointer rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-100 whitespace-nowrap shrink-0 transition-colors hover:border-rose-500/60 hover:text-white"
                  >
                    View Report
                  </button>

                  <button
                    type="button"
                    aria-label={`Delete ${session.config.role} session`}
                    onClick={() => onDeleteSession(session.id)}
                    className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-zinc-400 transition-colors hover:border-rose-500/60 hover:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
