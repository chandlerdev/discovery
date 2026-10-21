'use client';

import { useState } from 'react';
import { THEMES, computeInvest, fmtDate, money } from '@/lib/defaults';
import type { EstimateItem, Proposal, TabProps, Theme } from '@/lib/types';

const CUSTOM = 'Custom…';

export default function ProposalTab({ auth, doc, persist, cid, clients, say }: TabProps) {
  const e = doc.workflow.estimate;
  const pr = doc.workflow.proposal;
  const company = clients.find((c) => c.id === cid)?.company || cid;

  const [items, setItems] = useState<EstimateItem[]>(
    (pr.items?.length ? pr.items : []).map((x) => ({ ...x })),
  );
  const [type, setType] = useState<'tm' | 'fixed'>(pr.type || 'tm');
  const [rate, setRate] = useState(String(pr.rate ?? ''));
  const [fixedPrice, setFixedPrice] = useState(String(pr.fixedPrice ?? ''));
  const [showPricing, setShowPricing] = useState(!!pr.showPricing);
  const [themeName, setThemeName] = useState(
    pr.theme?.name && THEMES.some((t) => t.name === pr.theme?.name)
      ? pr.theme.name
      : pr.theme
        ? CUSTOM
        : THEMES[0].name,
  );
  const [customP, setCustomP] = useState(pr.theme?.primary || '#1B4332');
  const [customA, setCustomA] = useState(pr.theme?.accent || '#C6F26E');
  const [note, setNote] = useState(pr.note || '');
  const [preview, setPreview] = useState(false);

  const approved =
    doc.workflow.approval.decision === 'approved' ||
    ['proposal', 'accepted', 'handover', 'signedoff'].includes(doc.workflow.status);
  const canSubmit = approved || auth.role === 'admin';

  const totLow = items.reduce((s, it) => s + (parseFloat(String(it.low)) || 0), 0);
  const totHigh = items.reduce((s, it) => s + (parseFloat(String(it.high)) || 0), 0);
  const inv = computeInvest(items, rate);

  const theme = (): Theme =>
    themeName === CUSTOM
      ? { name: 'Custom', primary: customP, accent: customA }
      : THEMES.find((t) => t.name === themeName) || THEMES[0];

  const set = (i: number, f: keyof EstimateItem, v: string) =>
    setItems((arr) => arr.map((it, x) => (x === i ? { ...it, [f]: v } : it)));

  function copySource() {
    if (!e.items?.length) {
      say('No developer estimate to copy yet');
      return;
    }
    setItems(e.items.map((x) => ({ ...x, rate: x.rate || '' })));
    say('Developer estimate copied — adjust freely');
  }

  function gather(): Proposal {
    const clean = items.filter(
      (it) => String(it.task).trim() && (it.low !== '' || it.high !== ''),
    );
    const cinv = computeInvest(clean, rate);
    return {
      published: true,
      items: clean,
      totalLow: totLow,
      totalHigh: totHigh,
      investLow: Math.round(cinv.low),
      investHigh: Math.round(cinv.high),
      investMixed: cinv.mixed,
      type,
      rate: parseFloat(rate) || '',
      fixedPrice: parseFloat(fixedPrice) || '',
      showPricing,
      theme: theme(),
      note: note.trim(),
      by: auth.name,
      at: new Date().toISOString(),
      accepted: pr.accepted || null,
    };
  }

  async function submit() {
    const p = gather();
    if (!p.items.length) {
      say('Add at least one proposal line — copy the developer estimate as a start');
      return;
    }
    if (p.type === 'fixed' && !(Number(p.fixedPrice) > 0)) {
      say('Enter the fixed price');
      return;
    }
    await persist(
      {
        ...doc,
        workflow: {
          ...doc.workflow,
          proposal: p,
          status: p.accepted ? doc.workflow.status : 'proposal',
        },
      },
      `Proposal submitted to client (${
        p.type === 'fixed' ? 'Fixed price' : 'Time & Materials'
      }, ${p.totalLow}–${p.totalHigh} hrs)`,
    );
    say('Proposal submitted — now live for the client');
  }

  const th = theme();

  return (
    <>
      <div className="panel">
        <h2>Source · developer estimate</h2>
        <p className="sub">
          Read-only. The developer&apos;s submission stays untouched as the source of record.
        </p>
        {e.at ? (
          <>
            <p className="meta-line" style={{ marginBottom: 8 }}>
              Submitted by {e.by} on {fmtDate(e.at)} · {e.totalLow}–{e.totalHigh} hrs
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
          </>
        ) : (
          <p className="meta-line">
            No developer estimate submitted yet. As Admin you can still build the proposal
            manually below.
          </p>
        )}
        <div className="toolrow" style={{ marginTop: 12 }}>
          <button className="btn btn-ghost" onClick={copySource}>
            ⤓ Copy developer estimate into proposal
          </button>
        </div>
      </div>

      <div className="panel">
        <h2>Proposal line items (adjustable)</h2>
        <p className="sub">
          Your working copy — tune hours, reword lines, set per-line rates. The source above is
          never modified.
        </p>
        <table className="est">
          <thead>
            <tr>
              <th style={{ width: '44%' }}>Workstream</th>
              <th>Low hrs</th>
              <th>High hrs</th>
              <th>Rate $/hr</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td>
                  <input
                    type="text"
                    value={it.task}
                    onChange={(ev) => set(i, 'task', ev.target.value)}
                  />
                  <input
                    type="text"
                    value={it.detail || ''}
                    style={{ marginTop: 5, fontSize: 12.5, color: 'var(--muted)' }}
                    placeholder="What it includes"
                    onChange={(ev) => set(i, 'detail', ev.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={it.low}
                    onChange={(ev) => set(i, 'low', ev.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={it.high}
                    onChange={(ev) => set(i, 'high', ev.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    placeholder="default"
                    value={it.rate || ''}
                    onChange={(ev) => set(i, 'rate', ev.target.value)}
                  />
                </td>
                <td>
                  <button
                    className="btn btn-danger"
                    style={{ padding: '6px 10px' }}
                    onClick={() => setItems((a) => a.filter((_, x) => x !== i))}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={5} className="meta-line">
                  No lines yet — copy the developer estimate above, or add lines manually.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="toolrow" style={{ marginTop: 10 }}>
          <button
            className="btn btn-ghost"
            onClick={() =>
              setItems((a) => [...a, { task: '', detail: '', low: '', high: '', rate: '' }])
            }
          >
            + Add line
          </button>
        </div>

        <div className="est-total">
          <span className="meta-line">Proposal total</span>
          <span className="num">{totLow}</span>–<span className="num">{totHigh}</span>
          <span>hrs</span>
        </div>
      </div>

      <div className="panel">
        <h2>Pricing, theme &amp; cover note</h2>
        {!approved && (
          <div className="locknote">
            Estimate not yet approved — as Admin you may still submit (override); other roles
            must wait for approval.
          </div>
        )}

        <label className="f">Proposal type</label>
        <div className="toolrow">
          <label
            style={{ display: 'flex', gap: 7, alignItems: 'center', fontWeight: 600, fontSize: 14 }}
          >
            <input
              type="radio"
              checked={type === 'tm'}
              onChange={() => setType('tm')}
              style={{ width: 16, height: 16 }}
            />{' '}
            Time &amp; Materials
          </label>
          <label
            style={{ display: 'flex', gap: 7, alignItems: 'center', fontWeight: 600, fontSize: 14 }}
          >
            <input
              type="radio"
              checked={type === 'fixed'}
              onChange={() => setType('fixed')}
              style={{ width: 16, height: 16 }}
            />{' '}
            Fixed price
          </label>
        </div>

        {type === 'tm' && (
          <>
            <label className="f">
              Default hourly rate (USD) — lines without their own rate use this
            </label>
            <input
              type="number"
              min="0"
              step="5"
              style={{ maxWidth: 200 }}
              value={rate}
              onChange={(e2) => setRate(e2.target.value)}
              placeholder="e.g. 125"
            />
            <label
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                marginTop: 12,
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              <input
                type="checkbox"
                checked={showPricing}
                onChange={(e2) => setShowPricing(e2.target.checked)}
                style={{ width: 17, height: 17 }}
              />
              Show investment range (rate × hours) on the client proposal
            </label>
            {inv.high > 0 && (
              <p className="meta-line" style={{ marginTop: 8 }}>
                Investment at current rates: {money(inv.low)} – {money(inv.high)}
              </p>
            )}
          </>
        )}

        {type === 'fixed' && (
          <>
            <label className="f">Fixed price (USD)</label>
            <input
              type="number"
              min="0"
              step="100"
              style={{ maxWidth: 200 }}
              value={fixedPrice}
              onChange={(e2) => setFixedPrice(e2.target.value)}
              placeholder="e.g. 14500"
            />
          </>
        )}

        <label className="f">Color theme for the client proposal</label>
        <div className="toolrow">
          <select
            style={{ maxWidth: 230 }}
            value={themeName}
            onChange={(e2) => setThemeName(e2.target.value)}
          >
            {THEMES.map((t) => (
              <option key={t.name}>{t.name}</option>
            ))}
          </select>
          {themeName === CUSTOM && (
            <>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                Primary{' '}
                <input
                  type="color"
                  value={customP}
                  onChange={(e2) => setCustomP(e2.target.value)}
                  style={{ width: 44, height: 32, padding: 2 }}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                Accent{' '}
                <input
                  type="color"
                  value={customA}
                  onChange={(e2) => setCustomA(e2.target.value)}
                  style={{ width: 44, height: 32, padding: 2 }}
                />
              </label>
            </>
          )}
        </div>

        <label className="f">Cover note to client</label>
        <textarea
          value={note}
          onChange={(e2) => setNote(e2.target.value)}
          placeholder="A short message that appears at the top of the proposal…"
        />

        <div className="toolrow" style={{ marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={() => setPreview((p) => !p)}>
            {preview ? 'Hide preview' : 'Preview proposal'}
          </button>
          <button className="btn btn-primary" disabled={!canSubmit} onClick={submit}>
            Generate &amp; submit to client
          </button>
          {pr.at && (
            <span className="meta-line">
              Submitted by {pr.by} on {fmtDate(pr.at)} ·{' '}
              {pr.type === 'fixed' ? 'Fixed price' : 'T&M'}
            </span>
          )}
        </div>

        {preview && (
          <div
            style={{
              border: `2px solid ${th.primary}`,
              borderRadius: 14,
              padding: 22,
              background: '#fff',
              marginTop: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 10,
              }}
            >
              <h3 style={{ color: th.primary, fontSize: 18 }}>Solution Proposal · {company}</h3>
              <span
                style={{
                  background: th.accent,
                  color: th.primary,
                  fontWeight: 700,
                  fontSize: 12,
                  padding: '5px 12px',
                  borderRadius: 999,
                }}
              >
                {type === 'fixed' ? 'FIXED PRICE' : 'TIME & MATERIALS'}
              </span>
            </div>

            {note && (
              <div
                style={{
                  background: th.accent + '33',
                  borderRadius: 9,
                  padding: '11px 13px',
                  fontSize: 13.5,
                  margin: '12px 0',
                }}
              >
                {note}
              </div>
            )}

            <table className="est">
              <thead>
                <tr>
                  <th>Workstream</th>
                  <th>Low</th>
                  <th>High</th>
                  {type === 'tm' && showPricing && <th>Rate</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const r =
                    parseFloat(String(it.rate)) > 0
                      ? parseFloat(String(it.rate))
                      : parseFloat(rate) || 0;
                  return (
                    <tr key={i}>
                      <td>
                        {it.task}
                        {it.detail && <div className="meta-line">{it.detail}</div>}
                      </td>
                      <td>{it.low}</td>
                      <td>{it.high}</td>
                      {type === 'tm' && showPricing && <td>{r > 0 ? `$${r}/hr` : ''}</td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div
              style={{
                textAlign: 'right',
                fontFamily: 'Sora',
                fontSize: 20,
                fontWeight: 700,
                color: th.primary,
                marginTop: 12,
              }}
            >
              {totLow}–{totHigh} hrs
            </div>

            {type === 'fixed' && parseFloat(fixedPrice) > 0 && (
              <div style={{ textAlign: 'right', fontSize: 13.5, color: '#555' }}>
                Fixed price: {money(parseFloat(fixedPrice))} (excludes Zoho licences)
              </div>
            )}
            {type === 'tm' && showPricing && inv.high > 0 && (
              <div style={{ textAlign: 'right', fontSize: 13.5, color: '#555' }}>
                Estimated investment{' '}
                {inv.mixed ? 'at the line rates shown' : `at $${rate}/hr`}: {money(inv.low)} –{' '}
                {money(inv.high)}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Client acceptance</h2>
        {pr.accepted ? (
          <div>
            <span className="pill green">Accepted ✓</span>
            <div style={{ marginTop: 8 }}>
              By <strong>{pr.accepted.name}</strong> on {fmtDate(pr.accepted.at)}
            </div>
          </div>
        ) : pr.published ? (
          <span className="pill amber">Awaiting client acceptance</span>
        ) : (
          <span className="meta-line">Not published yet.</span>
        )}
      </div>
    </>
  );
}
