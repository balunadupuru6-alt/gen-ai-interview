export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  let parsed: Record<string, unknown> | null = null;

  if (rawText.trim().length > 0) {
    try {
      parsed = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    if (parsed && typeof parsed.error === 'string' && parsed.error.trim().length > 0) {
      throw new Error(parsed.error);
    }
    if (response.status === 404) {
      throw new Error(
        'Interview API endpoint (/api/interview) was not found on this server. Make sure the full-stack server is running.',
      );
    }
    if (response.status === 504 || response.status === 502) {
      throw new Error(
        'The AI service timed out while generating your interview. Please try again in a moment.',
      );
    }
    throw new Error(
      `Server returned an unexpected response (${response.status}). Please retry.`,
    );
  }

  if (!parsed) {
    throw new Error('Server returned an invalid non-JSON response. Please retry.');
  }

  return parsed as T;
}
