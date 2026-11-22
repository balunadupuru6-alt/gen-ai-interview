import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ServiceError,
  evaluateInterviewAnswer,
  extractReadableError,
  generateInterviewQuestions,
  getGeminiClient,
  summarizeInterviewSession,
} from './server/interviewService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    try {
      const questions = await generateInterviewQuestions((req.body ?? {}) as Record<string, unknown>);
      res.json({ questions });
    } catch (err) {
      const status = err instanceof ServiceError ? err.status : 503;
      const message = extractReadableError(err, 'Failed to generate interview questions.');
      console.error('Error generating interview:', err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/interview/evaluate', async (req: Request, res: Response) => {
    try {
      const evaluation = await evaluateInterviewAnswer((req.body ?? {}) as Record<string, unknown>);
      res.json({ evaluation });
    } catch (err) {
      const status = err instanceof ServiceError ? err.status : 503;
      const message = extractReadableError(err, 'Failed to evaluate answer.');
      console.error('Error evaluating answer:', err);
      res.status(status).json({ error: message });
    }
  });

  app.post('/api/interview/summary', async (req: Request, res: Response) => {
    try {
      const summary = await summarizeInterviewSession((req.body ?? {}) as Record<string, unknown>);
      res.json(summary);
    } catch (err) {
      const status = err instanceof ServiceError ? err.status : 503;
      const message = extractReadableError(err, 'Failed to synthesize final report.');
      console.error('Error generating summary:', err);
      res.status(status).json({ error: message });
    }
  });

  app.use('/api/*', (_req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  const distDir = path.resolve(__dirname, 'dist');
  const distIndex = path.join(distDir, 'index.html');
  const isProd =
    process.env.NODE_ENV === 'production' ||
    (process.env.npm_lifecycle_event === 'start' && fs.existsSync(distIndex));

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      if (fs.existsSync(distIndex)) {
        res.sendFile(distIndex);
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
