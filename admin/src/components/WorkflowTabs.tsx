'use client';

import { useState } from 'react';
import { WORKSTREAMS, fmtDate } from '@/lib/defaults';
import type { EstimateItem, Status, TabProps } from '@/lib/types';

/* ---------- 5 · Assign ---------- */
export function AssignTab({ auth, doc, persist, say }: TabProps) {
  const a = doc.workflow.assignment;
  const [dev, setDev] = useState(a.developer || '');
  const [notes, setNotes] = useState(a.notes || '');
  const locked = !doc.review.complete;

  async function assign() {
    if (!dev.trim()) {
      say('Enter the developer’s name');
      return;
    }
    const order: Status[] = ['discovery', 'review', 'assigned'];
    const wf = doc.workflow;
    await persist(
      {
        ...doc,
        workflow: {
          ...wf,
          assignment: {
            developer: dev.trim(),
            notes: notes.trim(),
            by: auth.name,
            at: new Date().toISOString(),
          },
          status:
            order.indexOf(wf.status) < 2 || wf.status === 'review' ? 'assigned' : wf.status,
        },
      },
      `Assigned to developer ${dev.trim()}`,
    );
    say('Project assigned');
  }

  return (
    <div className="panel">
      <h2>Assign to developer</h2>
      {locked && (
        <div className="locknote">Discovery must be marked reviewed before assignment.</div>
      )}
      <label className="f">Developer name</label>
      <input
        type="text"
        value={dev}
        onChange={(e) => setDev(e.target.value)}
        placeholder="e.g. Marco T."
      />
      <label className="f">Assignment brief</label>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="What to estimate, priorities, out of scope…"
      />
      <div className="toolrow" style={{ marginTop: 14 }}>
        <button className="btn btn-primary" disabled={locked} onClick={assign}>
          Assign project
        </button>
        {a.at && (
          <span className="meta-line">
            Assigned to {a.developer} by {a.by} on {fmtDate(a.at)}
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- 6 · Estimate (developer) ---------- */
export function EstimateTab({ auth, doc, persist, say }: TabProps) {
  const e = doc.workflow.estimate;
  const seed: EstimateItem[] = e.items?.length ? e.items : WORKSTREAMS;
  const [items, setItems] = useState<EstimateItem[]>(seed.map((x) => ({ ...x })));
  const [notes, setNotes] = useState(e.notes || '');

  const a = doc.workflow.assignment;
  const locked = !a.at && auth.role !== 'admin';

  const low = items.reduce((s, it) => s + (parseFloat(String(it.low)) || 0), 0);
  const high = items.reduce((s, it) => s + (parseFloat(String(it.high)) || 0), 0);

  const set = (i: number, f: keyof EstimateItem, v: string) =>
    setItems((arr) => arr.map((it, x) => (x === i ? { ...it, [f]: v } : it)));

  async function save(submit: boolean) {
    const clean = items.filter(
      (it) => String(it.task).trim() && (it.low !== '' || it.high !== ''),
    );
    if (submit && (!clean.length || high <= 0)) {
      say('Add at least one workstream with hours');
      return;
    }
    const wf = doc.workflow;
    await persist(
      {
        ...doc,
        workflow: {
          ...wf,
          estimate: {
            items: clean,
            totalLow: low,
            totalHigh: high,
            notes: notes.trim(),
            by: auth.name,
            at: submit ? new Date().toISOString() : e.at || null,
          },
          approval: submit
            ? { decision: null, comments: '', by: null, at: null }
            : wf.approval,
          status: submit ? 'estimated' : wf.status,
        },
      },
      submit
        ? `Developer submitted estimate (${low}–${high} hrs)`
        : 'Developer saved estimate draft',
    );
    say(submit ? 'Estimate submitted for approval' : 'Draft saved');
  }

  return (
    <>
      <div className="panel">
        <h2>Requirements summary</h2>
        <p className="sub">
          {a.at
            ? `Assigned to ${a.developer} by ${a.by} on ${fmtDate(a.at)}.`
            : 'Not yet assigned.'}
        </p>
        {a.notes && (
          <div className="answer-row">
            <div className="q">Assignment brief</div>
            <div className="a">{a.notes}</div>
          </div>
        )}
        {doc.review.notes && (
          <div className="answer-row">
            <div className="q">Consultant discovery notes</div>
            <div className="a">{doc.review.notes}</div>
          </div>
        )}
        {doc.answers.priority_order && (
          <div className="answer-row">
            <div className="q">Client workstream priorities</div>
            <div className="a">
              {Array.isArray(doc.answers.priority_order)
                ? doc.answers.priority_order.join(', ')
                : doc.answers.priority_order}
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Hour estimation</h2>
        {locked && (
          <div className="locknote">
            This project hasn&apos;t been assigned yet — check with the consultant/admin.
          </div>
        )}
        <table className="est">
          <thead>
            <tr>
              <th style={{ width: '52%' }}>Workstream / task</th>
              <th>Low hrs</th>
              <th>High hrs</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td>
                  <input
                    type="text"
                    disabled={locked}
                    value={it.task}
                    onChange={(e2) => set(i, 'task', e2.target.value)}
                  />
                  <input
                    type="text"
                    disabled={locked}
                    value={it.detail || ''}
                    style={{ marginTop: 5, fontSize: 12.5, color: 'var(--muted)' }}
                    placeholder="What it includes"
                    onChange={(e2) => set(i, 'detail', e2.target.value)}
                  />
                </td>
                <td>
                  <input
                    disabled={locked}
                    type="number"
                    min="0"
                    step="0.5"
                    value={it.low}
                    onChange={(e2) => set(i, 'low', e2.target.value)}
                  />
                </td>
                <td>
                  <input
                    disabled={locked}
                    type="number"
                    min="0"
                    step="0.5"
                    value={it.high}
                    onChange={(e2) => set(i, 'high', e2.target.value)}
                  />
                </td>
                <td>
                  {!locked && (
                    <button
                      className="btn btn-danger"
                      style={{ padding: '6px 10px' }}
                      onClick={() => setItems((arr) => arr.filter((_, x) => x !== i))}
                    >
                      ✕
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="toolrow" style={{ marginTop: 10 }}>
          <button
            className="btn btn-ghost"
            disabled={locked}
            onClick={() =>
              setItems((arr) => [...arr, { task: '', detail: '', low: '', high: '' }])
            }
          >
            + Add task
          </button>
        </div>

        <div className="est-total">
          <span className="meta-line">Total estimate</span>
          <span className="num">{low}</span>–<span className="num">{high}</span>
          <span>hrs</span>
        </div>

        <label className="f">Assumptions &amp; notes</label>
        <textarea
          disabled={locked}
          value={notes}
          onChange={(e2) => setNotes(e2.target.value)}
        />

        <div className="toolrow" style={{ marginTop: 14 }}>
          <button className="btn btn-ghost" disabled={locked} onClick={() => save(false)}>
            Save draft
          </button>
          <button className="btn btn-primary" disabled={locked} onClick={() => save(true)}>
            Submit estimate for approval
          </button>
          {e.at && (
            <span className="meta-line">
              Submitted by {e.by} on {fmtDate(e.at)} · {e.totalLow}–{e.totalHigh} hrs
            </span>
          )}
        </div>
      </div>
    </>
  );
}

/* ---------- 7 · Approve ---------- */
export function ApproveTab({ auth, doc, persist, say }: TabProps) {
  const e = doc.workflow.estimate;
  const [comments, setComments] = useState(doc.workflow.approval.comments || '');

  async function decide(decision: 'approved' | 'rejected') {
    await persist(
      {
        ...doc,
        workflow: {
          ...doc.workflow,
          approval: {
            decision,
            comments: comments.trim(),
            by: auth.name,
            at: new Date().toISOString(),
          },
          status: decision === 'approved' ? 'approved' : 'rejected',
        },
      },
      decision === 'approved' ? 'Project APPROVED' : 'Estimate returned for revision',
    );
    say(decision === 'approved' ? 'Project approved ✓' : 'Returned to developer');
  }

  const ap = doc.workflow.approval;

  return (
    <div className="panel">
      <h2>Estimate for approval</h2>
      {!e.at && <div className="locknote">No estimate has been submitted yet.</div>}
      {e.at && (
        <>
          <p className="meta-line">
            Submitted by {e.by} on {fmtDate(e.at)}
          </p>
          <table className="est">
            <thead>
              <tr>
                <th>Workstream</th>
                <th>Low</th>
                <th>High</th>
              </tr>
            </thead>
            <tbody>
              {e.items.map((it, i) => (
                <tr key={i}>
                  <td>
                    {it.task}
                    {it.detail && <div className="meta-line">{it.detail}</div>}
                  </td>
                  <td>{it.low}</td>
                  <td>{it.high}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="est-total">
            <span className="meta-line">Total</span>
            <span className="num">
              {e.totalLow}–{e.totalHigh}
            </span>
            <span>hrs</span>
          </div>
          {e.notes && (
            <div className="answer-row" style={{ marginTop: 10 }}>
              <div className="q">Developer notes</div>
              <div className="a">{e.notes}</div>
            </div>
          )}
        </>
      )}

      <label className="f">Approval comments</label>
      <textarea value={comments} onChange={(ev) => setComments(ev.target.value)} />

      <div className="toolrow" style={{ marginTop: 14 }}>
        <button
          className="btn btn-approve"
          disabled={!e.at}
          onClick={() => decide('approved')}
        >
          Approve project ✓
        </button>
        <button
          className="btn btn-danger"
          disabled={!e.at}
          onClick={() => decide('rejected')}
        >
          Return for revision
        </button>
        {ap.at && (
          <span className="meta-line">
            {ap.decision === 'approved' ? 'Approved' : 'Returned'} by {ap.by} on{' '}
            {fmtDate(ap.at)}
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- 9 · Handover ---------- */
export function HandoverTab({ auth, doc, persist, say }: TabProps) {
  const [note, setNote] = useState(doc.workflow.handover.note || '');
  const ready =
    !!doc.workflow.proposal.accepted ||
    ['handover', 'signedoff'].includes(doc.workflow.status);
  const so = doc.workflow.signoff;

  async function handover() {
    await persist(
      {
        ...doc,
        workflow: {
          ...doc.workflow,
          handover: { note: note.trim(), by: auth.name, at: new Date().toISOString() },
          status: 'handover',
        },
      },
      'Project handed over to client — awaiting sign-off',
    );
    say('Handed over — client can now sign off');
  }

  return (
    <>
      <div className="panel">
        <h2>Hand over to client</h2>
        {!ready && (
          <div className="locknote">
            The client must accept the proposal before the project can be handed over.
          </div>
        )}
        <label className="f">Handover note to client</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="toolrow" style={{ marginTop: 14 }}>
          <button
            className="btn btn-primary"
            disabled={!ready || doc.workflow.status === 'signedoff'}
            onClick={handover}
          >
            Mark as handed over
          </button>
          {doc.workflow.handover.at && (
            <span className="meta-line">
              Handed over by {doc.workflow.handover.by} on {fmtDate(doc.workflow.handover.at)}
            </span>
          )}
        </div>
      </div>

      <div className="panel">
        <h2>Client sign-off status</h2>
        {so.at ? (
          <div>
            <span className="pill green">Signed off ✓</span>
            <div style={{ marginTop: 10 }}>
              By <strong>{so.name}</strong> on {fmtDate(so.at)}
              {so.comments && (
                <div className="answer-row" style={{ marginTop: 8 }}>
                  <div className="q">Client comments</div>
                  <div className="a">{so.comments}</div>
                </div>
              )}
            </div>
          </div>
        ) : doc.workflow.status === 'handover' ? (
          <span className="pill amber">Awaiting client sign-off</span>
        ) : (
          <span className="meta-line">Awaiting handover.</span>
        )}
      </div>
    </>
  );
}
