import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODEL_NAME = 'gemini-4-hydrogen';

function getGeminiClient(): GoogleGenAI | null {
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

function extractReadableError(err: unknown, fallback: string): string {
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

async function callWithRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err ?? '');
      const isTransient = /503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand/i.test(msg);
      if (!isTransient || attempt === maxAttempts) {
        throw err;
      }
      const delayMs = 700 * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      geminiConfigured: Boolean(getGeminiClient()),
    });
  });

  app.post('/api/interview/generate', async (req: Request, res: Response) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Gemini API key is not configured. Add GEMINI_API_KEY in Settings > Secrets to run live AI interviews.',
      });
      return;
    }

    const { role, customRole, experience, difficulty, type, focusAreas } = req.body ?? {};
    const effectiveRole =
      role === 'Custom Job Role' ? String(customRole ?? '').trim() : String(role ?? '').trim();

    if (!effectiveRole || effectiveRole.length < 2) {
      res.status(400).json({ error: 'Please specify a valid target job role.' });
      return;
    }

    const expLabel = experience === 'Experienced' ? 'Experienced (2-5+ years)' : 'Fresher (entry-level / 0-1 years)';
    const diffLabel = ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium';
    const interviewType = ['Mixed', 'Technical', 'HR'].includes(type) ? type : 'Mixed';

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

    try {
      const response = await callWithRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            systemInstruction:
              'You are a principal technical & behavioral interviewer designing rigorous, realistic 5-question mock interviews. Return strictly valid JSON matching the schema.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
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
          },
        }),
      );

      const parsed = JSON.parse((response.text ?? '{}').trim());
      const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions.slice(0, 5) : [];

      if (rawQuestions.length !== 5) {
        res.status(502).json({ error: 'AI did not return a complete 5-question interview set. Please try again.' });
        return;
      }

      const questions = rawQuestions.map((q: Record<string, unknown>, idx: number) => {
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

      res.json({ questions });
    } catch (err) {
      const message = extractReadableError(err, 'Failed to generate interview questions.');
      console.error('Error generating interview:', err);
      res.status(503).json({ error: message });
    }
  });

  app.post('/api/interview/evaluate', async (req: Request, res: Response) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Gemini API key is not configured. Add GEMINI_API_KEY in Settings > Secrets to evaluate answers.',
      });
      return;
    }

    const { config, question, answer, history } = req.body ?? {};
    const trimmedAnswer = String(answer ?? '').trim();
    if (!question?.prompt || trimmedAnswer.length < 15) {
      res.status(400).json({
        error: 'A valid question and an answer of at least 15 characters are required.',
      });
      return;
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
- Key Expectations: ${(question.keyExpectations ?? []).join('; ')}

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

    try {
      const response = await callWithRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            systemInstruction:
              'You are a candid, supportive senior hiring bar-raiser evaluating interview answers. Never inflate weak or off-topic answers. Return valid JSON matching the schema.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
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
          },
        }),
      );

      const raw = JSON.parse((response.text ?? '{}').trim());
      const evaluation = {
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

      res.json({ evaluation });
    } catch (err) {
      const message = extractReadableError(err, 'Failed to evaluate answer.');
      console.error('Error evaluating answer:', err);
      res.status(503).json({ error: message });
    }
  });

  app.post('/api/interview/summary', async (req: Request, res: Response) => {
    const ai = getGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Gemini API key is not configured. Add GEMINI_API_KEY in Settings > Secrets.',
      });
      return;
    }

    const { config, records } = req.body ?? {};
    if (!Array.isArray(records) || records.length === 0) {
      res.status(400).json({ error: 'Completed question records are required.' });
      return;
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

    try {
      const response = await callWithRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
          config: {
            systemInstruction:
              'You synthesize concise, actionable post-interview coaching plans. Return valid JSON matching the schema.',
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                headlineSummary: { type: Type.STRING },
                skillsToImprove: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['headlineSummary', 'skillsToImprove', 'recommendations'],
            },
          },
        }),
      );

      const raw = JSON.parse((response.text ?? '{}').trim());
      res.json({
        headlineSummary: String(raw.headlineSummary ?? 'Interview session completed.'),
        skillsToImprove: Array.isArray(raw.skillsToImprove) ? raw.skillsToImprove.map(String).slice(0, 4) : [],
        recommendations: Array.isArray(raw.recommendations) ? raw.recommendations.map(String).slice(0, 4) : [],
      });
    } catch (err) {
      const message = extractReadableError(err, 'Failed to synthesize final report.');
      console.error('Error generating summary:', err);
      res.status(503).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`AetherPrep AI server running on http://0.0.0.0:${port}`);
  });
}

createServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
