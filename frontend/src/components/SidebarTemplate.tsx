'use client';

import { useEffect, useRef, useState } from 'react';
import { completion } from '@/lib/defaults';
import type { Answers, AnswerValue, Question as QuestionModel, Section } from '@/lib/types';
import TableField from './TableField';

interface SidebarTemplateProps {
  sections: Section[];
  answers: Answers;
  onChange: (id: string, v: AnswerValue) => void;
}

/**
 * Alternative questionnaire layout: a sticky left rail listing every section with its
 * completion %, and a right column of numbered questions grouped under section headers.
 */
export default function SidebarTemplate({ sections, answers, onChange }: SidebarTemplateProps) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  const pcts = sections.map((s) => completion([s], answers));

  function go(i: number) {
    setActive(i);
    refs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // Highlight the section currently in view as the reader scrolls.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = refs.current.findIndex((r) => r === e.target);
            if (idx >= 0) setActive(idx);
          }
        });
      },
      { rootMargin: '-15% 0px -75% 0px', threshold: 0 },
    );
    refs.current.forEach((r) => r && obs.observe(r));
    return () => obs.disconnect();
  }, [sections]);

  return (
    <div
      style={{
        // Full-bleed like the header: left rail starts at the header's left edge and the
        // content reaches the right edge with matching spacing.
        display: 'flex',
        gap: 24,
        alignItems: 'flex-start',
        padding: '24px clamp(18px,5vw,56px) 60px',
      }}
    >
      {/* Section rail */}
      <aside
        className="qnav"
        style={{
          position: 'sticky',
          top: 16,
          width: 290,
          flex: '0 0 290px',
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
          background: 'var(--card)',
          border: '1px solid var(--mist)',
          borderRadius: 'var(--radius)',
          padding: 12,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '.6px',
            color: 'var(--muted)',
            textTransform: 'uppercase',
            padding: '6px 8px 10px',
          }}
        >
          Sections
        </div>
        {sections.map((s, i) => {
          const on = active === i;
          return (
            <button
              key={s.id || i}
              onClick={() => go(i)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                textAlign: 'left',
                background: on ? 'var(--leaf)' : 'transparent',
                color: on ? '#EFFAE9' : 'var(--ink)',
                border: 'none',
                borderRadius: 10,
                padding: '10px',
                cursor: 'pointer',
                marginBottom: 2,
                font: 'inherit',
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  flex: '0 0 24px',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  background: on ? 'var(--lime)' : 'var(--mist)',
                  color: on ? 'var(--leaf)' : 'var(--muted)',
                }}
              >
                {i + 1}
              </span>
              <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, lineHeight: 1.3 }}>
                {s.title}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: on ? 'var(--lime)' : 'var(--muted)',
                }}
              >
                {pcts[i]}%
              </span>
            </button>
          );
        })}
      </aside>

      {/* Question column */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {sections.map((s, si) => (
          <div
            key={s.id || si}
            ref={(el) => {
              refs.current[si] = el;
            }}
            style={{
              background: 'var(--card)',
              border: '1px solid var(--mist)',
              borderRadius: 'var(--radius)',
              padding: '22px 24px',
              marginBottom: 20,
              scrollMarginTop: 16,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '.8px',
                color: 'var(--clay)',
                textTransform: 'uppercase',
              }}
            >
              Section {si + 1}
            </div>
            <h2 style={{ fontSize: 24, margin: '6px 0 8px' }}>{s.title}</h2>

            {(s.questions || []).map((q, qi) => (
              <div
                key={q.id}
                style={{
                  display: 'flex',
                  gap: 14,
                  padding: '18px 0',
                  borderTop: qi ? '1px solid var(--mist)' : '1px solid var(--mist)',
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    flex: '0 0 28px',
                    borderRadius: 8,
                    background: 'var(--mist)',
                    color: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {qi + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>
                    {q.label}
                    {q.required && <span style={{ color: 'var(--clay)' }}> *</span>}
                  </div>
                  {q.hint && (
                    <div style={{ fontSize: 13.5, color: 'var(--muted)', marginTop: 4 }}>
                      {q.hint}
                    </div>
                  )}
                  <div style={{ marginTop: 10 }}>
                    <Field q={q} value={answers[q.id]} onChange={(v) => onChange(q.id, v)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** The answer control for one question — same inputs as the classic card, no card wrapper. */
function Field({
  q,
  value,
  onChange,
}: {
  q: QuestionModel;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
}) {
  const text = typeof value === 'string' ? value : '';

  if (q.type === 'textarea')
    return <textarea value={text} onChange={(e) => onChange(e.target.value)} />;
  if (q.type === 'text')
    return <input type="text" value={text} onChange={(e) => onChange(e.target.value)} />;
  if (q.type === 'date')
    return <input type="date" value={text} onChange={(e) => onChange(e.target.value)} />;

  if (q.type === 'radio' || q.type === 'scale')
    return (
      <div className="choices" role="radiogroup">
        {(q.options || []).map((o) => (
          <label key={o} className={'choice' + (value === o ? ' on' : '')}>
            <input type="radio" checked={value === o} onChange={() => onChange(o)} />
            <span>{o}</span>
          </label>
        ))}
        {q.ends && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'var(--muted)',
            }}
          >
            <span>{q.ends[0]}</span>
            <span>{q.ends[1]}</span>
          </div>
        )}
      </div>
    );

  if (q.type === 'checkbox')
    return (
      <div className="choices grid" role="group">
        {(q.options || []).map((o) => {
          const arr = Array.isArray(value) ? (value as string[]) : [];
          const on = arr.includes(o);
          return (
            <label key={o} className={'choice' + (on ? ' on' : '')}>
              <input
                type="checkbox"
                checked={on}
                onChange={() => onChange(on ? arr.filter((x) => x !== o) : [...arr, o])}
              />
              <span>{o}</span>
            </label>
          );
        })}
      </div>
    );

  if (q.type === 'table')
    return (
      <TableField
        columns={q.options || []}
        value={Array.isArray(value) && Array.isArray(value[0]) ? (value as string[][]) : undefined}
        onChange={(g) => onChange(g)}
      />
    );

  return null;
}
