import { SEED_SESSIONS } from '../data/seedSessions';
import type { InterviewSession } from '../types/interview';

const STORAGE_KEY = 'aetherprep_sessions_v1';

export function loadSessions(): InterviewSession[] {
  if (typeof window === 'undefined') {
    return SEED_SESSIONS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_SESSIONS));
      return SEED_SESSIONS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as InterviewSession[];
    }
    return SEED_SESSIONS;
  } catch {
    return SEED_SESSIONS;
  }
}

export function saveSessions(sessions: InterviewSession[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Ignore storage quota errors
  }
}

export function upsertSession(session: InterviewSession): InterviewSession[] {
  const existing = loadSessions().filter((s) => s.id !== session.id);
  const updated = [session, ...existing];
  saveSessions(updated);
  return updated;
}

export function deleteSessionById(sessionId: string): InterviewSession[] {
  const updated = loadSessions().filter((s) => s.id !== sessionId);
  saveSessions(updated);
  return updated;
}
