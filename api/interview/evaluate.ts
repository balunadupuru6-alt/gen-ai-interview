import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  ServiceError,
  evaluateInterviewAnswer,
  extractReadableError,
} from '../../server/interviewService.ts';

async function readJsonBody(req: IncomingMessage & { body?: unknown }): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
}

export default async function handler(
  req: IncomingMessage & { body?: unknown },
  res: ServerResponse,
) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed.' }));
    return;
  }

  try {
    const body = await readJsonBody(req);
    const evaluation = await evaluateInterviewAnswer(body);
    res.statusCode = 200;
    res.end(JSON.stringify({ evaluation }));
  } catch (err) {
    res.statusCode = err instanceof ServiceError ? err.status : 503;
    res.end(
      JSON.stringify({
        error: extractReadableError(err, 'Failed to evaluate answer.'),
      }),
    );
  }
}
