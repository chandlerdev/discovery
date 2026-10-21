import type { AdminUser, Client, LoginResult, ProjectDoc, QuestionnaireDef } from './types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

/** Header carrying the session token issued by /api/auth/login. */
const AUTH_HEADER = 'X-Auth-Token';

/** 404 is a valid "not there yet" answer for several endpoints, so it maps to null. */
async function j<T>(res: Response): Promise<T | null> {
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${res.status}`);
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : null;
}

const auth = (token: string) => ({ [AUTH_HEADER]: token });

export const api = {
  /** Resolves for both success and failure — check `.ok` on the result. */
  login: async (username: string, password: string): Promise<LoginResult> => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    return (await res.json()) as LoginResult;
  },

  logout: (token: string) =>
    fetch(`${API}/api/auth/logout`, { method: 'POST', headers: auth(token) }).catch(
      () => null,
    ),

  getQuestionnaire: (): Promise<QuestionnaireDef | null> =>
    fetch(`${API}/api/questionnaire`).then((r) => j<QuestionnaireDef>(r)),

  saveQuestionnaire: (def: QuestionnaireDef, token: string) =>
    fetch(`${API}/api/questionnaire`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth(token) },
      body: JSON.stringify(def),
    }).then((r) => j<{ ok: boolean }>(r)),

  /**
   * A single client's questionnaire. 404 (→ null) means the client has no custom version
   * AND no shared template exists, so the caller falls back to the built-in default.
   */
  getClientQuestionnaire: (cid: string): Promise<QuestionnaireDef | null> =>
    fetch(`${API}/api/questionnaire/${cid}`).then((r) => j<QuestionnaireDef>(r)),

  /** Publishes a questionnaire for one client only. */
  saveClientQuestionnaire: (cid: string, def: QuestionnaireDef, token: string) =>
    fetch(`${API}/api/questionnaire/${cid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth(token) },
      body: JSON.stringify(def),
    }).then((r) => j<{ ok: boolean }>(r)),

  /** Documents are guarded — a signed-in team member may read any client's record. */
  getDoc: (cid: string, token: string): Promise<ProjectDoc | null> =>
    fetch(`${API}/api/docs/${cid}`, { headers: auth(token) }).then((r) => j<ProjectDoc>(r)),

  saveDoc: (cid: string, doc: ProjectDoc, by: string, token: string) =>
    fetch(`${API}/api/docs/${cid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Updated-By': by, ...auth(token) },
      body: JSON.stringify(doc),
    }).then((r) => j<{ ok: boolean }>(r)),

  listClients: (token: string): Promise<Client[] | null> =>
    fetch(`${API}/api/clients`, { headers: auth(token) }).then((r) => j<Client[]>(r)),

  /** Throws with the server's message (e.g. "Password is required") on a 400. */
  createClient: async (
    company: string,
    password: string,
    contact: string,
    by: string,
    token: string,
    initialDoc: ProjectDoc,
    logo?: string,
  ): Promise<Client> => {
    const res = await fetch(`${API}/api/clients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth(token) },
      body: JSON.stringify({
        company,
        password,
        contact,
        by,
        initialDoc: JSON.stringify(initialDoc),
        logo: logo || '',
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || `Could not create client (HTTP ${res.status})`);
    }
    return (await res.json()) as Client;
  },

  deleteClient: (id: string, token: string) =>
    fetch(`${API}/api/clients/${id}`, { method: 'DELETE', headers: auth(token) }).then((r) =>
      j<{ ok: boolean }>(r),
    ),

  /**
   * Reveals a client's questionnaire password. Fetched on demand (not bundled into the
   * client list) so plaintext credentials only cross the wire when someone asks.
   * null = no password, or a legacy one that can't be decrypted.
   */
  revealPassword: (id: string, token: string): Promise<string | null> =>
    fetch(`${API}/api/clients/${id}/password`, { headers: auth(token) })
      .then((r) => j<{ password: string }>(r))
      .then((r) => r?.password ?? null),

  // ── Admin users (open endpoints — no token) ────────────────────────────────
  listAdminUsers: (): Promise<AdminUser[] | null> =>
    fetch(`${API}/api/admin-users`).then((r) => j<AdminUser[]>(r)),

  /** Throws with the server's message (e.g. "That username is already taken") on 4xx. */
  createAdminUser: async (body: {
    username: string;
    password: string;
    fullName: string;
    email: string;
    role: string;
  }): Promise<AdminUser> => {
    const res = await fetch(`${API}/api/admin-users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || `Could not create user (HTTP ${res.status})`);
    }
    return (await res.json()) as AdminUser;
  },

  /**
   * Edits a team member. A blank/omitted `password` keeps the stored one.
   * Throws with the server's message (e.g. "That email is already in use") on 4xx.
   */
  updateAdminUser: async (
    id: number,
    body: {
      username: string;
      password?: string;
      fullName: string;
      email: string;
      role: string;
    },
  ): Promise<AdminUser> => {
    const res = await fetch(`${API}/api/admin-users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || `Could not update user (HTTP ${res.status})`);
    }
    return (await res.json()) as AdminUser;
  },

  /** A single client's visual theme (CSS-variable overrides). null = uses site defaults. */
  getClientTheme: (cid: string): Promise<Record<string, string> | null> =>
    fetch(`${API}/api/client-theme/${cid}`).then((r) => j<Record<string, string>>(r)),

  /** Saves one client's theme — that client's link then renders in this design. */
  saveClientTheme: (cid: string, theme: Record<string, string>, token: string) =>
    fetch(`${API}/api/client-theme/${cid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth(token) },
      body: JSON.stringify(theme),
    }).then((r) => j<{ ok: boolean }>(r)),

  deleteAdminUser: (id: number) =>
    fetch(`${API}/api/admin-users/${id}`, { method: 'DELETE' }).then((r) => j<{ ok: boolean }>(r)),

  /** Reveals a team member's password. null = unknown, or a legacy hash that can't be shown. */
  revealAdminPassword: (id: number): Promise<string | null> =>
    fetch(`${API}/api/admin-users/${id}/password`)
      .then((r) => j<{ password: string }>(r))
      .then((r) => r?.password ?? null),
};
