'use client';

import { useState } from 'react';

interface SignoffCardProps {
  onSignOff: (name: string, comments: string) => Promise<void>;
}

export default function SignoffCard({ onSignOff }: SignoffCardProps) {
  const [name, setName] = useState('');
  const [comments, setComments] = useState('');
  const [agree, setAgree] = useState(false);

  return (
    <div className="panel" style={{ border: '2px solid var(--sprout)', marginTop: 28 }}>
      <h2 style={{ color: 'var(--leaf)' }}>Project handover &amp; sign-off</h2>
      <p className="sub">
        DESSS has completed and handed over the project. Please review the delivered work, then
        sign off to formally close the project.
      </p>

      <label className="f">Your full name</label>
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} />

      <label className="f">Comments (optional)</label>
      <textarea value={comments} onChange={(e) => setComments(e.target.value)} />

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
          onChange={(e) => setAgree(e.target.checked)}
          style={{ width: 18, height: 18 }}
        />
        I confirm the delivered work meets the agreed scope, and I accept the handover of this
        project.
      </label>

      <button
        className="btn btn-primary"
        onClick={() => name.trim() && agree && onSignOff(name.trim(), comments.trim())}
      >
        Sign off &amp; accept handover
      </button>
    </div>
  );
}
