import { ArrowLeft, ChevronDown, ChevronUp, Download, RotateCcw, Target } from 'lucide-react';
import { useState } from 'react';
import type { InterviewSession } from '../types/interview';
import { generateMarkdownReport, getStrongestAndWeakest } from '../utils/scoring';
import CircularGauge from './CircularGauge';
import PerformanceChart3D from './PerformanceChart3D';

interface ReportViewProps {
  session: InterviewSession;
  onRetryInterview: () => void;
  onPracticeWeakAreas: (skills: string[]) => void;
  onBackToDashboard: () => void;
}

export default function ReportView({
  session,
  onRetryInterview,
  onPracticeWeakAreas,
  onBackToDashboard,
}: ReportViewProps) {
  const [expandedTranscript, setExpandedTranscript] = useState<string | null>(
    session.records[0]?.question.id ?? null,
  );

  const { strongest, weakest } = getStrongestAndWeakest(session.records);

  const handleDownloadReport = () => {
    const markdown = generateMarkdownReport(session);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeRole = session.config.role.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    link.download = `aetherprep-${safeRole}-report.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 pb-20 pt-8">
      {/* Header Assessment Banner */}
      <section className="rounded-xl border border-rose-500/20 bg-[#0d0a0f]/95 p-7">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium text-rose-300">Final Interview Report</span>
              <span aria-hidden="true" className="text-zinc-600">
                ·
              </span>
              <span className="font-medium text-white">{session.config.role}</span>
              <span aria-hidden="true" className="text-zinc-600">
                ·
              </span>
              <span className="text-zinc-400">{session.config.experience}</span>
              <span aria-hidden="true" className="text-zinc-600">
                ·
              </span>
              <span className="text-zinc-400">{session.config.difficulty}</span>
            </div>

            <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Interview Performance Assessment
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              {session.headlineSummary}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onRetryInterview}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-xs font-medium text-zinc-100 whitespace-nowrap shrink-0 transition-colors hover:border-zinc-500"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Retry Interview</span>
            </button>

            <button
              type="button"
              onClick={() => onPracticeWeakAreas(session.skillsToImprove)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-rose-700 px-3.5 py-2 text-xs font-semibold text-white whitespace-nowrap shrink-0 transition-colors hover:bg-rose-600"
            >
              <Target className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Practice Weak Areas</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadReport}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-xs font-medium text-zinc-100 whitespace-nowrap shrink-0 transition-colors hover:border-zinc-500"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Download Report</span>
            </button>

            <button
              type="button"
              onClick={onBackToDashboard}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2 text-xs font-medium text-zinc-100 whitespace-nowrap shrink-0 transition-colors hover:border-zinc-500"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      </section>

      {/* 5 Circular Gauge Score Cards */}
      <section className="rounded-xl border border-zinc-800/90 bg-[#0d0a0f]/95 p-6">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
          <CircularGauge
            value={session.metrics.totalScore}
            max={50}
            label="Total Score"
            sublabel="Out of 50"
            strokeColor="#be123c"
          />
          <CircularGauge
            value={session.metrics.averageScore}
            max={10}
            label="Average Score"
            sublabel="Per question mean"
            strokeColor="#ffffff"
          />
          <CircularGauge
            value={session.metrics.technicalScore}
            max={10}
            label="Technical"
            sublabel="Accuracy & depth"
            strokeColor="#e11d48"
          />
          <CircularGauge
            value={session.metrics.hrScore}
            max={10}
            label="HR Performance"
            sublabel="Behavioral clarity"
            strokeColor="#fda4af"
          />
          <CircularGauge
            value={session.metrics.communicationScore}
            max={10}
            label="Communication"
            sublabel="Structure & tone"
            strokeColor="#f4f4f5"
          />
        </div>
      </section>

      {/* 3D Performance Breakdown + Strongest / Weakest */}
      <section className="grid items-start gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <PerformanceChart3D session={session} />
        </div>

        <div className="space-y-5 lg:col-span-5">
          <div className="rounded-xl border border-zinc-800/90 bg-[#0d0a0f]/95 p-6">
            <h2 className="font-display text-lg font-semibold text-white">Strongest Answers</h2>
            <div className="mt-3 space-y-3">
              {strongest.slice(0, 1).map((rec) => (
                <div
                  key={rec.question.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-white">
                      Question {rec.question.index} · {rec.question.category}
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-emerald-300">
                      {rec.evaluation.score.toFixed(1)}/10
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    {rec.evaluation.strengths[0] ?? rec.evaluation.coachingNote}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800/90 bg-[#0d0a0f]/95 p-6">
            <h2 className="font-display text-lg font-semibold text-white">Weakest Answers</h2>
            <div className="mt-3 space-y-3">
              {weakest.slice(0, 1).map((rec) => (
                <div
                  key={rec.question.id}
                  className="rounded-lg border border-rose-500/30 bg-zinc-950/80 p-4"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-white">
                      Question {rec.question.index} · {rec.question.category}
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-rose-300">
                      {rec.evaluation.score.toFixed(1)}/10
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    {rec.evaluation.gaps[0] ?? rec.evaluation.improvements[0]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Skills That Need Improvement + Personalized Preparation Recommendations */}
      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800/90 bg-[#0d0a0f]/95 p-6">
          <h2 className="font-display text-lg font-semibold text-white">
            Skills That Need Improvement
          </h2>
          <ul className="mt-4 space-y-2.5">
            {session.skillsToImprove.map((skill, i) => (
              <li
                key={i}
                className="rounded-lg border border-zinc-800/80 bg-zinc-950/75 px-4 py-2.5 text-xs text-zinc-200"
              >
                {skill}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-zinc-800/90 bg-[#0d0a0f]/95 p-6">
          <h2 className="font-display text-lg font-semibold text-white">
            Personalized Preparation Recommendations
          </h2>
          <ul className="mt-4 space-y-2.5">
            {session.recommendations.map((rec, i) => (
              <li
                key={i}
                className="rounded-lg border border-zinc-800/80 bg-zinc-950/75 px-4 py-2.5 text-xs leading-relaxed text-zinc-300"
              >
                {rec}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Full Question-by-Question Transcript */}
      <section className="rounded-xl border border-zinc-800/90 bg-[#0d0a0f]/95 p-6">
        <h2 className="font-display text-lg font-semibold text-white">
          Question-by-Question Transcript &amp; AI Coaching
        </h2>
        <div className="mt-4 space-y-3">
          {session.records.map((rec) => {
            const isOpen = expandedTranscript === rec.question.id;
            return (
              <div
                key={rec.question.id}
                className="rounded-xl border border-zinc-800/90 bg-zinc-950/75"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() =>
                    setExpandedTranscript(isOpen ? null : rec.question.id)
                  }
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <div>
                    <div className="text-xs text-rose-300">
                      Question {rec.question.index} · {rec.question.category} · {rec.question.topic}
                    </div>
                    <div className="mt-1 text-sm font-medium text-white">
                      {rec.question.prompt}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-sm font-bold tabular-nums text-white">
                      {rec.evaluation.score.toFixed(1)}/10
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="space-y-4 border-t border-zinc-800/80 px-5 py-4 text-xs">
                    <div>
                      <div className="font-semibold text-zinc-400">Your Response</div>
                      <p className="mt-1 leading-relaxed text-zinc-200">{rec.answer}</p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <div className="font-semibold text-emerald-300">Strengths</div>
                        <ul className="mt-1 space-y-1 text-zinc-300">
                          {rec.evaluation.strengths.map((s, i) => (
                            <li key={i}>· {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="font-semibold text-rose-300">Gaps</div>
                        <ul className="mt-1 space-y-1 text-zinc-300">
                          {rec.evaluation.gaps.map((g, i) => (
                            <li key={i}>· {g}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-white">Model Sample Answer</div>
                      <p className="mt-1 leading-relaxed text-zinc-300">
                        {rec.evaluation.sampleAnswer}
                      </p>
                    </div>
                    <div>
                      <div className="font-semibold text-rose-200">Interviewer Coaching Note</div>
                      <p className="mt-1 leading-relaxed text-zinc-300">
                        {rec.evaluation.coachingNote}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
