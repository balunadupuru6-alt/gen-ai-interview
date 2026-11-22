import type {
  DashboardKPIs,
  InterviewConfig,
  InterviewSession,
  QuestionRecord,
  SessionMetrics,
} from '../types/interview';

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export function clampScore(value: number, min = 0, max = 10): number {
  if (!Number.isFinite(value)) return min;
  return roundOneDecimal(Math.min(max, Math.max(min, value)));
}

export function computeSessionMetrics(records: QuestionRecord[]): SessionMetrics {
  if (records.length === 0) {
    return {
      totalScore: 0,
      averageScore: 0,
      technicalScore: 0,
      hrScore: 0,
      communicationScore: 0,
      confidenceScore: 0,
    };
  }

  const totalRaw = records.reduce((sum, r) => sum + clampScore(r.evaluation.score), 0);
  const averageScore = roundOneDecimal(totalRaw / records.length);
  const totalScore = roundOneDecimal(totalRaw);

  const techRecords = records.filter((r) => r.question.category === 'Technical');
  const hrRecords = records.filter((r) => r.question.category === 'HR');

  const technicalScore =
    techRecords.length > 0
      ? roundOneDecimal(
          techRecords.reduce((sum, r) => sum + clampScore(r.evaluation.technicalAccuracy), 0) /
            techRecords.length,
        )
      : averageScore;

  const hrScore =
    hrRecords.length > 0
      ? roundOneDecimal(
          hrRecords.reduce((sum, r) => sum + clampScore(r.evaluation.score), 0) / hrRecords.length,
        )
      : roundOneDecimal(
          records.reduce((sum, r) => sum + clampScore(r.evaluation.clarity), 0) / records.length,
        );

  const communicationScore = roundOneDecimal(
    records.reduce((sum, r) => sum + clampScore(r.evaluation.clarity), 0) / records.length,
  );

  const confidenceScore = roundOneDecimal(
    records.reduce((sum, r) => sum + clampScore(r.evaluation.confidence), 0) / records.length,
  );

  return {
    totalScore,
    averageScore,
    technicalScore,
    hrScore,
    communicationScore,
    confidenceScore,
  };
}

export function computeDashboardKPIs(sessions: InterviewSession[]): DashboardKPIs {
  if (sessions.length === 0) {
    return {
      completedCount: 0,
      overallMean: 0,
      technicalPct: 0,
      communicationPct: 0,
      confidencePct: 0,
      progressSeries: [],
      topRecommendations: [
        'Complete your first 5-question mock interview to unlock tailored focus areas.',
        'Use Mixed mode (3 Technical + 2 HR) for balanced engineering readiness.',
      ],
    };
  }

  const n = sessions.length;
  const overallMean = roundOneDecimal(
    sessions.reduce((sum, s) => sum + s.metrics.averageScore, 0) / n,
  );
  const technicalPct = Math.round(
    (sessions.reduce((sum, s) => sum + s.metrics.technicalScore, 0) / n) * 10,
  );
  const communicationPct = Math.round(
    (sessions.reduce((sum, s) => sum + s.metrics.communicationScore, 0) / n) * 10,
  );
  const confidencePct = Math.round(
    (sessions.reduce((sum, s) => sum + s.metrics.confidenceScore, 0) / n) * 10,
  );

  const orderedAsc = [...sessions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  const progressSeries = orderedAsc.map((s) => ({
    sessionId: s.id,
    label: s.shortDate,
    score: s.metrics.averageScore,
    role: s.config.role,
  }));

  const seen = new Set<string>();
  const topRecommendations: string[] = [];
  for (const session of [...orderedAsc].reverse()) {
    for (const rec of session.recommendations) {
      const normalized = rec.trim();
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        topRecommendations.push(normalized);
      }
      if (topRecommendations.length >= 4) break;
    }
    if (topRecommendations.length >= 4) break;
  }

  return {
    completedCount: n,
    overallMean,
    technicalPct,
    communicationPct,
    confidencePct,
    progressSeries,
    topRecommendations,
  };
}

