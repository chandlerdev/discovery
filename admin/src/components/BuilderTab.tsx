'use client';

import { api } from '@/lib/api';
import { DEFAULT_SECTIONS } from '@/lib/defaults';
import type { QuestionType, Section, TabProps } from '@/lib/types';

const Q_TYPES: QuestionType[] = [
  'text',
  'textarea',
  'date',
  'radio',
  'checkbox',
  'scale',
  'table',
];

export default function BuilderTab({ auth, sections, setSections, cid, clients, say }: TabProps) {
  const canEdit = auth.role === 'admin' || auth.role === 'consultant';
  const company = clients.find((c) => c.id === cid)?.company || cid;

  /** Structured-clone edit helper so mutations never touch the current state object. */
  const upd = (fn: (draft: Section[]) => void) =>
    setSections((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });

  const slugId = (label: string, all: Set<string>) => {
    const base =
      (label || 'q')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 28) || 'q';
    let id = base;
    let n = 1;
    while (all.has(id)) id = base + '_' + ++n;
    return id;
  };

  async function publish() {
    if (!cid) {
      say('Select a client first (on the Overview tab)');
      return;
    }
    const payload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.name,
      sections,
    };
    await api.saveClientQuestionnaire(cid, payload, auth.token);
    say(`Published — ${company}'s questionnaire updated`);
  }

  function download() {
    const blob = new Blob([JSON.stringify({ version: 1, sections }, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `questionnaire-${cid || 'definition'}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function restore() {
    if (!cid) {
      say('Select a client first (on the Overview tab)');
      return;
    }
    if (
      !confirm(
        `Restore the built-in default questionnaire for ${company}? Their published edits will be replaced.`,
      )
    )
      return;
    setSections(structuredClone(DEFAULT_SECTIONS));
    const payload = {
      version: 1,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.name,
      sections: DEFAULT_SECTIONS,
    };
    await api.saveClientQuestionnaire(cid, payload, auth.token);
    say(`Default questionnaire restored & published for ${company}`);
  }

  if (!canEdit)
    return (
      <div className="panel">
        <p className="meta-line">
          Only Admin and Functional Consultant can edit the questionnaire.
        </p>
      </div>
    );

  if (!cid)
    return (
      <div className="panel">
        <p className="meta-line">
          Select a client on the Overview tab to edit their questionnaire.
        </p>
      </div>
    );

  const allIds = new Set(sections.flatMap((s) => (s.questions || []).map((q) => q.id)));

  return (
    <div className="panel">
      <div className="toolrow">
        <div style={{ flex: 1 }}>
          <h2>Questionnaire builder</h2>
          <span className="meta-line">
            Editing questionnaire for <strong>{company}</strong>
          </span>
        </div>
        <button
          className="btn btn-ghost"
          onClick={() =>
            upd((s) =>
              s.push({ id: 'sec_' + Date.now().toString(36), title: 'New section', questions: [] }),
            )
          }
        >
          + Add section
        </button>
        <button className="btn btn-ghost" onClick={download}>
          Download JSON
        </button>
        <button className="btn btn-danger" onClick={restore}>
          Restore default
        </button>
        <button className="btn btn-primary" onClick={publish}>
          Publish to this client
        </button>
      </div>
      <p className="sub">
        Add, edit, reorder, or remove sections and questions. Publishing updates{' '}
        <strong>{company}</strong>&apos;s questionnaire immediately — other clients are unaffected.
        Answers are keyed to question IDs, so rewording keeps existing responses.
      </p>

      {sections.map((s, si) => (
        <div
          key={si}
          style={{
            border: '1.5px solid var(--mist)',
            borderRadius: 12,
            padding: 14,
            marginBottom: 14,
            background: '#FDFEFB',
          }}
        >
          <div className="toolrow" style={{ marginBottom: 12 }}>
            <span
              style={{
                fontFamily: 'Sora',
                fontWeight: 700,
                background: 'var(--leaf)',
                color: 'var(--lime)',
                borderRadius: 8,
                padding: '6px 11px',
                fontSize: 13,
              }}
            >
              {String.fromCharCode(65 + si)}
            </span>
            <input
              type="text"
              style={{ flex: 1, fontWeight: 600 }}
              value={s.title}
              onChange={(e) => upd((x) => { x[si].title = e.target.value; })}
            />
            <button
              className="btn btn-ghost"
              onClick={() =>
                si > 0 && upd((x) => { [x[si - 1], x[si]] = [x[si], x[si - 1]]; })
              }
            >
              ↑
            </button>
            <button
              className="btn btn-ghost"
              onClick={() =>
                si < sections.length - 1 &&
                upd((x) => { [x[si + 1], x[si]] = [x[si], x[si + 1]]; })
              }
            >
              ↓
            </button>
            <button
              className="btn btn-danger"
              onClick={() =>
                confirm('Delete this section and its questions?') && upd((x) => x.splice(si, 1))
              }
            >
              ✕
            </button>
          </div>

          {(s.questions || []).map((q, qi) => (
            <div
              key={q.id}
              style={{
                border: '1px solid var(--mist)',
                borderRadius: 10,
                background: '#fff',
                padding: 11,
                marginBottom: 9,
                display: 'grid',
                gridTemplateColumns: '1fr 160px auto',
                gap: 9,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <input
                  type="text"
                  value={q.label}
                  placeholder="Question label"
                  onChange={(e) =>
                    upd((x) => { x[si].questions[qi].label = e.target.value; })
                  }
                />
                <input
                  type="text"
                  value={q.hint || ''}
                  placeholder="Hint (optional)"
                  onChange={(e) => upd((x) => { x[si].questions[qi].hint = e.target.value; })}
                />
                <input
                  type="text"
                  value={(q.options || []).join(' | ')}
                  placeholder="Separate with | — options (radio/checkbox/scale) or columns (table)"
                  onChange={(e) =>
                    upd((x) => {
                      x[si].questions[qi].options = e.target.value
                        .split('|')
                        .map((v) => v.trim())
                        .filter(Boolean);
                    })
                  }
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <select
                  value={q.type}
                  onChange={(e) =>
                    upd((x) => {
                      x[si].questions[qi].type = e.target.value as QuestionType;
                    })
                  }
                >
                  {Q_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <label
                  style={{
                    display: 'flex',
                    gap: 6,
                    alignItems: 'center',
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!q.required}
                    style={{ width: 15, height: 15 }}
                    onChange={(e) =>
                      upd((x) => { x[si].questions[qi].required = e.target.checked; })
                    }
                  />{' '}
                  Required
                </label>
                <span
                  className="meta-line"
                  style={{ fontFamily: 'monospace', fontSize: 11 }}
                >
                  id: {q.id}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button
                  className="btn btn-ghost"
                  onClick={() =>
                    qi > 0 &&
                    upd((x) => {
                      const a = x[si].questions;
                      [a[qi - 1], a[qi]] = [a[qi], a[qi - 1]];
                    })
                  }
                >
                  ↑
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() =>
                    qi < s.questions.length - 1 &&
                    upd((x) => {
                      const a = x[si].questions;
                      [a[qi + 1], a[qi]] = [a[qi], a[qi + 1]];
                    })
                  }
                >
                  ↓
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() =>
                    confirm('Delete this question?') &&
                    upd((x) => x[si].questions.splice(qi, 1))
                  }
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          <button
            className="btn btn-ghost"
            onClick={() =>
              upd((x) =>
                x[si].questions.push({
                  id: slugId('new_question', allIds),
                  type: 'text',
                  required: false,
                  label: 'New question',
                  hint: '',
                  options: [],
                }),
              )
            }
          >
            + Add question
          </button>
        </div>
      ))}

      <button className="btn btn-primary" onClick={publish}>
        Publish to this client
      </button>
    </div>
  );
}
