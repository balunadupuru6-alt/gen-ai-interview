import test from 'node:test';
import assert from 'node:assert/strict';
import { getGeminiClient } from './interviewService';

test('getGeminiClient resolves GEMINI_API_KEY, API_KEY, or GOOGLE_API_KEY and ignores placeholder', () => {
  const saved = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    API_KEY: process.env.API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  };

  try {
    delete process.env.GEMINI_API_KEY;
    delete process.env.API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    assert.equal(getGeminiClient(), null);

    process.env.GEMINI_API_KEY = 'MY_GEMINI_API_KEY';
    assert.equal(getGeminiClient(), null);

    process.env.GEMINI_API_KEY = '  "test-gemini-key"  ';
    assert.notEqual(getGeminiClient(), null);

    delete process.env.GEMINI_API_KEY;
    process.env.API_KEY = 'fallback-api-key';
    assert.notEqual(getGeminiClient(), null);

    delete process.env.API_KEY;
    process.env.GOOGLE_API_KEY = 'fallback-google-key';
    assert.notEqual(getGeminiClient(), null);
  } finally {
    for (const [key, val] of Object.entries(saved)) {
      if (val === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = val;
      }
    }
  }
});
