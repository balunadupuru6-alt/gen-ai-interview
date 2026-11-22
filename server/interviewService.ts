import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const PRIMARY_MODEL = 'gemini-4-hydrogen';
const FALLBACK_MODEL = 'gemini-3.1-flash-lite';

export class ServiceError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function clamp(n: number, min = 0, max = 10): number {
  if (!Number.isFinite(n)) return min;
  return Math.round(Math.min(max, Math.max(min, n)) * 10) / 10;
}

export function extractReadableError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) {
      return String(parsed.error.message);
    }
  } catch {
    // Not raw JSON
  }
  return raw || fallback;
}

function parseModelJson<T>(rawText: string | undefined, fallbackValue: string): T {
  const cleaned = (rawText ?? fallbackValue)
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  return JSON.parse(cleaned || fallbackValue) as T;
}

async function generateWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: string;
    systemInstruction: string;
    responseSchema: Record<string, unknown>;
  },
) {
  const attempts: Array<{ model: string; useThinking: boolean; timeoutMs: number }> = [
    { model: PRIMARY_MODEL, useThinking: true, timeoutMs: 10_000 },
    { model: FALLBACK_MODEL, useThinking: false, timeoutMs: 15_000 },
    { model: FALLBACK_MODEL, useThinking: false, timeoutMs: 15_000 },
  ];

  let lastError: unknown;
  for (let i = 0; i < attempts.length; i++) {
    const { model, useThinking, timeoutMs } = attempts[i];
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort(new Error(`Model ${model} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    try {
      return await ai.models.generateContent({
        model,
        contents: params.contents,
        config: {
          abortSignal: controller.signal,
          systemInstruction: params.systemInstruction,
          ...(useThinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
          responseMimeType: 'application/json',
          responseSchema: params.responseSchema,
        },
      });
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err ?? '');
      const isTransient =
        controller.signal.aborted ||
        /503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|abort|timed out|timeout|ETIMEDOUT|ECONNRESET/i.test(
          msg,
        );
      if (!isTransient || i === attempts.length - 1) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * (i + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

export async function generateInterviewQuestions(body: Record<string, unknown>) {
  const ai = getGeminiClient();
  if (!ai) {
    throw new ServiceError(
      503,
      'Gemini API key is not configured. Add GEMINI_API_KEY in Settings > Secrets to run live AI interviews.',
    );
  }

  const { role, customRole, experience, difficulty, type, focusAreas } = body ?? {};
  const effectiveRole =
    role === 'Custom Job Role' ? String(customRole ?? '').trim() : String(role ?? '').trim();

  if (!effectiveRole || effectiveRole.length < 2) {
    throw new ServiceError(400, 'Please specify a valid target job role.');
  }

  const expLabel =
    experience === 'Experienced' ? 'Experienced (2-5+ years)' : 'Fresher (entry-level / 0-1 years)';
  const diffLabel = ['Easy', 'Medium', 'Hard'].includes(String(difficulty))
    ? String(difficulty)
    : 'Medium';
  const interviewType = ['Mixed', 'Technical', 'HR'].includes(String(type))
    ? String(type)
    : 'Mixed';

  const splitInstruction =
    interviewType === 'Mixed'
      ? 'Generate exactly 5 questions: Questions 1, 2, and 3 MUST have category "Technical", and Questions 4 and 5 MUST have category "HR".'
      : interviewType === 'Technical'
        ? 'Generate exactly 5 questions: ALL 5 questions MUST have category "Technical".'
        : 'Generate exactly 5 questions: ALL 5 questions MUST have category "HR".';

  const focusInstruction =
    Array.isArray(focusAreas) && focusAreas.length > 0
      ? `Prioritize targeting these weak areas from previous rounds: ${focusAreas.slice(0, 5).join(', ')}.`
      : '';

  const prompt = `Create a realistic 5-question mock interview for:
- Target Role: ${effectiveRole}
- Candidate Seniority: ${expLabel}
- Difficulty: ${diffLabel}
- Format: ${interviewType}
${splitInstruction}
${focusInstruction}

Requirements:
1. Tailor depth, terminology, and scenario realism strictly to ${effectiveRole} at ${expLabel} level and ${diffLabel} difficulty.
2. Each question must have a concise 2-4 word topic, a clear direct interview question prompt, a short constructive hint (1 sentence), and 2-3 keyExpectations that an interviewer listens for.
3. Avoid generic trivia; ask practical, diagnostic questions.`;

  const response = await generateWithFallback(ai, {
    contents: prompt,
    systemInstruction:
      'You are a principal technical & behavioral interviewer designing rigorous, realistic 5-question mock interviews. Return strictly valid JSON matching the schema.',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              index: { type: Type.INTEGER },
              category: { type: Type.STRING, description: 'Either "Technical" or "HR"' },
              topic: { type: Type.STRING },
              prompt: { type: Type.STRING },
              hint: { type: Type.STRING },
              keyExpectations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ['index', 'category', 'topic', 'prompt', 'hint', 'keyExpectations'],
          },
        },
      },
      required: ['questions'],
    },
  });

  const parsed = parseModelJson<{ questions?: Array<Record<string, unknown>> }>(response.text, '{}');
  const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions.slice(0, 5) : [];

  if (rawQuestions.length !== 5) {
    throw new ServiceError(502, 'AI did not return a complete 5-question interview set. Please try again.');
  }

  return rawQuestions.map((q: Record<string, unknown>, idx: number) => {
    const expectedCategory =
      interviewType === 'Technical'
        ? 'Technical'
        : interviewType === 'HR'
          ? 'HR'
          : idx < 3
            ? 'Technical'
            : 'HR';

    return {
      id: `q-${Date.now()}-${idx + 1}`,
      index: idx + 1,
      category: q.category === 'HR' || q.category === 'Technical' ? q.category : expectedCategory,
      topic: String(q.topic ?? `Topic ${idx + 1}`),
      prompt: String(q.prompt ?? ''),
      hint: String(q.hint ?? ''),
      keyExpectations: Array.isArray(q.keyExpectations)
        ? q.keyExpectations.map(String).slice(0, 4)
        : [],
    };
  });
}

export async function evaluateInterviewAnswer(body: Record<string, unknown>) {
  const ai = getGeminiClient();
  if (!ai) {
    throw new ServiceError(
      503,
      'Gemini API key is not configured. Add GEMINI_API_KEY in Settings > Secrets to evaluate answers.',
    );
  }

  const config = (body.config ?? {}) as Record<string, unknown>;
  const question = (body.question ?? {}) as Record<string, unknown>;
  const trimmedAnswer = String(body.answer ?? '').trim();
  const history = body.history;

  if (!question?.prompt || trimmedAnswer.length < 15) {
    throw new ServiceError(
      400,
      'A valid question and an answer of at least 15 characters are required.',
    );
  }

  const priorContext =
    Array.isArray(history) && history.length > 0
      ? history
          .map(
            (h: { topic?: string; score?: number; coachingNote?: string }, i: number) =>
              `Q${i + 1} (${h.topic ?? 'Topic'}): scored ${h.score ?? '-'}/10 — ${h.coachingNote ?? ''}`,
          )
          .join('\n')
      : 'No prior answers in this session yet.';

  const prompt = `Evaluate this mock interview answer with honest, uninflated calibration.

Interview Context:
- Role: ${config?.role === 'Custom Job Role' ? config?.customRole : config?.role}
- Seniority: ${config?.experience ?? 'Fresher'}
- Difficulty: ${config?.difficulty ?? 'Medium'}
- Question #${question.index} (${question.category} · ${question.topic}):
"${question.prompt}"
- Key Expectations: ${Array.isArray(question.keyExpectations) ? question.keyExpectations.join('; ') : ''}

Prior Session Context (for continuity):
${priorContext}

Candidate Answer:
"${trimmedAnswer}"

Scoring Rubric (strict & honest, 0.0 to 10.0):
- 0.0–3.5: Incorrect, off-topic, placeholder/gibberish, or severely incomplete.
- 3.6–5.9: Partially right intuition but misses core mechanisms, trade-offs, or STAR structure.
- 6.0–7.9: Solid fundamentals with minor omissions or lack of concrete examples/metrics.
- 8.0–9.4: Strong, structured, technically accurate, and well-communicated with clear trade-offs.
- 9.5–10.0: Exceptional principal-level clarity and depth.

Provide a structured 6-part evaluation:
1. score (0-10), technicalAccuracy (0-10), clarity (0-10), confidence (0-10)
2. strengths (2-3 crisp bullets)
3. gaps (1-3 concrete missing points or inaccuracies)
4. improvements (1-3 actionable steps)
5. sampleAnswer (concise model answer in 2-4 sentences)
6. coachingNote (1 encouraging, specific interviewer remark referencing session flow)`;

  const response = await generateWithFallback(ai, {
    contents: prompt,
    systemInstruction:
      'You are a candid, supportive senior hiring bar-raiser evaluating interview answers. Never inflate weak or off-topic answers. Return valid JSON matching the schema.',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        score: { type: Type.NUMBER },
        technicalAccuracy: { type: Type.NUMBER },
        clarity: { type: Type.NUMBER },
        confidence: { type: Type.NUMBER },
        strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
        gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
        improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
        sampleAnswer: { type: Type.STRING },
        coachingNote: { type: Type.STRING },
      },
      required: [
        'score',
        'technicalAccuracy',
        'clarity',
        'confidence',
        'strengths',
        'gaps',
        'improvements',
        'sampleAnswer',
        'coachingNote',
      ],
    },
  });

  const raw = parseModelJson<Record<string, unknown>>(response.text, '{}');
  return {
    score: clamp(Number(raw.score)),
    technicalAccuracy: clamp(Number(raw.technicalAccuracy)),
    clarity: clamp(Number(raw.clarity)),
    confidence: clamp(Number(raw.confidence)),
    strengths: Array.isArray(raw.strengths) ? raw.strengths.map(String).slice(0, 4) : [],
    gaps: Array.isArray(raw.gaps) ? raw.gaps.map(String).slice(0, 4) : [],
    improvements: Array.isArray(raw.improvements) ? raw.improvements.map(String).slice(0, 4) : [],
    sampleAnswer: String(raw.sampleAnswer ?? ''),
    coachingNote: String(raw.coachingNote ?? ''),
  };
}

export async function summarizeInterviewSession(body: Record<string, unknown>) {
  const ai = getGeminiClient();
  if (!ai) {
    throw new ServiceError(
      503,
      'Gemini API key is not configured. Add GEMINI_API_KEY in Settings > Secrets.',
    );
  }

  const config = (body.config ?? {}) as Record<string, unknown>;
  const records = body.records;
  if (!Array.isArray(records) || records.length === 0) {
    throw new ServiceError(400, 'Completed question records are required.');
  }

  const transcriptSummary = records
    .map(
      (r: {
        question?: { index?: number; category?: string; topic?: string };
        evaluation?: { score?: number; gaps?: string[]; improvements?: string[] };
      }) =>
        `Q${r.question?.index} (${r.question?.category} - ${r.question?.topic}): ${r.evaluation?.score}/10. Gaps: ${(r.evaluation?.gaps ?? []).join('; ')}`,
    )
    .join('\n');

  const prompt = `Synthesize a final interview readiness assessment for ${
    config?.role === 'Custom Job Role' ? config?.customRole : config?.role
  } (${config?.experience}, ${config?.difficulty}):

${transcriptSummary}

Return:
1. headlineSummary: 1-2 crisp sentences summarizing overall readiness and key pattern.
2. skillsToImprove: 2-4 short specific skill/topic names needing focus.
3. recommendations: 2-4 concrete, actionable study/practice steps.`;

  const response = await generateWithFallback(ai, {
    contents: prompt,
    systemInstruction:
      'You synthesize concise, actionable post-interview coaching plans. Return valid JSON matching the schema.',
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        headlineSummary: { type: Type.STRING },
        skillsToImprove: { type: Type.ARRAY, items: { type: Type.STRING } },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['headlineSummary', 'skillsToImprove', 'recommendations'],
    },
  });

  const raw = parseModelJson<Record<string, unknown>>(response.text, '{}');
  return {
    headlineSummary: String(raw.headlineSummary ?? 'Interview session completed.'),
    skillsToImprove: Array.isArray(raw.skillsToImprove) ? raw.skillsToImprove.map(String).slice(0, 4) : [],
    recommendations: Array.isArray(raw.recommendations) ? raw.recommendations.map(String).slice(0, 4) : [],
  };
}
