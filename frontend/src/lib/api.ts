import type { ProjectDoc, QuestionnaireDef } from './types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/** Header carrying the token issued when a client unlocks their questionnaire. */
const CLIENT_HEADER = 'X-Client-Token';

/** 404 is a valid "not there yet" answer for these endpoints, so it maps to null. */
async function j<T>(res: Response): Promise<T | null> {
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status}`);
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : null;
}

export interface UnlockResult {
  ok: boolean;
  token: string | null;
  company: string | null;
  error: string | null;
}

/**
 * Public surface only. Every document call carries the unlock token — without it the
 * server returns 401, so the lock cannot be bypassed by skipping the UI.
 */
export const api = {
  /** Resolves for both success and failure — check `.ok`. */
  unlock: async (cid: string, company: string, password: string): Promise<UnlockResult> => {
    const res = await fetch(`${API}/api/clients/${cid}/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company, password }),
    });
    return (await res.json()) as UnlockResult;
  },

  /**
   * This client's questionnaire — their own published version, or the shared template.
   * null = nothing published for them at all; the page falls back to its built-in default.
   */
  getQuestionnaire: (cid: string): Promise<QuestionnaireDef | null> =>
    fetch(`${API}/api/questionnaire/${cid}`).then((r) => j<QuestionnaireDef>(r)),

  /** This client's design (CSS-variable overrides). null = use the site defaults. */
  getClientTheme: (cid: string): Promise<Record<string, string> | null> =>
    fetch(`${API}/api/client-theme/${cid}`).then((r) => j<Record<string, string>>(r)),

  /** This client's logo (base64 data URI) for the header. null = no logo set. */
  getClientLogo: (cid: string): Promise<string | null> =>
    fetch(`${API}/api/clients/${cid}/logo`)
      .then((r) => j<{ logo: string }>(r))
      .then((r) => r?.logo ?? null),

  getDoc: (cid: string, token: string): Promise<ProjectDoc | null> =>
    fetch(`${API}/api/docs/${cid}`, { headers: { [CLIENT_HEADER]: token } }).then((r) =>
      j<ProjectDoc>(r),
    ),

  saveDoc: (cid: string, doc: ProjectDoc, by: string, token: string) =>
    fetch(`${API}/api/docs/${cid}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Updated-By': by,
        [CLIENT_HEADER]: token,
      },
      body: JSON.stringify(doc),
    }).then((r) => j<{ ok: boolean }>(r)),
};
