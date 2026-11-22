import test from 'node:test';
import assert from 'node:assert/strict';
import { postJson } from './api';

test('postJson parses structured JSON error responses cleanly', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: 'Gemini API key is not configured.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    await assert.rejects(() => postJson('/api/interview/generate', {}), {
      message: 'Gemini API key is not configured.',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('postJson handles non-JSON 404 plain text ("The page could not be found") without SyntaxError', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response('The page could not be found', {
      status: 404,
      headers: { 'Content-Type': 'text/plain' },
    });

  try {
    await assert.rejects(() => postJson('/api/interview/generate', {}), {
      message:
        'Interview API endpoint (/api/interview) was not found on this server. Make sure the full-stack server is running.',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('postJson returns parsed payload when response is ok JSON', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ questions: [{ index: 1 }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  try {
    const res = await postJson<{ questions: Array<{ index: number }> }>(
      '/api/interview/generate',
      {},
    );
    assert.equal(res.questions.length, 1);
    assert.equal(res.questions[0].index, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
