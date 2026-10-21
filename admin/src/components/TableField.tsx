'use client';

interface TableFieldProps {
  /** Column headers (from the question's options). */
  columns: string[];
  /** Current value: rows × cols grid of strings. */
  value: string[][] | undefined;
  onChange?: (grid: string[][]) => void;
  /** Read-only render (no inputs, no add/remove) — used in the admin review. */
  readOnly?: boolean;
  /** Minimum empty rows to show when there's nothing yet. */
  minRows?: number;
}

/** Normalises a stored value into a rectangular grid of the right column count. */
function toGrid(value: string[][] | undefined, cols: number, minRows: number): string[][] {
  const src = Array.isArray(value) && Array.isArray(value[0]) ? value : [];
  const rows = src.map((r) => {
    const rr = Array.isArray(r) ? [...r] : [];
    while (rr.length < cols) rr.push('');
    return rr.slice(0, cols);
  });
  while (rows.length < minRows) rows.push(Array(cols).fill(''));
  return rows;
}

/**
 * A dynamic table input: fixed column headers, editable cells, and a ＋ Add row button.
 * The answer is stored as a rows × cols array of strings.
 */
export default function TableField({
  columns,
  value,
  onChange,
  readOnly = false,
  minRows = 3,
}: TableFieldProps) {
  const cols = columns.length ? columns : ['Value'];
  const grid = toGrid(value, cols.length, readOnly ? 0 : minRows);

  function setCell(ri: number, ci: number, v: string) {
    const next = grid.map((r) => [...r]);
    next[ri][ci] = v;
    onChange?.(next);
  }
  function addRow() {
    onChange?.([...grid, Array(cols.length).fill('')]);
  }
  function removeRow(ri: number) {
    onChange?.(grid.filter((_, i) => i !== ri));
  }

  const th: React.CSSProperties = {
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--muted)',
    padding: '8px 10px',
    borderBottom: '1px solid var(--mist)',
    background: '#FDFEFB',
    whiteSpace: 'nowrap',
  };
  const td: React.CSSProperties = { padding: 0, borderBottom: '1px solid var(--mist)' };
  const cellInput: React.CSSProperties = {
    width: '100%',
    minWidth: 120,
    border: 'none',
    background: 'transparent',
    padding: '8px 10px',
    font: 'inherit',
    color: 'var(--ink)',
  };

  return (
    <div style={{ marginTop: 8 }}>
      <div
        style={{
          overflowX: 'auto',
          border: '1px solid var(--mist)',
          borderRadius: 10,
        }}
      >
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 320 }}>
          <thead>
            <tr>
              {cols.map((c, i) => (
                <th key={i} style={th}>
                  {c}
                </th>
              ))}
              {!readOnly && <th style={{ ...th, width: 34 }} aria-hidden />}
            </tr>
          </thead>
          <tbody>
            {grid.length === 0 && (
              <tr>
                <td
                  colSpan={cols.length}
                  style={{ ...td, padding: '10px 12px', color: 'var(--muted)', fontSize: 13.5 }}
                >
                  —
                </td>
              </tr>
            )}
            {grid.map((row, ri) => (
              <tr key={ri}>
                {cols.map((_, ci) => (
                  <td
                    key={ci}
                    style={{ ...td, borderRight: ci < cols.length - 1 ? '1px solid var(--mist)' : 'none' }}
                  >
                    {readOnly ? (
                      <div style={{ padding: '8px 10px', minWidth: 120 }}>{row[ci] || '—'}</div>
                    ) : (
                      <input
                        type="text"
                        value={row[ci] ?? ''}
                        onChange={(e) => setCell(ri, ci, e.target.value)}
                        style={cellInput}
                      />
                    )}
                  </td>
                ))}
                {!readOnly && (
                  <td style={{ ...td, textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => removeRow(ri)}
                      title="Remove row"
                      aria-label="Remove row"
                      style={{
                        border: 'none',
                        background: 'none',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        fontSize: 16,
                        padding: '6px 8px',
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!readOnly && (
        <button
          type="button"
          onClick={addRow}
          style={{
            marginTop: 8,
            border: '1px dashed var(--mist)',
            background: '#fff',
            color: 'var(--leaf)',
            borderRadius: 8,
            padding: '7px 14px',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ＋ Add row
        </button>
      )}
    </div>
  );
}
