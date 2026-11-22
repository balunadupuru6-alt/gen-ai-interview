import { ArrowLeft, Loader2, Sparkles, X } from 'lucide-react';
import { CAREER_TRACKS } from '../data/seedSessions';
import type {
  DifficultyLevel,
  ExperienceLevel,
  InterviewConfig,
  InterviewType,
} from '../types/interview';
import { resolveEffectiveRole } from '../utils/scoring';
import InterviewerOrb from './InterviewerOrb';

interface SetupViewProps {
  config: InterviewConfig;
  isGenerating: boolean;
  error: string | null;
  onChangeConfig: (next: InterviewConfig) => void;
  onGenerate: () => void;
  onBackToDashboard: () => void;
}

export default function SetupView({
  config,
  isGenerating,
  error,
  onChangeConfig,
  onGenerate,
  onBackToDashboard,
}: SetupViewProps) {
  const effectiveRole = resolveEffectiveRole(config) || 'Custom Role';

  const experienceOptions: ExperienceLevel[] = ['Fresher', 'Experienced'];
  const difficultyOptions: DifficultyLevel[] = ['Easy', 'Medium', 'Hard'];
  const typeOptions: Array<{ id: InterviewType; description: string }> = [
    { id: 'Mixed', description: '3 Technical + 2 HR questions' },
    { id: 'Technical', description: '5 Role-specific technical questions' },
    { id: 'HR', description: '5 Behavioral & situational questions' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 pb-20 pt-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBackToDashboard}
          className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-300 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Back to Dashboard</span>
        </button>
        <span className="font-mono text-xs text-rose-300">5-Question Adaptive Session</span>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-12">
        {/* Main Configuration Form */}
        <section className="rounded-xl border border-rose-500/20 bg-[#0d0a0f]/95 p-7 lg:col-span-8">
          <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Configure Your Mock Interview
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Tailor the role, seniority, difficulty, and interview format. Your AI interviewer generates 5 custom questions in real time.
          </p>

          {config.focusAreas && config.focusAreas.length > 0 && (
            <div className="mt-5 flex items-start justify-between gap-3 rounded-lg border border-rose-500/35 bg-rose-950/35 p-3.5 text-xs">
              <div>
                <div className="font-semibold text-rose-200">Targeted Focus Mode Active</div>
                <div className="mt-1 text-zinc-300">
                  Prioritizing: {config.focusAreas.slice(0, 3).join(' · ')}
                </div>
              </div>
              <button
                type="button"
                aria-label="Clear targeted focus areas"
                onClick={() => onChangeConfig({ ...config, focusAreas: undefined })}
                className="cursor-pointer rounded p-1 text-zinc-400 hover:bg-zinc-900 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* 1. Target Job Role */}
          <fieldset className="mt-7">
            <legend className="text-xs font-semibold text-zinc-200">1. Target Job Role</legend>
            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {CAREER_TRACKS.map((track) => {
                const selected = config.role === track.role;
                return (
                  <button
                    key={track.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChangeConfig({ ...config, role: track.role })}
                    className={`cursor-pointer rounded-lg border px-3.5 py-3 text-left text-xs font-medium transition-colors ${
                      selected
                        ? 'border-rose-500 bg-rose-950/60 text-white'
                        : 'border-zinc-800 bg-zinc-950/80 text-zinc-300 hover:border-zinc-700 hover:text-white'
                    }`}
                  >
                    {track.role}
                  </button>
                );
              })}
            </div>

            {config.role === 'Custom Job Role' && (
              <div className="mt-3">
                <label
                  htmlFor="custom-role-input"
                  className="block text-xs font-medium text-zinc-300"
                >
                  Enter Custom Job Title
                </label>
                <input
                  id="custom-role-input"
                  type="text"
                  value={config.customRole ?? ''}
                  onChange={(e) => onChangeConfig({ ...config, customRole: e.target.value })}
                  placeholder="e.g., Cloud Security Engineer, Product Manager, ML Engineer"
                  className="mt-1.5 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            )}
          </fieldset>

          {/* 2. Experience & 3. Difficulty */}
          <div className="mt-7 grid gap-6 sm:grid-cols-2">
            <fieldset>
              <legend className="text-xs font-semibold text-zinc-200">2. Experience Level</legend>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {experienceOptions.map((exp) => {
                  const selected = config.experience === exp;
                  return (
                    <button
                      key={exp}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onChangeConfig({ ...config, experience: exp })}
                      className={`cursor-pointer rounded-lg border px-3.5 py-2.5 text-xs font-medium transition-colors ${
                        selected
                          ? 'border-rose-500 bg-rose-950/60 text-white'
                          : 'border-zinc-800 bg-zinc-950/80 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {exp}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-xs font-semibold text-zinc-200">
                3. Interview Difficulty
              </legend>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {difficultyOptions.map((diff) => {
                  const selected = config.difficulty === diff;
                  return (
                    <button
                      key={diff}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => onChangeConfig({ ...config, difficulty: diff })}
                      className={`cursor-pointer rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors ${
                        selected
                          ? 'border-rose-500 bg-rose-950/60 text-white'
                          : 'border-zinc-800 bg-zinc-950/80 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {diff}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          </div>

          {/* 4. Interview Type */}
          <fieldset className="mt-7">
            <legend className="text-xs font-semibold text-zinc-200">4. Interview Type</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {typeOptions.map((opt) => {
                const selected = config.type === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChangeConfig({ ...config, type: opt.id })}
                    className={`cursor-pointer rounded-lg border p-3.5 text-left transition-colors ${
                      selected
                        ? 'border-rose-500 bg-rose-950/60 text-white'
                        : 'border-zinc-800 bg-zinc-950/80 text-zinc-300 hover:border-zinc-700'
                    }`}
                  >
                    <div className="text-sm font-semibold">{opt.id}</div>
                    <div className="mt-1 text-xs leading-snug text-zinc-400">{opt.description}</div>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-lg border border-rose-500/60 bg-rose-950/50 px-4 py-3 text-xs text-rose-200"
            >
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={isGenerating}
            onClick={onGenerate}
            className="mt-7 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-rose-700 px-6 py-3.5 font-display text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Generating 5 Custom Questions...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>Generate Interview</span>
              </>
            )}
          </button>
        </section>

        {/* Right Calibration Panel */}
        <aside className="rounded-xl border border-rose-500/20 bg-[#0d0a0f]/95 p-6 lg:col-span-4">
          <div className="text-xs font-medium text-rose-300">AI Interviewer Calibration</div>

          <InterviewerOrb
            state={isGenerating ? 'generating' : 'idle'}
            sizeClass="my-4 h-56 w-full"
          />

          <dl className="space-y-3 border-t border-zinc-800/80 pt-4 text-xs">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-zinc-400">Role</dt>
              <dd className="truncate font-medium text-white">{effectiveRole}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-zinc-400">Experience</dt>
              <dd className="font-medium text-white">{config.experience}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-zinc-400">Difficulty</dt>
              <dd className="font-medium text-white">{config.difficulty}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-zinc-400">Format</dt>
              <dd className="font-medium text-rose-300">{config.type} (5 Qs)</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}
