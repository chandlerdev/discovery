'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { applyTheme } from '@/lib/theme';
import {
  DEFAULT_SECTIONS,
  PREFILL,
  STATUS_LABELS,
  normalizeDoc,
  isAnswered,
  completion,
  fmtDate,
} from '@/lib/defaults';
import type { Answers, ProjectDoc, Section } from '@/lib/types';

import Question from '@/components/Question';
import ProposalCard from '@/components/ProposalCard';
import SignoffCard from '@/components/SignoffCard';
import UnlockModal from '@/components/UnlockModal';
import SidebarTemplate from '@/components/SidebarTemplate';

type Template = 'classic' | 'sidebar';

type SaveStatus = { kind: 'idle' | 'ok' | 'err'; text: string };

/**
 * Per-tab, per-client storage. sessionStorage (not localStorage) so closing the tab
 * relocks the questionnaire, and keyed by client id so unlocking one client never
 * carries over to another.
 */
const tokenKey = (cid: string) => `portal_client_token_${cid}`;

// Next 15 delivers route params as a Promise, even to client components.
export default function ClientPage({ params }: { params: Promise<{ cid: string }> }) {
  const { cid } = use(params);

  const [token, setToken] = useState<string | null>(null);
  const [company, setCompany] = useState('');
  const [booting, setBooting] = useState(true);

  const [sections, setSections] = useState<Section[]>(DEFAULT_SECTIONS);
  const [doc, setDoc] = useState<ProjectDoc | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle', text: '' });
  const [template, setTemplate] = useState<Template>('classic');
  // Admin-configurable header (set in the Client design panel, stored in the theme blob).
  const [headerLogo, setHeaderLogo] = useState('');
  const [headerTitle, setHeaderTitle] = useState('');
  const [headerSubtitle, setHeaderSubtitle] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [partnerTagline, setPartnerTagline] = useState('');
  const [headerStatus, setHeaderStatus] = useState('');
  const [statusDotColor, setStatusDotColor] = useState('');

  /** Loads the questionnaire + document once we hold a valid token. */
  const loadAfterUnlock = useCallback(
    async (activeToken: string, companyName: string) => {
      const [def, raw] = await Promise.all([
        api.getQuestionnaire(cid).catch(() => null),
        api.getDoc(cid, activeToken),
      ]);

      if (def?.sections?.length) setSections(def.sections);

      let d = normalizeDoc(raw, companyName);
      // Demo seed: the FreshBytes record starts pre-filled from the discovery call.
      if (!d.meta.updatedAt && cid === 'freshbytes') {
        const a: Answers = { ...d.answers };
        Object.entries(PREFILL).forEach(([k, v]) => {
          if (!isAnswered(a[k])) a[k] = v;
        });
        d = { ...d, answers: a };
      }

      setDoc(d);
      setAnswers(d.answers);
    },
    [cid],
  );

  // Apply this client's admin-set design + layout as soon as the page loads — before
  // unlock too, so the lock screen already shows their colours/fonts.
  useEffect(() => {
    (async () => {
      const [t, clientLogo] = await Promise.all([
        api.getClientTheme(cid).catch(() => null),
        api.getClientLogo(cid).catch(() => null),
      ]);
      // The header logo is the logo uploaded when the client was created — always.
      setHeaderLogo(clientLogo || '');
      if (t) {
        // headerLogo is intentionally ignored here (logo comes from the client record).
        const {
          template: tpl,
          headerLogo: _ignoredLogo,
          headerTitle: hTitle,
          headerSubtitle: hSub,
          partnerName: pName,
          partnerTagline: pTag,
          headerStatus: hStatus,
          statusDotColor: dotColor,
          ...vars
        } = t;
        void _ignoredLogo;
        setTemplate(tpl === 'sidebar' ? 'sidebar' : 'classic');
        setHeaderTitle(hTitle || '');
        setHeaderSubtitle(hSub || '');
        setPartnerName(pName || '');
        setPartnerTagline(pTag || '');
        setHeaderStatus(hStatus || '');
        setStatusDotColor(dotColor || '');
        applyTheme(vars);
      } else {
        setTemplate('classic');
        setHeaderTitle('');
        setHeaderSubtitle('');
        setPartnerName('');
        setPartnerTagline('');
        setHeaderStatus('');
        setStatusDotColor('');
        applyTheme(null);
      }
    })();
  }, [cid]);

  // Re-use an existing unlock if this tab already has one; otherwise stay locked.
  useEffect(() => {
    (async () => {
      const saved = sessionStorage.getItem(tokenKey(cid));
      if (!saved) {
        setBooting(false);
        return;
      }
      try {
        const raw = await api.getDoc(cid, saved);
        const d = normalizeDoc(raw);
        setToken(saved);
        setCompany(d.meta.customer);
        await loadAfterUnlock(saved, d.meta.customer);
      } catch {
        // Token expired or rejected — drop it and show the lock again.
        sessionStorage.removeItem(tokenKey(cid));
      } finally {
        setBooting(false);
      }
    })();
  }, [cid, loadAfterUnlock]);

  /** Throws on bad credentials so UnlockModal keeps itself open and shows the message. */
  async function unlock(companyName: string, password: string) {
    const res = await api.unlock(cid, companyName, password);
    if (!res.ok || !res.token) {
      throw new Error(res.error || 'Incorrect company name or password');
    }
    const name = res.company ?? companyName;
    sessionStorage.setItem(tokenKey(cid), res.token);
    setToken(res.token);
    setCompany(name);
    await loadAfterUnlock(res.token, name);
  }

  const pct = useMemo(() => completion(sections, answers), [sections, answers]);

  /** Re-reads the record first so a concurrent workflow change isn't clobbered. */
  async function save() {
    if (!token) return;
    setStatus({ kind: 'idle', text: 'Saving…' });
    try {
      const latest = normalizeDoc(await api.getDoc(cid, token), company);
      const now = new Date().toISOString();
      const merged: ProjectDoc = {
        ...latest,
        answers,
        meta: { ...latest.meta, updatedAt: now, updatedBy: 'client' },
        activity: [
          ...latest.activity,
          { at: now, who: 'client', action: 'Client updated questionnaire answers' },
        ],
      };
      await api.saveDoc(cid, merged, 'client', token);
      setDoc(merged);
      setStatus({ kind: 'ok', text: 'Saved ✓ · ' + fmtDate(merged.meta.updatedAt) });
    } catch {
      setStatus({
        kind: 'err',
        text: 'Could not save — check your connection and try again.',
      });
    }
  }

  async function acceptProposal(name: string, comments: string) {
    if (!token) return;
    const latest = normalizeDoc(await api.getDoc(cid, token), company);
    const now = new Date().toISOString();
    const merged: ProjectDoc = {
      ...latest,
      workflow: {
        ...latest.workflow,
        status: 'accepted',
        proposal: { ...latest.workflow.proposal, accepted: { name, comments, at: now } },
      },
      meta: { ...latest.meta, updatedAt: now, updatedBy: 'client' },
      activity: [
        ...latest.activity,
        { at: now, who: 'client', action: `Client accepted proposal — ${name}` },
      ],
    };
    await api.saveDoc(cid, merged, 'client', token);
    setDoc(merged);
  }

  async function signOff(name: string, comments: string) {
    if (!token) return;
    const latest = normalizeDoc(await api.getDoc(cid, token), company);
    const now = new Date().toISOString();
    const merged: ProjectDoc = {
      ...latest,
      workflow: {
        ...latest.workflow,
        status: 'signedoff',
        signoff: { name, comments, at: now },
      },
      meta: { ...latest.meta, updatedAt: now, updatedBy: 'client' },
      activity: [
        ...latest.activity,
        { at: now, who: 'client', action: `Client sign-off by ${name}` },
      ],
    };
    await api.saveDoc(cid, merged, 'client', token);
    setDoc(merged);
  }

  // Blank shell while we check for an existing unlock — avoids flashing the lock screen.
  if (booting) {
    return <div style={{ minHeight: '100vh', background: 'var(--deep)' }} />;
  }

  // Locked: nothing about this client is rendered until the password checks out.
  if (!token || !doc) {
    return <UnlockModal onUnlock={unlock} />;
  }

  const st = doc.workflow.status || 'discovery';

  return (
    <>
      <header
        style={{
          background: 'var(--leaf)',
          color: '#F3FAEF',
          padding: '26px clamp(18px,5vw,56px) 30px',
          borderBottom: '5px solid var(--lime)',
        }}
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          {headerLogo ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: '#fff',
                borderRadius: 10,
                padding: '6px 12px',
              }}
            >
              <img
                src={headerLogo}
                alt={company}
                style={{ height: 34, maxWidth: 180, objectFit: 'contain', display: 'block' }}
              />
            </span>
          ) : (
            <strong style={{ fontSize: 17 }}>{company}</strong>
          )}
          <span style={{ opacity: 0.4 }}>|</span>
          <strong style={{ fontSize: 17 }}>{partnerName || 'DESSS'}</strong>
          <span style={{ fontSize: 11.5, color: '#BFD9BC', letterSpacing: '.8px' }}>
            {partnerTagline || 'SOLUTION PARTNER'}
          </span>
        </div>
        <h1 style={{ fontSize: 'clamp(24px,3.4vw,34px)', marginTop: 20 }}>
          {headerTitle || 'Zoho CRM Plus — Implementation Discovery'}
        </h1>
        <p style={{ color: '#CDE3C9', marginTop: 8, maxWidth: 720, whiteSpace: 'pre-wrap' }}>
          {headerSubtitle ||
            'Review, correct, and complete the questions below. Your progress saves to this portal, so you can return any time.'}
        </p>
        <div
          style={{
            marginTop: 18,
            display: 'inline-flex',
            gap: 8,
            alignItems: 'center',
            background: 'rgba(255,255,255,.1)',
            border: '1px solid rgba(255,255,255,.25)',
            padding: '7px 16px',
            borderRadius: 999,
            fontSize: 13.5,
            fontWeight: 600,
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: statusDotColor || 'var(--lime)',
            }}
          />
          {headerStatus || STATUS_LABELS[st] || st}
        </div>
      </header>

      {template === 'sidebar' ? (
        <SidebarTemplate
          sections={sections}
          answers={answers}
          onChange={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))}
        />
      ) : (
        <main
          className="wrap"
          style={{
            // Full-bleed like the header: content spans the whole width with the same
            // horizontal padding, so cards start at the header's left edge and reach the
            // right edge with matching spacing.
            margin: 0,
            maxWidth: 'none',
            paddingLeft: 'clamp(18px,5vw,56px)',
            paddingRight: 'clamp(18px,5vw,56px)',
          }}
        >
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 20,
              background: 'var(--paper)',
              padding: '14px 2px 12px',
              borderBottom: '1px solid var(--mist)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
              <span
                className="meta-line"
                style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}
              >
                Questions answered
              </span>
              <strong style={{ color: 'var(--leaf)' }}>{pct}%</strong>
            </div>
            <div style={{ height: 12, background: 'var(--mist)', borderRadius: 999 }}>
              <div
                style={{
                  height: '100%',
                  width: pct + '%',
                  borderRadius: 999,
                  background: 'linear-gradient(90deg,var(--sprout),var(--lime))',
                  transition: 'width .4s',
                }}
              />
            </div>
          </div>

          {sections.map((sec, si) => (
            <section key={sec.id || si}>
              <div className="section-head">
                <span className="section-tag">Section {String.fromCharCode(65 + si)}</span>
                <h2 style={{ fontSize: 20 }}>{sec.title}</h2>
              </div>
              {(sec.questions || []).map((q) => (
                <Question
                  key={q.id}
                  q={q}
                  value={answers[q.id]}
                  onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                />
              ))}
            </section>
          ))}
        </main>
      )}

      {/* Proposal / sign-off — shared by both layouts, full-bleed with header padding */}
      <div style={{ padding: '0 clamp(18px,5vw,56px)' }}>
        <ProposalCard doc={doc} onAccept={acceptProposal} />

        {st === 'handover' && <SignoffCard onSignOff={signOff} />}

        {st === 'signedoff' && (
          <div
            className="panel"
            style={{
              background: 'var(--leaf)',
              color: '#EFFAE9',
              textAlign: 'center',
              marginTop: 28,
            }}
          >
            <h2 style={{ color: 'var(--lime)' }}>Project signed off ✓</h2>
            <p style={{ marginTop: 6, fontSize: 14 }}>
              Signed off by {doc.workflow.signoff.name} on {fmtDate(doc.workflow.signoff.at)}.
              Thank you for partnering with DESSS!
            </p>
          </div>
        )}

        <div style={{ height: 60 }} />
      </div>

      <div
        className="no-print"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(251,253,247,.94)',
          borderTop: '1px solid var(--mist)',
          padding: '12px clamp(14px,4vw,32px)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
          zIndex: 30,
        }}
      >
        <span
          className="meta-line"
          style={{
            color:
              status.kind === 'err'
                ? 'var(--clay)'
                : status.kind === 'ok'
                  ? 'var(--leaf)'
                  : undefined,
            fontWeight: status.kind === 'idle' ? 400 : 600,
          }}
        >
          {status.text || 'Answers are saved when you select "Save my answers".'}
        </span>
        <button className="btn btn-primary" onClick={save}>
          Save my answers
        </button>
      </div>
    </>
  );
}
