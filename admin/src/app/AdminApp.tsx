'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { DEFAULT_SECTIONS, normalizeDoc } from '@/lib/defaults';
import { applyTheme, loadTheme } from '@/lib/theme';
import type { Auth, Client, ProjectDoc, Role, Section, TabId, TabProps } from '@/lib/types';

import Login from '@/components/Login';
import SettingsModal from '@/components/SettingsModal';
import OverviewTab from '@/components/OverviewTab';
import ClientsTab from '@/components/ClientsTab';
import BuilderTab from '@/components/BuilderTab';
import ReviewTab from '@/components/ReviewTab';
import { AssignTab, EstimateTab, ApproveTab, HandoverTab } from '@/components/WorkflowTabs';
import ProposalTab from '@/components/ProposalTab';
import UsersTab from '@/components/UsersTab';

const ROLE_TABS: Record<Role, TabId[]> = {
  admin: ['overview', 'clients', 'builder', 'review', 'assign', 'estimate', 'approve', 'proposal', 'handover'],
  consultant: ['overview', 'builder', 'review', 'assign', 'proposal'],
  developer: ['overview', 'estimate'],
  approver: ['overview', 'approve'],
};

export const ROLE_NAMES: Record<Role, string> = {
  admin: 'Admin',
  consultant: 'Functional Consultant',
  developer: 'Developer',
  approver: 'Project Approval',
};

const TAB_LABELS: Record<TabId, string> = {
  overview: '1 · Overview',
  clients: '2 · Clients',
  builder: '3 · Questionnaire Builder',
  review: '4 · Discovery Review',
  assign: '5 · Assign Developer',
  estimate: '6 · Hour Estimation',
  approve: '7 · Project Approval',
  proposal: '8 · Client Proposal',
  handover: '9 · Handover & Sign-off',
};

/** Where the signed-in session is kept so it survives reloads and route changes. */
const AUTH_KEY = 'desss-admin-auth';

/** Remembers which tab to return to (and whether Website settings was open) when the
 *  user opens the Admin Users screen from the settings panel and then comes back. */
const RETURN_KEY = 'desss-admin-return';

function loadStoredAuth(): Auth | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as Auth) : null;
  } catch {
    return null;
  }
}

