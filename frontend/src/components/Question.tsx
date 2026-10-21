'use client';

import { isAnswered } from '@/lib/defaults';
import type { AnswerValue, Question as QuestionModel } from '@/lib/types';
import TableField from './TableField';

interface QuestionProps {
  q: QuestionModel;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
}

export default function Question({ q, value, onChange }: QuestionProps) {
  const answered = isAnswered(value);
  const text = typeof value === 'string' ? value : '';

  return (
    <div className={'qcard' + (answered ? ' answered' : '')}>
      <div className="qtitle">
        {q.label}
        {q.required && <span className="req"> *</span>}
      </div>
      {q.hint && <div className="qhint">{q.hint}</div>}

      {q.type === 'textarea' && (
        <textarea value={text} onChange={(e) => onChange(e.target.value)} />
      )}
      {q.type === 'text' && (
        <input type="text" value={text} onChange={(e) => onChange(e.target.value)} />
      )}
      {q.type === 'date' && (
        <input type="date" value={text} onChange={(e) => onChange(e.target.value)} />
      )}

      {(q.type === 'radio' || q.type === 'scale') && (
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
      )}

      {q.type === 'checkbox' && (
        <div className="choices grid" role="group">
          {(q.options || []).map((o) => {
            const arr = Array.isArray(value) ? (value as string[]) : [];
            const on = arr.includes(o);
            return (
              <label key={o} className={'choice' + (on ? ' on' : '')}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    onChange(on ? arr.filter((x) => x !== o) : [...arr, o])
                  }
                />
                <span>{o}</span>
              </label>
            );
          })}
        </div>
      )}

      {q.type === 'table' && (
        <TableField
          columns={q.options || []}
          value={Array.isArray(value) && Array.isArray(value[0]) ? (value as string[][]) : undefined}
          onChange={(g) => onChange(g)}
        />
      )}
    </div>
  );
}
