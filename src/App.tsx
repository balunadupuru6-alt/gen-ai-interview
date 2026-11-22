import { useEffect, useState } from 'react';
import BackgroundScene from './components/BackgroundScene';
import DashboardView from './components/DashboardView';
import InterviewView from './components/InterviewView';
import Navbar from './components/Navbar';
import OverviewView from './components/OverviewView';
import ReportView from './components/ReportView';
import SetupView from './components/SetupView';
import type {
  AppView,
  InterviewConfig,
  InterviewQuestion,
  InterviewSession,
  QuestionRecord,
} from './types/interview';
import {
  computeSessionMetrics,
  resolveEffectiveRole,
  validateInterviewConfig,
} from './utils/scoring';
import { deleteSessionById, loadSessions, upsertSession } from './utils/storage';

const DEFAULT_CONFIG: InterviewConfig = {
  role: 'Python Developer',
  customRole: '',
  experience: 'Fresher',
  difficulty: 'Medium',
  type: 'Mixed',
};

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('overview');
  const [sessions, setSessions] = useState<InterviewSession[]>(() => loadSessions());
  const [config, setConfig] = useState<InterviewConfig>(DEFAULT_CONFIG);
  const [activeQuestions, setActiveQuestions] = useState<InterviewQuestion[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(
    () => loadSessions()[0]?.id ?? null,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('autostart') === '1') {
      setActiveView('dashboard');
    }
  }, []);

  const handleNavigate = (view: AppView, scrollTarget?: string) => {
    setSetupError(null);
    setActiveView(view);
    if (scrollTarget) {
      window.setTimeout(() => {
        const el = document.getElementById(scrollTarget);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSelectTrack = (role: string) => {
    setSetupError(null);
    setConfig((prev) => ({ ...prev, role, focusAreas: undefined }));
    setActiveView('setup');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartNewFromDashboard = (focusAreas?: string[]) => {
    setSetupError(null);
    setConfig((prev) => ({
      ...prev,
      focusAreas: focusAreas && focusAreas.length > 0 ? focusAreas : undefined,
    }));
    setActiveView('setup');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenerateInterview = async () => {
    const validationErr = validateInterviewConfig(config);
    if (validationErr) {
      setSetupError(validationErr);
      return;
    }

    setSetupError(null);
    setIsGenerating(true);

    try {
      const response = await fetch('/api/interview/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate mock interview.');
      }

      const generated = Array.isArray(data.questions) ? (data.questions as InterviewQuestion[]) : [];
      if (generated.length === 0) {
        throw new Error('No interview questions were generated. Please try again.');
      }

      setActiveQuestions(generated);
      setActiveView('interview');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : 'Unable to generate interview.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCompleteSession = async (records: QuestionRecord[]) => {
    const metrics = computeSessionMetrics(records);
    const effectiveRole = resolveEffectiveRole(config);
    const now = new Date();

    const displayDate = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const shortDate = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    const summaryRes = await fetch('/api/interview/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, records }),
    });

    const summaryData = await summaryRes.json();
    if (!summaryRes.ok) {
      throw new Error(summaryData.error || 'Failed to synthesize final report summary.');
    }

    const completedSession: InterviewSession = {
      id: `session-${now.getTime()}`,
      createdAt: now.toISOString(),
      displayDate,
      shortDate,
      isBenchmark: false,
      config: {
        ...config,
        role: effectiveRole,
      },
      records,
      metrics,
      headlineSummary: summaryData.headlineSummary,
      skillsToImprove: summaryData.skillsToImprove,
      recommendations: summaryData.recommendations,
    };

    const updated = upsertSession(completedSession);
    setSessions(updated);
    setSelectedReportId(completedSession.id);
    setActiveView('report');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInspectReport = (sessionId: string) => {
    setSelectedReportId(sessionId);
    setActiveView('report');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteSession = (sessionId: string) => {
    const updated = deleteSessionById(sessionId);
    setSessions(updated);
    if (selectedReportId === sessionId) {
      setSelectedReportId(updated[0]?.id ?? null);
    }
  };

  const selectedSession =
    sessions.find((s) => s.id === selectedReportId) ?? sessions[0] ?? null;

  return (
    <div data-view={activeView} className="relative min-h-screen bg-[#070608] text-zinc-100">
      <BackgroundScene />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Navbar activeView={activeView} onNavigate={handleNavigate} />

        <main className="flex-1">
          {activeView === 'overview' && (
            <OverviewView
              onNavigate={handleNavigate}
              onSelectTrack={handleSelectTrack}
            />
          )}

          {activeView === 'dashboard' && (
            <DashboardView
              sessions={sessions}
              onStartNew={handleStartNewFromDashboard}
              onInspectReport={handleInspectReport}
              onDeleteSession={handleDeleteSession}
            />
          )}

          {activeView === 'setup' && (
            <SetupView
              config={config}
              isGenerating={isGenerating}
              error={setupError}
              onChangeConfig={setConfig}
              onGenerate={handleGenerateInterview}
              onBackToDashboard={() => handleNavigate('dashboard')}
            />
          )}

          {activeView === 'interview' && (
            <InterviewView
              config={config}
              questions={activeQuestions}
              onCompleteSession={handleCompleteSession}
              onExitToSetup={() => handleNavigate('setup')}
            />
          )}

          {activeView === 'report' && selectedSession && (
            <ReportView
              session={selectedSession}
              onRetryInterview={() => {
                setConfig({
                  role: selectedSession.config.role,
                  experience: selectedSession.config.experience,
                  difficulty: selectedSession.config.difficulty,
                  type: selectedSession.config.type,
                });
                setActiveView('setup');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onPracticeWeakAreas={(skills) => {
                setConfig({
                  role: selectedSession.config.role,
                  experience: selectedSession.config.experience,
                  difficulty: selectedSession.config.difficulty,
                  type: selectedSession.config.type,
                  focusAreas: skills,
                });
                setActiveView('setup');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onBackToDashboard={() => handleNavigate('dashboard')}
            />
          )}

          {activeView === 'report' && !selectedSession && (
            <div className="mx-auto max-w-2xl px-6 py-24 text-center">
              <h1 className="font-display text-2xl font-bold text-white">No Report Selected</h1>
              <p className="mt-2 text-sm text-zinc-400">
                Complete a mock interview or select a saved session from your dashboard.
              </p>
              <button
                type="button"
                onClick={() => handleNavigate('dashboard')}
                className="mt-6 cursor-pointer rounded-lg bg-rose-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-600"
              >
                Return to Dashboard
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