export default function AdminApp() {
  // Restore the session synchronously so navigating to /admin/users and back — or a
  // plain reload — never bounces a signed-in user to the login screen.
  const [auth, setAuth] = useState<Auth | null>(loadStoredAuth);
  const [tab, setTab] = useState<TabId>('overview');
  const [clients, setClients] = useState<Client[]>([]);
  const [cid, setCid] = useState<string | null>(null);
  const [doc, setDoc] = useState<ProjectDoc | null>(null);
  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);
  const [toast, setToast] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Apply the saved appearance (colours/fonts) once on load, before anything renders below.
  useEffect(() => {
    applyTheme(loadTheme());
  }, []);

  // usePathname() strips the basePath, so /admin/users arrives here as /users.
  const pathname = usePathname();
  const router = useRouter();
  const onUsersPage = pathname?.replace(/\/$/, '').endsWith('/users') ?? false;

  // Leaves the users screen for the admin home. router.push('/') resolves to /admin
  // (basePath is prepended) and pushes a history entry, so the browser Back button
  // returns here too — icon-back and browser-back land in the same place.
  function goBackToAdmin() {
    router.push('/');
  }

  // Opens the Admin Users screen from the settings panel, remembering the current tab +
  // that settings was open so returning (Back) restores both.
  function openAdminUsers() {
    try {
      sessionStorage.setItem(RETURN_KEY, JSON.stringify({ tab, settings: true }));
    } catch {
      /* ignore */
    }
    setShowSettings(false);
    router.push('/users');
  }

  // When we land back on the admin app (not the users screen), restore the tab and reopen
  // Website settings if we came from there.
  useEffect(() => {
    if (onUsersPage) return;
    let ret: { tab?: TabId; settings?: boolean } | null = null;
    try {
      const raw = sessionStorage.getItem(RETURN_KEY);
      ret = raw ? JSON.parse(raw) : null;
    } catch {
      ret = null;
    }
    if (!ret) return;
    try {
      sessionStorage.removeItem(RETURN_KEY);
    } catch {
      /* ignore */
    }
    if (ret.tab) setTab(ret.tab);
    if (ret.settings) setShowSettings(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onUsersPage]);

  function say(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  }

  // Gear button for the header — opens the website appearance settings. Reused on both
  // the signed-in portal and the open users page.
  const settingsButton = (
    <button
      onClick={() => setShowSettings(true)}
      title="Website settings"
      aria-label="Website settings"
      style={{
        background: 'none',
        border: 'none',
        color: '#A9C6A4',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        padding: 4,
      }}
    >
      <svg
        width={20}
        height={20}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>
  );

  const settingsModal = showSettings && (
    <SettingsModal
      onClose={() => setShowSettings(false)}
      onAdminUsers={openAdminUsers}
      say={say}
    />
  );

  async function reloadClients(token = auth?.token): Promise<Client[]> {
    const list = await api.listClients(token ?? '');
    setClients(list || []);
    return list || [];
  }

  async function reloadDoc(id: string | null = cid) {
    if (!id || !auth) return;
    const raw = await api.getDoc(id, auth.token);
    const company = clients.find((c) => c.id === id)?.company;
    setDoc(normalizeDoc(raw, company));
  }

  /** Loads the SELECTED client's questionnaire (their own, or the inherited template). */
  async function reloadDef(id: string | null = cid) {
    if (!id) {
      setSections(DEFAULT_SECTIONS);
      return;
    }
    const def = await api.getClientQuestionnaire(id).catch(() => null);
    setSections(def?.sections?.length ? def.sections : DEFAULT_SECTIONS);
  }

  /** Central save: applies meta + activity log, persists, updates state. */
  async function persist(nextDoc: ProjectDoc, action?: string): Promise<ProjectDoc> {
    if (!auth || !cid) throw new Error('Not signed in');
    const who = `${auth.name} (${ROLE_NAMES[auth.role]})`;
    const now = new Date().toISOString();
    const merged: ProjectDoc = {
      ...nextDoc,
      meta: { ...nextDoc.meta, updatedAt: now, updatedBy: who },
      activity: action
        ? [...(nextDoc.activity || []), { at: now, who, action }]
        : nextDoc.activity,
    };
    await api.saveDoc(cid, merged, who, auth.token);
    setDoc(merged);
    return merged;
  }

  /**
   * Loads clients/doc/questionnaire for a signed-in session (used by login AND restore).
   * `applyDefaultTab` only on a fresh login — on a silent restore we keep whatever tab the
   * return-state (or existing state) resolves to.
   */
  async function hydrate(a: Auth, applyDefaultTab = true) {
    try {
      const list = await reloadClients(a.token);
      const first = list[0]?.id || null;
      setCid(first);
      if (first) {
        const raw = await api.getDoc(first, a.token);
        setDoc(normalizeDoc(raw, list.find((c) => c.id === first)?.company));
      }
      await reloadDef(first);
      if (applyDefaultTab) setTab(ROLE_TABS[a.role][0]);
    } catch {
      // Stored token is no longer valid — drop the session and fall back to login.
      window.localStorage.removeItem(AUTH_KEY);
      setAuth(null);
    }
  }

  // On load, if a session was restored from storage, fetch its data once (without forcing
  // the tab — the return-state effect may set it).
  useEffect(() => {
    if (auth) hydrate(auth, false);
    // Run once on mount; login() handles hydration for a fresh sign-in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Credentials are checked against the admin_user table; the role comes back from it. */
  async function login(username: string, password: string) {
    const res = await api.login(username, password);
    if (!res.ok || !res.token || !res.role) {
      throw new Error(res.error || 'Incorrect username or password');
    }

    const authed: Auth = {
      token: res.token,
      username: res.username ?? username,
      name: res.fullName ?? username,
      role: res.role,
    };
    setAuth(authed);
    // Persist so the session survives reloads and /admin ↔ /admin/users navigation.
    try {
      window.localStorage.setItem(AUTH_KEY, JSON.stringify(authed));
    } catch {
      /* storage blocked — session still works for this view */
    }
    await hydrate(authed);
  }

  async function logout() {
    if (auth) await api.logout(auth.token);
    window.localStorage.removeItem(AUTH_KEY);
    location.reload();
  }

  async function switchClient(id: string) {
    if (!auth) return;
    setCid(id);
    const raw = await api.getDoc(id, auth.token);
    const company = clients.find((c) => c.id === id)?.company;
    setDoc(normalizeDoc(raw, company));
    // Each client has its own questionnaire — load the newly selected one.
    await reloadDef(id);
    say('Switched to ' + (company || id));
  }

  // The admin-users screen is open — no sign-in required, so it renders before the
  // auth gate below.
  if (onUsersPage) {
    return (
      <>
        {toast && (
          <div
            style={{
              position: 'fixed',
              top: 16,
              right: 16,
              zIndex: 60,
              background: 'var(--leaf)',
              color: '#EFFAE9',
              padding: '12px 18px',
              borderRadius: 12,
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {toast}
          </div>
        )}
        {settingsModal}
        <header className="headerbar">
          <div>
            <strong>DESSS</strong>{' '}
            <span style={{ fontSize: 10.5, color: '#A9C6A4', letterSpacing: '.8px' }}>
              INTERNAL PORTAL
            </span>
          </div>
          <div style={{ flex: 1 }} />
          {settingsButton}
        </header>
        <main className="wrap" style={{ maxWidth: 1200 }}>
          <button
            className="btn btn-ghost"
            onClick={goBackToAdmin}
            title="Back to admin"
            aria-label="Back to admin"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 12,
              padding: '7px 14px',
            }}
          >
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
          <div className="toolrow" style={{ marginBottom: 14 }}>
            <h1 style={{ flex: 1, fontSize: 22 }}>Admin users</h1>
          </div>
          <UsersTab say={say} />
        </main>
      </>
    );
  }

  if (!auth) return <Login onLogin={login} />;

  const shared: TabProps | null = doc
    ? {
        auth,
        doc,
        setDoc,
        persist,
        cid,
        clients,
        reloadClients,
        reloadDoc,
        switchClient,
        sections,
        setSections,
        reloadDef,
        say,
      }
    : null;

  return (
    <>
      {settingsModal}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 60,
            background: 'var(--leaf)',
            color: '#EFFAE9',
            padding: '12px 18px',
            borderRadius: 12,
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {toast}
        </div>
      )}

      <header className="headerbar">
        <div>
          <strong>DESSS</strong>{' '}
          <span style={{ fontSize: 10.5, color: '#A9C6A4', letterSpacing: '.8px' }}>
            INTERNAL PORTAL
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', fontSize: 13.5 }}>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
            <span style={{ fontWeight: 600 }}>{auth.name}</span>
            <span
              style={{
                fontSize: 10.5,
                color: '#A9C6A4',
                letterSpacing: '.8px',
                textTransform: 'uppercase',
              }}
            >
              {ROLE_NAMES[auth.role]}
            </span>
          </div>
          {settingsButton}
          <button
            onClick={logout}
            title="Sign out"
            aria-label="Sign out"
            style={{
              background: 'none',
              border: 'none',
              color: '#A9C6A4',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 4,
            }}
          >
            <svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" x2="9" y1="12" y2="12" />
            </svg>
          </button>
        </div>
      </header>

      <nav className="tabbar">
        {ROLE_TABS[auth.role].map((t) => (
          <button
            key={t}
            className={'tab' + (tab === t ? ' on' : '')}
            onClick={() => setTab(t)}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </nav>

      <main className="wrap">
        {!shared && <p className="meta-line">Loading client data…</p>}
        {shared && tab === 'overview' && <OverviewTab {...shared} />}
        {shared && tab === 'clients' && <ClientsTab {...shared} />}
        {shared && tab === 'builder' && <BuilderTab {...shared} />}
        {shared && tab === 'review' && <ReviewTab {...shared} />}
        {shared && tab === 'assign' && <AssignTab {...shared} />}
        {shared && tab === 'estimate' && <EstimateTab {...shared} />}
        {shared && tab === 'approve' && <ApproveTab {...shared} />}
        {shared && tab === 'proposal' && <ProposalTab {...shared} />}
        {shared && tab === 'handover' && <HandoverTab {...shared} />}
      </main>
    </>
  );
}
