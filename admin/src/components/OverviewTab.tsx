'use client';

import { useState } from 'react';
import { STAGES, completion, fmtDate, freshDoc } from '@/lib/defaults';
import type { TabProps } from '@/lib/types';
import JsonModal from './JsonModal';
import SearchableSelect from './SearchableSelect';

export default function OverviewTab({
  auth,
  doc,
  persist,
  cid,
  clients,
  switchClient,
  reloadDoc,
  sections,
  say,
}: TabProps) {
  const [showJson, setShowJson] = useState(false);
  const company = clients.find((c) => c.id === cid)?.company || cid;
  const status = doc.workflow.status;
  const idx = Math.max(
    0,
    STAGES.findIndex((s) => s.id === (status === 'rejected' ? 'assigned' : status)),
  );

  async function reset() {
    if (
      !confirm(
        `Reset ${company}'s ENTIRE project — answers, estimate, approvals, sign-off? This cannot be undone.`,
      )
    )
      return;
    await persist(freshDoc(company ?? undefined), 'Admin reset the project');
    say('Project reset');
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${cid}-project-data.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <div className="panel">
        <div className="toolrow">
          <h2 style={{ flex: 1 }}>Project status</h2>
          <label
            className="meta-line"
            style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}
          >
            Client
          </label>
          <SearchableSelect
            value={cid}
            onChange={(id) => switchClient(id)}
            placeholder="Select a client…"
            width={220}
            options={clients.map((c) => ({ value: c.id, label: c.company, hint: c.id }))}
          />
          <span className="pill green">
            {completion(sections, doc.answers)}% questionnaire complete
          </span>
          <button
            className="btn btn-ghost"
            onClick={() => reloadDoc().then(() => say('Data refreshed'))}
          >
            ↻ Refresh data
          </button>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '14px 0 4px' }}>
          {STAGES.map((s, i) => (
            <div
              key={s.id}
              className={'step' + (i < idx ? ' done' : '') + (i === idx ? ' now' : '')}
            >
              <div className="n">Step {i + 1}</div>
              <div className="t">
                {status === 'rejected' && s.id === 'estimated' ? 'Returned ↺' : s.label}
              </div>
            </div>
          ))}
        </div>

        <p className="meta-line" style={{ marginTop: 8 }}>
          {doc.meta.updatedAt
            ? `Last update: ${fmtDate(doc.meta.updatedAt)} by ${doc.meta.updatedBy}`
            : 'No activity yet.'}
        </p>
      </div>

      <div className="panel">
        <h2>Activity log</h2>
        <p className="sub">Every action across both apps is recorded here.</p>
        {[...(doc.activity || [])]
          .reverse()
          .slice(0, 25)
          .map((a, i) => (
            <div
              key={i}
              style={{ borderLeft: '3px solid var(--mist)', paddingLeft: 14, marginBottom: 12 }}
            >
              <strong style={{ fontSize: 13.5 }}>{a.who}</strong>
              <span className="meta-line"> · {fmtDate(a.at)}</span>
              <div style={{ fontSize: 14 }}>{a.action}</div>
            </div>
          ))}
        {!doc.activity?.length && <p className="meta-line">Nothing logged yet.</p>}
      </div>

      {auth.role === 'admin' && (
        <div className="panel">
          <h2>Admin tools</h2>
          <div className="toolrow" style={{ marginTop: 10 }}>
            <button className="btn btn-ghost" onClick={() => setShowJson(true)}>
              View JSON
            </button>
            <button className="btn btn-primary" onClick={exportJson}>
              Download JSON
            </button>
            <button className="btn btn-danger" onClick={reset}>
              Reset this client&apos;s project
            </button>
          </div>
        </div>
      )}

      {showJson && (
        <JsonModal
          title={`${company} · project document`}
          data={doc}
          onClose={() => setShowJson(false)}
        />
      )}
    </>
  );
}
