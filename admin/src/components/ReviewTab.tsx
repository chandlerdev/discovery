'use client';

import { useState } from 'react';
import { answerText, completion, isAnswered } from '@/lib/defaults';
import type { Answers, AnswerValue, Question, TabProps } from '@/lib/types';
import TableField from './TableField';

export default function ReviewTab({ auth, doc, persist, sections, say }: TabProps) {
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<Answers>({});
  const [notes, setNotes] = useState(doc.review.notes || '');
  const canEdit = auth.role === 'admin' || auth.role === 'consultant';

  function startEdit() {
    setDraft({ ...doc.answers });
    setEdit(true);
  }

  async function saveAnswers() {
    await persist({ ...doc, answers: draft }, 'Discovery answers filled/updated in portal');
    setEdit(false);
    say('Answers saved to the client record');
  }

  async function saveNotes() {
    await persist(
      { ...doc, review: { ...doc.review, notes } },
      'Consultant saved discovery notes',
    );
    say('Notes saved');
  }

  async function markReviewed() {
    const wf = doc.workflow;
    await persist(
      {
        ...doc,
        review: { notes, complete: true, by: auth.name, at: new Date().toISOString() },
        workflow: { ...wf, status: wf.status === 'discovery' ? 'review' : wf.status },
      },
      'Discovery marked reviewed',
    );
    say('Discovery marked reviewed');
  }

  return (
    <>
      <div className="panel">
        <div className="toolrow">
          <h2 style={{ flex: 1 }}>Client questionnaire responses</h2>
          <span className="pill green">
            {completion(sections, edit ? draft : doc.answers)}% complete
          </span>
          {canEdit && !edit && (
            <button className="btn btn-ghost" onClick={startEdit}>
              ✎ Fill answers (on behalf of client)
            </button>
          )}
          {edit && (
            <button className="btn btn-primary" onClick={saveAnswers}>
              Save answers
            </button>
          )}
        </div>
        <p className="sub">
          {edit
            ? 'Editing mode — this writes to the same record the client sees.'
            : 'Read-only. The client updates answers from their own link, or use "Fill answers" during a discovery call.'}
        </p>

        {sections.map((s, si) =>
          (s.questions || []).map((q) => {
            const v = (edit ? draft : doc.answers)[q.id];
            return (
              <div className="answer-row" key={q.id}>
                <div className="q">
                  Section {String.fromCharCode(65 + si)} · {q.label}
                </div>
                {!edit &&
                  (q.type === 'table' ? (
                    isAnswered(v) ? (
                      <TableField
                        columns={q.options || []}
                        value={
                          Array.isArray(v) && Array.isArray(v[0]) ? (v as string[][]) : undefined
                        }
                        readOnly
                      />
                    ) : (
                      <div className="a empty">Not answered yet</div>
                    )
                  ) : (
                    <div className={'a' + (isAnswered(v) ? '' : ' empty')}>
                      {isAnswered(v) ? answerText(v) : 'Not answered yet'}
                    </div>
                  ))}
                {edit && (
                  <EditControl
                    q={q}
                    value={v}
                    onChange={(nv) => setDraft((d) => ({ ...d, [q.id]: nv }))}
                  />
                )}
              </div>
            );
          }),
        )}
      </div>

      <div className="panel">
        <h2>Consultant review</h2>
        <label className="f">Discovery notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Key requirements, open questions, scope boundaries…"
        />
        <div className="toolrow" style={{ marginTop: 14 }}>
          <button className="btn btn-ghost" onClick={saveNotes}>
            Save notes
          </button>
          <button className="btn btn-primary" onClick={markReviewed}>
            Mark discovery reviewed ✓
          </button>
          <span className="meta-line">
            {doc.review.complete
              ? `Reviewed by ${doc.review.by}`
              : 'Not yet marked reviewed.'}
          </span>
        </div>
      </div>
    </>
  );
}

interface EditControlProps {
  q: Question;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
}

function EditControl({ q, value, onChange }: EditControlProps) {
  const text = typeof value === 'string' ? value : '';

  if (q.type === 'textarea')
    return (
      <textarea
        style={{ marginTop: 6 }}
        value={text}
        onChange={(e) => onChange(e.target.value)}
      />
    );

  if (q.type === 'date')
    return (
      <input
        type="date"
        style={{ marginTop: 6, maxWidth: 220 }}
        value={text}
        onChange={(e) => onChange(e.target.value)}
      />
    );

  if (q.type === 'radio' || q.type === 'scale')
    return (
      <select
        style={{ marginTop: 6, maxWidth: 420 }}
        value={text}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">— not answered —</option>
        {(q.options || []).map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    );

  if (q.type === 'checkbox') {
    const arr = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
        {(q.options || []).map((o) => (
          <label key={o} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13.5 }}>
            <input
              type="checkbox"
              style={{ width: 15, height: 15 }}
              checked={arr.includes(o)}
              onChange={() =>
                onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o])
              }
            />{' '}
            {o}
          </label>
        ))}
      </div>
    );
  }

  if (q.type === 'table')
    return (
      <TableField
        columns={q.options || []}
        value={
          Array.isArray(value) && Array.isArray(value[0]) ? (value as string[][]) : undefined
        }
        onChange={(g) => onChange(g)}
      />
    );

  return (
    <input
      type="text"
      style={{ marginTop: 6 }}
      value={text}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
