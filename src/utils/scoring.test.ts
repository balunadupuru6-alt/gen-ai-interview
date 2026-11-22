import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampScore,
  computeDashboardKPIs,
  computeSessionMetrics,
  generateMarkdownReport,
  getStrongestAndWeakest,
  validateAnswerInput,
  validateInterviewConfig,
} from './scoring';
import type { InterviewSession, QuestionRecord } from '../types/interview';

function makeRecord(
  index: number,
  category: 'Technical' | 'HR',
  score: number,
  technicalAccuracy: number,
  clarity: number,
  confidence: number,
): QuestionRecord {
  return {
    question: {
      id: `q-${index}`,
      index,
      category,
      topic: `Topic ${index}`,
      prompt: `Sample question ${index}?`,
      hint: `Think about topic ${index}.`,
      keyExpectations: ['Clarity', 'Depth'],
    },
    answer: 'Detailed structured candidate answer covering trade-offs and metrics.',
    durationSeconds: 65,
    evaluation: {
      score,
      technicalAccuracy,
      clarity,
      confidence,
      strengths: ['Good structure'],
      gaps: ['Missing edge case'],
      improvements: ['Mention concrete benchmark'],
      sampleAnswer: 'Model answer example.',
      coachingNote: 'Strong pacing.',
    },
  };
}

test('clampScore bounds values between 0 and 10 with 1 decimal precision', () => {
  assert.equal(clampScore(12.4), 10);
  assert.equal(clampScore(-2), 0);
  assert.equal(clampScore(8.349), 8.3);
  assert.equal(clampScore(Number.NaN), 0);
});

test('computeSessionMetrics computes accurate Mixed 3+2 scores', () => {
  const records: QuestionRecord[] = [
    makeRecord(1, 'Technical', 8.8, 9.0, 8.6, 8.2),
    makeRecord(2, 'Technical', 8.4, 8.5, 8.4, 8.0),
    makeRecord(3, 'Technical', 7.2, 7.5, 7.8, 7.6),
    makeRecord(4, 'HR', 8.6, 8.0, 8.8, 8.4),
    makeRecord(5, 'HR', 8.5, 8.0, 8.4, 7.8),
  ];

  const metrics = computeSessionMetrics(records);
  assert.equal(metrics.totalScore, 41.5);
  assert.equal(metrics.averageScore, 8.3);
  assert.equal(metrics.technicalScore, 8.3);
  assert.equal(metrics.hrScore, 8.6);
  assert.equal(metrics.communicationScore, 8.4);
  assert.equal(metrics.confidenceScore, 8.0);
});

test('computeSessionMetrics handles empty records safely', () => {
  const empty = computeSessionMetrics([]);
  assert.equal(empty.totalScore, 0);
  assert.equal(empty.averageScore, 0);
});

test('computeDashboardKPIs aggregates completed sessions and chronological series', () => {
  const s1: InterviewSession = {
    id: 's1',
    createdAt: '2026-11-14T10:00:00.000Z',
    displayDate: 'Nov 14, 2026',
    shortDate: 'Nov 14',
    config: {
      role: 'Python Developer',
      experience: 'Fresher',
      difficulty: 'Medium',
      type: 'Mixed',
    },
    records: [],
    metrics: {
      totalScore: 38.5,
      averageScore: 7.7,
      technicalScore: 7.8,
      hrScore: 7.6,
      communicationScore: 8.0,
      confidenceScore: 7.6,
    },
    headlineSummary: 'Good baseline.',
    skillsToImprove: ['Asyncio'],
    recommendations: ['Practice paginated REST endpoints.'],
  };

  const s2: InterviewSession = {
    id: 's2',
    createdAt: '2026-11-17T10:00:00.000Z',
    displayDate: 'Nov 17, 2026',
    shortDate: 'Nov 17',
    config: {
      role: 'Frontend Developer',
      experience: 'Fresher',
      difficulty: 'Medium',
      type: 'Mixed',
    },
    records: [],
    metrics: {
      totalScore: 41.5,
      averageScore: 8.3,
      technicalScore: 8.4,
      hrScore: 8.1,
      communicationScore: 8.4,
      confidenceScore: 8.0,
    },
    headlineSummary: 'Strong clarity.',
    skillsToImprove: ['INP profiling'],
    recommendations: ['Review browser rendering pipeline.'],
  };

  const kpis = computeDashboardKPIs([s2, s1]);
  assert.equal(kpis.completedCount, 2);
  assert.equal(kpis.overallMean, 8.0);
  assert.equal(kpis.technicalPct, 81);
  assert.equal(kpis.communicationPct, 82);
  assert.equal(kpis.confidencePct, 78);
  assert.deepEqual(
    kpis.progressSeries.map((p) => p.label),
    ['Nov 14', 'Nov 17'],
  );
  assert.equal(kpis.topRecommendations[0], 'Review browser rendering pipeline.');
});

test('getStrongestAndWeakest sorts records without mutating input array', () => {
  const records = [
    makeRecord(1, 'Technical', 6.5, 6.5, 7, 7),
    makeRecord(2, 'Technical', 9.2, 9.2, 9, 9),
    makeRecord(3, 'HR', 7.9, 8, 8, 8),
  ];
  const { strongest, weakest } = getStrongestAndWeakest(records);
  assert.equal(strongest[0].question.index, 2);
  assert.equal(weakest[0].question.index, 1);
  assert.equal(records[0].question.index, 1);
});

test('validateInterviewConfig and validateAnswerInput reject invalid inputs', () => {
  assert.ok(
    validateInterviewConfig({
      role: 'Custom Job Role',
      customRole: ' ',
      experience: 'Fresher',
      difficulty: 'Medium',
      type: 'Mixed',
    }),
  );
  assert.equal(
    validateInterviewConfig({
      role: 'Custom Job Role',
      customRole: 'DevOps Engineer',
      experience: 'Experienced',
      difficulty: 'Hard',
      type: 'Technical',
    }),
    null,
  );
  assert.ok(validateAnswerInput(''));
  assert.ok(validateAnswerInput('short'));
  assert.equal(validateAnswerInput('React reconciliation compares virtual DOM trees efficiently.'), null);
});

test('generateMarkdownReport includes score table and question breakdowns', () => {
  const records = [makeRecord(1, 'Technical', 8.8, 9.0, 8.6, 8.4)];
  const session: InterviewSession = {
    id: 's-md',
    createdAt: '2026-11-17T10:00:00.000Z',
    displayDate: 'Nov 17, 2026',
    shortDate: 'Nov 17',
    config: {
      role: 'Frontend Developer',
      experience: 'Fresher',
      difficulty: 'Medium',
      type: 'Mixed',
    },
    records,
    metrics: computeSessionMetrics(records),
    headlineSummary: 'Strong clarity across rendering questions.',
    skillsToImprove: ['Core Web Vitals'],
    recommendations: ['Profile INP in Chrome DevTools.'],
  };

  const md = generateMarkdownReport(session);
  assert.match(md, /# AetherPrep AI — Interview Performance Report/);
  assert.match(md, /Frontend Developer/);
  assert.match(md, /Question 1 · Technical/);
  assert.match(md, /Profile INP in Chrome DevTools/);
});
