import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  Loader2,
  Mic,
  MicOff,
  Send,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type {
  AnswerEvaluation,
  InterviewConfig,
  InterviewQuestion,
  OrbState,
  QuestionRecord,
} from '../types/interview';
import { resolveEffectiveRole, validateAnswerInput } from '../utils/scoring';
import { postJson } from '../utils/api';
import InterviewerOrb from './InterviewerOrb';

interface InterviewViewProps {
  config: InterviewConfig;
  questions: InterviewQuestion[];
  onCompleteSession: (records: QuestionRecord[]) => Promise<void>;
  onExitToSetup: () => void;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export default function InterviewView({
  config,
  questions,
  onCompleteSession,
  onExitToSetup,
}: InterviewViewProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [records, setRecords] = useState<QuestionRecord[]>([]);
  const [answerText, setAnswerText] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState<AnswerEvaluation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const currentQuestion = questions[currentIdx];
  const effectiveRole = resolveEffectiveRole(config);

  const speechSupported =
    typeof window !== 'undefined' &&
    Boolean(
      (window as unknown as Record<string, unknown>).SpeechRecognition ||
        (window as unknown as Record<string, unknown>).webkitSpeechRecognition,
    );

  useEffect(() => {
    if (currentEvaluation || isEvaluating || isFinalizing) return;
    const id = window.setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [currentEvaluation, isEvaluating, isFinalizing]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const toggleVoiceInput = () => {
    if (!speechSupported) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const win = window as unknown as Record<string, new () => SpeechRecognitionInstance>;
    const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRec) return;

    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';
    rec.onresult = (event) => {
      let appended = '';
      for (let i = 0; i < event.results.length; i++) {
        appended += event.results[i][0]?.transcript ?? '';
      }
      if (appended.trim()) {
        setAnswerText((prev) => (prev ? `${prev.trim()} ${appended.trim()}` : appended.trim()));
      }
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const orbState: OrbState = isFinalizing
    ? 'generating'
    : isEvaluating
      ? 'evaluating'
      : currentEvaluation
        ? 'feedback'
        : 'idle';

  const handleSubmitAnswer = async () => {
    const validationErr = validateAnswerInput(answerText);
    if (validationErr) {
      setError(validationErr);
      return;
    }
    if (!currentQuestion) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    setError(null);
    setIsEvaluating(true);

    try {
      const data = await postJson<{ evaluation: AnswerEvaluation }>(
        '/api/interview/evaluate',
        {
          config,
          question: currentQuestion,
          answer: answerText.trim(),
          history: records.map((r) => ({
            topic: r.question.topic,
            score: r.evaluation.score,
            coachingNote: r.evaluation.coachingNote,
          })),
        },
      );

      const evaluation: AnswerEvaluation = data.evaluation;
      const newRecord: QuestionRecord = {
        question: currentQuestion,
        answer: answerText.trim(),
        durationSeconds: elapsedSeconds,
        evaluation,
      };
      setRecords((prev) => [...prev, newRecord]);
      setCurrentEvaluation(evaluation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reach AI evaluator.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleAdvance = async () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((prev) => prev + 1);
      setAnswerText('');
      setCurrentEvaluation(null);
      setShowHint(false);
      setError(null);
      setElapsedSeconds(0);
    } else {
      setIsFinalizing(true);
      setError(null);
      try {
        await onCompleteSession(records);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not finalize report.');
        setIsFinalizing(false);
      }
    }
  };

  if (!currentQuestion) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl px-6 pb-20 pt-8">
      {/* Top Progress Strip */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onExitToSetup}
          className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-300 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Exit to Setup</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5" aria-label="Question progress">
            {questions.map((q, idx) => {
              const completed = idx < records.length;
              const active = idx === currentIdx;
              return (
                <div
                  key={q.id}
                  className={`h-2 w-8 rounded-full transition-colors ${
                    completed
                      ? 'bg-rose-500'
                      : active
                        ? 'bg-white'
                        : 'bg-zinc-800'
                  }`}
                />
              );
            })}
          </div>
          <span className="font-mono text-xs tabular-nums text-zinc-300">
            Q{currentIdx + 1} / {questions.length}
          </span>
          <span aria-hidden="true" className="text-zinc-700">
            ·
          </span>
          <span className="font-mono text-xs tabular-nums text-rose-300">
            {formatTimer(elapsedSeconds)}
          </span>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Main Question & Answer / Evaluation Column */}
        <section className="rounded-xl border border-rose-500/20 bg-[#0d0a0f]/95 p-7 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-rose-300">{currentQuestion.category}</span>
              <span aria-hidden="true" className="text-zinc-600">
                ·
              </span>
              <span className="text-zinc-300">{currentQuestion.topic}</span>
            </div>
            <span className="text-zinc-400">
              {effectiveRole} · {config.experience} · {config.difficulty}
            </span>
          </div>

          <h1 className="mt-4 font-display text-xl font-bold leading-snug text-white sm:text-2xl">
            {currentQuestion.prompt}
          </h1>

          <div className="mt-4">
            <button
              type="button"
              aria-expanded={showHint}
              onClick={() => setShowHint((prev) => !prev)}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-rose-300"
            >
              <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{showHint ? 'Hide Interviewer Hint' : 'Show Interviewer Hint'}</span>
            </button>
            {showHint && (
              <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-950/80 px-4 py-2.5 text-xs text-zinc-300">
                {currentQuestion.hint}
              </div>
            )}
          </div>

          {!currentEvaluation ? (
            <div className="mt-6">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="interview-answer-input"
                  className="text-xs font-semibold text-zinc-200"
                >
                  Your Interview Response
                </label>
                {speechSupported && (
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      isListening
                        ? 'border-rose-500 bg-rose-950/60 text-rose-200'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    {isListening ? (
                      <>
                        <MicOff className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Stop Dictation</span>
                      </>
                    ) : (
                      <>
                        <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Voice Input</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <textarea
                id="interview-answer-input"
                rows={7}
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                disabled={isEvaluating}
                placeholder="Explain your reasoning clearly—cover core concepts, trade-offs, or STAR outcomes..."
                className="mt-2 w-full rounded-xl border border-zinc-700/80 bg-zinc-950/90 p-4 text-sm leading-relaxed text-white placeholder:text-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 disabled:opacity-60"
              />

              <div className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                <span>Minimum 15 characters for evaluation</span>
                <span className="font-mono tabular-nums">{answerText.trim().length} chars</span>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-rose-500/60 bg-rose-950/50 px-4 py-3 text-xs text-rose-200"
                >
                  {error}
                </div>
              )}

              <button
                type="button"
                disabled={isEvaluating}
                onClick={handleSubmitAnswer}
                className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isEvaluating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Evaluating Response with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" aria-hidden="true" />
                    <span>Submit Answer</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-5 border-t border-zinc-800/90 pt-6">
              {/* Score Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-rose-500/25 bg-zinc-950/90 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-rose-400" aria-hidden="true" />
                  <div>
                    <div className="text-xs text-zinc-400">Question {currentQuestion.index} Score</div>
                    <div className="font-mono text-2xl font-bold tabular-nums text-white">
                      {currentEvaluation.score.toFixed(1)}{' '}
                      <span className="text-sm font-normal text-zinc-400">/ 10</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-[11px] text-zinc-400">Accuracy</div>
                    <div className="font-mono text-sm font-semibold tabular-nums text-rose-300">
                      {currentEvaluation.technicalAccuracy.toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-zinc-400">Clarity</div>
                    <div className="font-mono text-sm font-semibold tabular-nums text-white">
                      {currentEvaluation.clarity.toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-zinc-400">Confidence</div>
                    <div className="font-mono text-sm font-semibold tabular-nums text-rose-200">
                      {currentEvaluation.confidence.toFixed(1)}
                    </div>
                  </div>
                </div>
              </div>

              {/* 6-Part Breakdown */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
                  <h2 className="text-xs font-semibold text-emerald-300">Strengths</h2>
                  <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-zinc-300">
                    {currentEvaluation.strengths.map((item, i) => (
                      <li key={i}>· {item}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
                  <h2 className="text-xs font-semibold text-rose-300">Gaps &amp; Missing Points</h2>
                  <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-zinc-300">
                    {currentEvaluation.gaps.map((item, i) => (
                      <li key={i}>· {item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
                <h2 className="text-xs font-semibold text-amber-200">Actionable Improvements</h2>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-zinc-300">
                  {currentEvaluation.improvements.map((item, i) => (
                    <li key={i}>· {item}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 p-4">
                <h2 className="text-xs font-semibold text-white">Model Sample Answer</h2>
                <p className="mt-2 text-xs leading-relaxed text-zinc-300">
                  {currentEvaluation.sampleAnswer}
                </p>
              </div>

              <div className="rounded-lg border border-rose-500/20 bg-rose-950/25 p-4">
                <h2 className="text-xs font-semibold text-rose-200">Interviewer Coaching Note</h2>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-200">
                  {currentEvaluation.coachingNote}
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-rose-500/60 bg-rose-950/50 px-4 py-3 text-xs text-rose-200"
                >
                  {error}
                </div>
              )}

              <button
                type="button"
                disabled={isFinalizing}
                onClick={handleAdvance}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-700 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isFinalizing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>Synthesizing Final 3D Readiness Report...</span>
                  </>
                ) : currentIdx + 1 < questions.length ? (
                  <>
                    <span>Next Question</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    <span>Generate Final Report</span>
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>
          )}
        </section>

        {/* Right Live Orb & Session Ledger */}
        <aside className="rounded-xl border border-rose-500/20 bg-[#0d0a0f]/95 p-6 lg:col-span-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-rose-300">AI Interviewer Core</span>
            <span className="font-mono capitalize text-zinc-300">{orbState}</span>
          </div>

          <InterviewerOrb state={orbState} sizeClass="my-4 h-56 w-full" />

          <div className="border-t border-zinc-800/80 pt-4">
            <div className="text-xs font-semibold text-zinc-200">Session Score Ledger</div>
            <div className="mt-3 space-y-2">
              {questions.map((q, idx) => {
                const rec = records[idx];
                const isCurrent = idx === currentIdx;
                return (
                  <div
                    key={q.id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                      isCurrent
                        ? 'border-rose-500/50 bg-rose-950/30 text-white'
                        : 'border-zinc-800/80 bg-zinc-950/60 text-zinc-400'
                    }`}
                  >
                    <span className="truncate">
                      Q{q.index} · {q.category}
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-rose-300">
                      {rec ? `${rec.evaluation.score.toFixed(1)}/10` : isCurrent ? 'Active' : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
