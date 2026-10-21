'use client';

import { useState } from 'react';
import { fmtDate, money } from '@/lib/defaults';
import type { ProjectDoc } from '@/lib/types';

interface ProposalCardProps {
  doc: ProjectDoc;
  onAccept: (name: string, comments: string) => Promise<void>;
}

export default function ProposalCard({ doc, onAccept }: ProposalCardProps) {
  const pr = doc.workflow.proposal;
  const e = doc.workflow.estimate;

  const [name, setName] = useState('');
  const [comments, setComments] = useState('');
  const [agree, setAgree] = useState(false);

  if (!pr.published) return null;

  const th = pr.theme || { primary: '#1B4332', accent: '#C6F26E' };
  const items = pr.items?.length ? pr.items : e.items || [];
  const totLow = pr.items?.length ? pr.totalLow || 0 : e.totalLow || 0;
  const totHigh = pr.items?.length ? pr.totalHigh || 0 : e.totalHigh || 0;

  const showRates =
    pr.type !== 'fixed' &&
    pr.showPricing &&
    (parseFloat(String(pr.rate)) > 0 ||
      items.some((it) => parseFloat(String(it.rate)) > 0));

  let invest = '';
  if (pr.type === 'fixed' && parseFloat(String(pr.fixedPrice)) > 0) {
    invest = `Fixed price: ${money(parseFloat(String(pr.fixedPrice)))} (excludes Zoho licences)`;
  } else if (pr.showPricing && pr.investHigh > 0) {
    invest = `Estimated investment ${
      pr.investMixed ? 'at the line rates shown' : `at $${pr.rate}/hr`
    }: ${money(pr.investLow)} – ${money(
      pr.investHigh,
    )} · Time & Materials, billed on actual hours (excludes Zoho licences)`;
  }

  const acc = pr.accepted;

  return (
    <div
      id="proposalCard"
      style={{
        background: '#fff',
        border: `2px solid ${th.primary}`,
        borderRadius: 14,
        padding: 26,
        marginTop: 30,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            background: th.accent,
            color: th.primary,
            fontFamily: 'Sora',
            fontWeight: 700,
            fontSize: 11.5,
            letterSpacing: '.8px',
            padding: '5px 13px',
            borderRadius: 999,
          }}
        >
          {pr.type === 'fixed' ? 'FIXED PRICE' : 'TIME & MATERIALS'}
        </span>
        <button
          className="btn no-print"
          style={{ background: '#fff', border: `1.5px solid ${th.primary}`, color: th.primary }}
          onClick={() => {
            document.body.classList.add('print-proposal');
            window.print();
            document.body.classList.remove('print-proposal');
          }}
        >
          ⤓ Download PDF
        </button>
      </div>

      <h2 style={{ color: th.primary, marginTop: 8 }}>
        Solution Proposal · Zoho CRM Plus Implementation
      </h2>
      <p className="sub">
        Prepared for {doc.meta.customer} by DESSS · Applying Technologies.
      </p>

      {pr.note && (
        <div
          style={{
            background: th.accent + '26',
            border: `1.5px solid ${th.accent}66`,
            borderRadius: 10,
            padding: '13px 15px',
            fontSize: 14,
            marginBottom: 16,
          }}
        >
          {pr.note}
        </div>
      )}

      <table className="est">
        <thead>
          <tr>
            <th>Workstream</th>
            <th>Low hrs</th>
            <th>High hrs</th>
            {showRates && <th>Rate</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((it, i) => {
            const r =
              parseFloat(String(it.rate)) > 0
                ? parseFloat(String(it.rate))
                : parseFloat(String(pr.rate)) || 0;
            return (
              <tr key={i}>
                <td>
                  {it.task}
                  {it.detail && <div className="meta-line">{it.detail}</div>}
                </td>
                <td>{it.low}</td>
                <td>{it.high}</td>
                {showRates && <td>{r > 0 ? `$${r}/hr` : ''}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="est-total">
        <span className="meta-line">Total estimated effort</span>
        <span className="num" style={{ color: th.primary }}>
          {totLow}–{totHigh}
        </span>
        <span>hrs</span>
      </div>
      {invest && (
        <div style={{ textAlign: 'right', fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>
          {invest}
        </div>
      )}

      <h3 style={{ color: th.primary, fontSize: 14.5, margin: '20px 0 8px' }}>Assumptions</h3>
      <ul style={{ fontSize: 13.5, paddingLeft: 18 }}>
        <li>Active Zoho One or equivalent licensing covering the in-scope apps.</li>
        <li>
          Existing CRM data is accessible; heavy historical clean-up beyond the included pass is
          scoped separately.
        </li>
        <li>One client stakeholder is available for workshops, reviews, and sign-off.</li>
        <li>
          Sender domain authentication (SPF/DKIM) can be configured for bulk deliverability.
        </li>
        <li>Excludes Zoho licence costs and unlisted third-party integrations.</li>
      </ul>

      <h3 style={{ color: th.primary, fontSize: 14.5, margin: '20px 0 8px' }}>Contacts</h3>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))',
          gap: 12,
          fontSize: 13.5,
        }}
      >
        <div className="answer-row">
          <strong>Trevor Morris</strong>
          <div className="meta-line">President &amp; CEO · Fresh Byte Software</div>
          Phone 832-200-8000 · Mobile 713-501-4667
          <br />
          www.freshbyte.com
        </div>
        <div className="answer-row">
          <strong>Chandler Dev</strong>
          <div className="meta-line">DESSS · Applying Technologies</div>
          dev@desss.com · desss.com
          <br />
          Office (713) 589-6496 · Mobile (713) 557-8001
        </div>
      </div>

      {!acc && doc.workflow.status === 'proposal' && (
        <div className="no-print" style={{ marginTop: 20 }}>
          <h3 style={{ color: th.primary, fontSize: 14.5, marginBottom: 8 }}>
            Accept this proposal
          </h3>
          <label className="f">Your full name</label>
          <input
            type="text"
            value={name}
            onChange={(e2) => setName(e2.target.value)}
            placeholder="e.g. Trevor Morris"
          />
          <label className="f">Comments (optional)</label>
          <textarea value={comments} onChange={(e2) => setComments(e2.target.value)} />
          <label
            style={{
              display: 'flex',
              gap: 10,
              alignItems: 'flex-start',
              margin: '14px 0',
              fontSize: 14,
            }}
          >
            <input
              type="checkbox"
              checked={agree}
              onChange={(e2) => setAgree(e2.target.checked)}
              style={{ width: 18, height: 18 }}
            />
            I accept this proposal and the estimated effort, and authorize DESSS to proceed.
          </label>
          <button
            className="btn btn-primary"
            style={{ background: th.primary, color: th.accent }}
            onClick={() => name.trim() && agree && onAccept(name.trim(), comments.trim())}
          >
            Accept proposal &amp; proceed
          </button>
        </div>
      )}

      {acc && (
        <div
          style={{
            background: th.accent + '26',
            borderRadius: 10,
            padding: '13px 15px',
            fontSize: 14,
            marginTop: 16,
          }}
        >
          Accepted by {acc.name} on {fmtDate(acc.at)}. DESSS will be in touch to schedule the
          discovery workshop.
        </div>
      )}
    </div>
  );
}
