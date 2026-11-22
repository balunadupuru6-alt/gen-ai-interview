export type AppView = 'overview' | 'dashboard' | 'setup' | 'interview' | 'report';

export type ExperienceLevel = 'Fresher' | 'Experienced';
export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';
export type InterviewType = 'Mixed' | 'Technical' | 'HR';
export type QuestionCategory = 'Technical' | 'HR';
export type OrbState = 'idle' | 'generating' | 'evaluating' | 'feedback';

export interface InterviewConfig {
  role: string;
  customRole?: string;
  experience: ExperienceLevel;
  difficulty: DifficultyLevel;
  type: InterviewType;
  focusAreas?: string[];
}

export interface InterviewQuestion {
  id: string;
  index: number;
  category: QuestionCategory;
  topic: string;
  prompt: string;
  hint: string;
  keyExpectations: string[];
}

export interface AnswerEvaluation {
  score: number; // 0 to 10 (1 decimal)
  technicalAccuracy: number; // 0 to 10
  clarity: number; // 0 to 10
  confidence: number; // 0 to 10
  strengths: string[];
  gaps: string[];
  improvements: string[];
  sampleAnswer: string;
  coachingNote: string;
}

export interface QuestionRecord {
  question: InterviewQuestion;
  answer: string;
  durationSeconds: number;
  evaluation: AnswerEvaluation;
}

export interface SessionMetrics {
  totalScore: number; // out of 50
  averageScore: number; // out of 10
  technicalScore: number; // out of 10
  hrScore: number; // out of 10
  communicationScore: number; // out of 10
  confidenceScore: number; // out of 10
}

export interface InterviewSession {
  id: string;
  createdAt: string; // ISO date string
  displayDate: string; // e.g., "Nov 17, 2026"
  shortDate: string; // e.g., "Nov 17"
  isBenchmark?: boolean;
  config: InterviewConfig;
  records: QuestionRecord[];
  metrics: SessionMetrics;
  headlineSummary: string;
  skillsToImprove: string[];
  recommendations: string[];
}

export interface DashboardKPIs {
  completedCount: number;
  overallMean: number; // out of 10
  technicalPct: number; // 0-100
  communicationPct: number; // 0-100
  confidencePct: number; // 0-100
  progressSeries: Array<{
    sessionId: string;
    label: string;
    score: number;
    role: string;
  }>;
  topRecommendations: string[];
}

export interface CareerTrack {
  id: string;
  role: string;
  tagline: string;
  coreTopics: string[];
  isCustom?: boolean;
}
