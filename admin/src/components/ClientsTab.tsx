'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { copyToClipboard } from '@/lib/clipboard';
import {
  freshDoc,
  normalizeDoc,
  completion,
  fmtDate,
  allQuestions,
  answerText,
  DEFAULT_SECTIONS,
} from '@/lib/defaults';
import type { ProjectDoc, Section, TabProps } from '@/lib/types';
import EyeIcon from './EyeIcon';
import ClientDesignModal from './ClientDesignModal';

/**
 * The questionnaire link points at the PUBLIC site, which is a different origin
 * from this admin app — so it cannot be derived from location.origin.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default function ClientsTab({
  auth,
  clients,
  reloadClients,
  sections,
  say,
}: TabProps) {
  const [company, setCompany] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [contact, setContact] = useState('');
  const [logo, setLogo] = useState(''); // base64 data URI for the new client's logo
  const [docs, setDocs] = useState<Record<string, ProjectDoc>>({});
  /** clientId -> that client's questionnaire sections (each client can differ now). */
  const [defs, setDefs] = useState<Record<string, Section[]>>({});

  /** The questionnaire to score a client against — their own, or a safe default. */
  const secFor = (id: string) => defs[id] || sections;

  /** clientId -> the revealed plaintext. Absent = still hidden. */
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [revealing, setRevealing] = useState<string | null>(null);

  /** The client whose Design editor is open, or null. */
  const [designing, setDesigning] = useState<{
    id: string;
    company: string;
    logo?: string | null;
  } | null>(null);

  /** Fetches the plaintext on first reveal, then just toggles it off/on. */
  async function togglePassword(id: string) {
    if (revealed[id] !== undefined) {
      setRevealed((r) => {
        const next = { ...r };
        delete next[id];
        return next;
      });
      return;
    }

    setRevealing(id);
    try {
      const pw = await api.revealPassword(id, auth.token);
      if (pw === null) {
        say('No password set for this client');
        return;
      }
      setRevealed((r) => ({ ...r, [id]: pw }));
    } catch {
      say('Could not reveal the password');
    } finally {
      setRevealing(null);
    }
  }

  useEffect(() => {
    (async () => {
      const outDocs: Record<string, ProjectDoc> = {};
      const outDefs: Record<string, Section[]> = {};
      for (const c of clients) {
        const [d, def] = await Promise.all([
          api.getDoc(c.id, auth.token).catch(() => null),
          api.getClientQuestionnaire(c.id).catch(() => null),
        ]);
        outDocs[c.id] = normalizeDoc(d, c.company);
        outDefs[c.id] = def?.sections?.length ? def.sections : DEFAULT_SECTIONS;
      }
      setDocs(outDocs);
      setDefs(outDefs);
    })();
  }, [clients, auth.token]);

  const link = (id: string) => `${SITE_URL}/q/${id}`;

  /** Reads a chosen image file into a base64 data URI for the logo. */
  function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      say('Please choose an image file for the logo');
      return;
    }
    if (file.size > 1024 * 1024) {
      say('Logo must be under 1 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogo(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => say('Could not read that image');
    reader.readAsDataURL(file);
  }

  async function create() {
    if (!company.trim()) {
      say('Enter the company name');
      return;
    }
    if (!password) {
      say('Enter a password for the client');
      return;
    }

    let c;
    try {
      c = await api.createClient(
        company.trim(),
        password,
        contact.trim(),
        auth.name,
        auth.token,
        freshDoc(company.trim()),
        logo,
      );
    } catch (e) {
      // Surfaces the server's own message, e.g. "Password must be at least 6 characters".
      say(e instanceof Error ? e.message : 'Could not create client');
      return;
    }

    setCompany('');
    setPassword('');
    setContact('');
    setLogo('');
    await reloadClients();

    const copied = await copyToClipboard(link(c.id));
    say(
      copied
        ? 'Client created — link copied to clipboard'
        : 'Client created — use Copy link in the table',
    );
  }

  async function copyLink(id: string) {
    const url = link(id);
    const copied = await copyToClipboard(url);
    // Never claim success we didn't get — show the URL so it can be copied by hand.
    say(copied ? 'Link copied: ' + url : 'Could not copy automatically — ' + url);
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Remove ${name} from the client list? Their record stays in the database.`))
      return;
    await api.deleteClient(id, auth.token);
    await reloadClients();
    say('Client removed');
  }

  async function exportExcel() {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const sum: (string | number)[][] = [
      ['Company', 'Contact', 'Client ID', 'Status', 'Answered %', 'Last updated', 'Link'],
    ];
    clients.forEach((c) => {
      const d = docs[c.id];
      sum.push([
        c.company,
        c.contact || '',
        c.id,
        d?.workflow?.status || '',
        completion(secFor(c.id), d?.answers),
        d?.meta?.updatedAt || '',
        link(c.id),
      ]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sum), 'Clients');

    // Clients can have different questionnaires now — the sheet lists the union of
    // every client's questions, deduped by id.
    const qmap = new Map<string, ReturnType<typeof allQuestions>[number]>();
    clients.forEach((c) =>
      allQuestions(secFor(c.id)).forEach((q) => {
        if (!qmap.has(q.id)) qmap.set(q.id, q);
      }),
    );
    const qs = [...qmap.values()];
    const ans: (string | number)[][] = [['Question', ...clients.map((c) => c.company)]];
    qs.forEach((q) =>
      ans.push([
        q.label,
        ...clients.map((c) => answerText(docs[c.id]?.answers?.[q.id])),
      ]),
    );
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ans), 'Answers');

    const est: (string | number)[][] = [
      ['Company', 'Workstream', 'Detail', 'Low hrs', 'High hrs'],
    ];
    clients.forEach((c) => {
      const e = docs[c.id]?.workflow?.estimate;
      if (e?.items?.length) {
        e.items.forEach((it) => est.push([c.company, it.task, it.detail || '', it.low, it.high]));
        est.push([c.company, 'TOTAL', '', e.totalLow || 0, e.totalHigh || 0]);
      }
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(est), 'Estimates');

    XLSX.writeFile(wb, 'desss-discovery-clients.xlsx');
  }

  return (
    <>
      <div className="panel">
        <h2>Add a prospect / client</h2>
        <p className="sub">
          Creates a fresh record and a personal questionnaire link. Each client can only reach
          their own record through their unique link.
        </p>
        <div className="toolrow">
          <input
            type="text"
            style={{ maxWidth: 240 }}
            placeholder="Company name *"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
          <div style={{ position: 'relative', maxWidth: 220, flex: 1 }}>
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Password *"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              style={{ paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              title={showPw ? 'Hide password' : 'Show password'}
              aria-label={showPw ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                right: 6,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--muted)',
                display: 'flex',
                alignItems: 'center',
                padding: 4,
              }}
            >
              <EyeIcon off={showPw} size={18} />
            </button>
          </div>
          <input
            type="text"
            style={{ maxWidth: 220 }}
            placeholder="Contact person (optional)"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
          <label
            className="btn btn-ghost"
            title="Upload a logo (optional, image under 1 MB)"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          >
            {logo ? (
              <img
                src={logo}
                alt="Logo preview"
                style={{ width: 22, height: 22, objectFit: 'contain', borderRadius: 4 }}
              />
            ) : (
              <svg
                width={17}
                height={17}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            )}
            <span style={{ fontSize: 13.5 }}>{logo ? 'Change logo' : 'Add logo'}</span>
            <input type="file" accept="image/*" onChange={onLogoFile} style={{ display: 'none' }} />
          </label>
          {logo && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setLogo('')}
              title="Remove logo"
              style={{ padding: '9px 12px' }}
            >
              &times;
            </button>
          )}
          <button className="btn btn-primary" onClick={create}>
            Create client &amp; link
          </button>
        </div>
        <p className="meta-line" style={{ marginTop: 10 }}>
          <span style={{ color: 'var(--clay)' }}>*</span> required · Minimum 6 characters. Share
          the password with the client separately from their link — you can view it any time
          with the eye button in the table below.
        </p>
      </div>

      <div className="panel">
        <div className="toolrow">
          <h2 style={{ flex: 1 }}>All clients</h2>
          <button className="btn btn-primary" onClick={exportExcel}>
            Export all to Excel
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="est">
            <thead>
              <tr>
                <th style={{ width: 56 }}>Logo</th>
                <th>Company</th>
                <th>Client ID</th>
                <th style={{ minWidth: 190 }}>Password</th>
                <th>Status</th>
                <th>Answered</th>
                <th>Last updated</th>
                <th style={{ minWidth: 260 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const d = docs[c.id];
                return (
                  <tr key={c.id}>
                    <td>
                      {c.logo ? (
                        <img
                          src={c.logo}
                          alt={`${c.company} logo`}
                          style={{
                            width: 38,
                            height: 38,
                            objectFit: 'contain',
                            borderRadius: 8,
                            border: '1px solid var(--mist)',
                            background: '#fff',
                          }}
                        />
                      ) : (
                        <div
                          aria-hidden="true"
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 8,
                            background: 'var(--mist)',
                            color: 'var(--muted)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: 15,
                          }}
                        >
                          {c.company?.[0]?.toUpperCase() || '?'}
                        </div>
                      )}
                    </td>
                    <td>
                      <strong>{c.company}</strong>
                      {c.contact && <div className="meta-line">{c.contact}</div>}
                    </td>
                    <td className="meta-line">{c.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <code
                          style={{
                            fontFamily: "'JetBrains Mono','Consolas',monospace",
                            fontSize: 12.5,
                            letterSpacing: revealed[c.id] ? 0 : 1.5,
                            color: revealed[c.id] ? 'var(--leaf)' : 'var(--muted)',
                            fontWeight: revealed[c.id] ? 700 : 400,
                          }}
                        >
                          {revealed[c.id] ?? '••••••••'}
                        </code>
                        <button
                          className="btn btn-ghost"
                          style={{
                            padding: '5px 9px',
                            display: 'flex',
                            alignItems: 'center',
                            color: 'var(--muted)',
                          }}
                          onClick={() => togglePassword(c.id)}
                          disabled={revealing === c.id}
                          title={revealed[c.id] ? 'Hide password' : 'Show password'}
                          aria-label={revealed[c.id] ? 'Hide password' : 'Show password'}
                        >
                          {revealing === c.id ? '…' : <EyeIcon off={!!revealed[c.id]} size={17} />}
                        </button>
                        {revealed[c.id] && (
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '4px 9px', fontSize: 12 }}
                            onClick={async () => {
                              const ok = await copyToClipboard(revealed[c.id]);
                              say(ok ? 'Password copied' : 'Could not copy the password');
                            }}
                            title="Copy password"
                          >
                            ⧉
                          </button>
                        )}
                      </div>
                    </td>
                    <td>{d?.workflow?.status || '—'}</td>
                    <td>{completion(secFor(c.id), d?.answers)}%</td>
                    <td className="meta-line">
                      {d?.meta?.updatedAt ? fmtDate(d.meta.updatedAt) : '—'}
                    </td>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          flexWrap: 'nowrap',
                        }}
                      >
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '7px 12px', fontSize: 13, whiteSpace: 'nowrap' }}
                          onClick={() => copyLink(c.id)}
                        >
                          Copy link
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{ padding: '7px 12px', fontSize: 13 }}
                          onClick={() => window.open(link(c.id), '_blank', 'noopener,noreferrer')}
                        >
                          Open
                        </button>
                        <button
                          className="btn btn-ghost"
                          style={{
                            padding: '7px 11px',
                            display: 'inline-flex',
                            alignItems: 'center',
                          }}
                          onClick={() =>
                            setDesigning({ id: c.id, company: c.company, logo: c.logo })
                          }
                          title="Design this client's page"
                          aria-label={`Design ${c.company}'s page`}
                        >
                          <svg
                            width={16}
                            height={16}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                            <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                            <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                            <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                            <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                          </svg>
                        </button>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '7px 12px', fontSize: 13 }}
                          onClick={() => remove(c.id, c.company)}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {designing && (
        <ClientDesignModal
          cid={designing.id}
          company={designing.company}
          logo={designing.logo ?? ''}
          token={auth.token}
          onClose={() => setDesigning(null)}
          say={say}
        />
      )}
    </>
  );
}