export function getStrongestAndWeakest(records: QuestionRecord[]): {
  strongest: QuestionRecord[];
  weakest: QuestionRecord[];
} {
  if (records.length === 0) {
    return { strongest: [], weakest: [] };
  }
  const sortedDesc = [...records].sort((a, b) => b.evaluation.score - a.evaluation.score);
  const sortedAsc = [...records].sort((a, b) => a.evaluation.score - b.evaluation.score);

  return {
    strongest: sortedDesc.slice(0, Math.min(2, sortedDesc.length)),
    weakest: sortedAsc.slice(0, Math.min(2, sortedAsc.length)),
  };
}

export function resolveEffectiveRole(config: InterviewConfig): string {
  if (config.role === 'Custom Job Role') {
    return (config.customRole ?? '').trim();
  }
  return config.role.trim();
}

export function validateInterviewConfig(config: InterviewConfig): string | null {
  const effectiveRole = resolveEffectiveRole(config);
  if (!effectiveRole || effectiveRole.length < 2) {
    return 'Please enter a target job role (at least 2 characters) before generating your interview.';
  }
  if (effectiveRole.length > 80) {
    return 'Target job role must be 80 characters or fewer.';
  }
  return null;
}

export function validateAnswerInput(answer: string): string | null {
  const trimmed = answer.trim();
  if (!trimmed) {
    return 'Please write your response before submitting for AI evaluation.';
  }
  if (trimmed.length < 15) {
    return 'Your response is too brief for meaningful scoring (minimum 15 characters).';
  }
  return null;
}

export function generateMarkdownReport(session: InterviewSession): string {
  const lines: string[] = [
    `# AetherPrep AI — Interview Performance Report`,
    ``,
    `- **Target Role:** ${session.config.role}`,
    `- **Experience Level:** ${session.config.experience}`,
    `- **Difficulty:** ${session.config.difficulty}`,
    `- **Format:** ${session.config.type} (${session.records.length} Questions)`,
    `- **Date:** ${session.displayDate}`,
    ``,
    `## Score Summary`,
    ``,
    `| Metric | Score |`,
    `| --- | --- |`,
    `| Total Score | ${session.metrics.totalScore.toFixed(1)} / 50 |`,
    `| Average Score | ${session.metrics.averageScore.toFixed(1)} / 10 |`,
    `| Technical Accuracy | ${session.metrics.technicalScore.toFixed(1)} / 10 |`,
    `| HR Performance | ${session.metrics.hrScore.toFixed(1)} / 10 |`,
    `| Communication Clarity | ${session.metrics.communicationScore.toFixed(1)} / 10 |`,
    `| Confidence | ${session.metrics.confidenceScore.toFixed(1)} / 10 |`,
    ``,
    `## Executive Assessment`,
    ``,
    session.headlineSummary,
    ``,
    `## Skills That Need Improvement`,
    ``,
    ...session.skillsToImprove.map((skill) => `- ${skill}`),
    ``,
    `## Personalized Preparation Recommendations`,
    ``,
    ...session.recommendations.map((rec) => `- ${rec}`),
    ``,
    `## Question-by-Question Breakdown`,
    ``,
  ];

  for (const record of session.records) {
    lines.push(
      `### Question ${record.question.index} · ${record.question.category} (${record.question.topic}) — ${record.evaluation.score.toFixed(1)}/10`,
      ``,
      `**Prompt:** ${record.question.prompt}`,
      ``,
      `**Your Answer:** ${record.answer}`,
      ``,
      `**Strengths:**`,
      ...record.evaluation.strengths.map((s) => `- ${s}`),
      ``,
      `**Gaps:**`,
      ...record.evaluation.gaps.map((g) => `- ${g}`),
      ``,
      `**Improvements:**`,
      ...record.evaluation.improvements.map((imp) => `- ${imp}`),
      ``,
      `**Model Sample Answer:** ${record.evaluation.sampleAnswer}`,
      ``,
      `**Interviewer Coaching Note:** ${record.evaluation.coachingNote}`,
      ``,
    );
  }

  return lines.join('\n');
}
