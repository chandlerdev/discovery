'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { fmtDate } from '@/lib/defaults';
import type { AdminUser } from '@/lib/types';
import EyeIcon from './EyeIcon';

interface UsersTabProps {
  say: (msg: string) => void;
}

export default function UsersTab({ say }: UsersTabProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  /** userId -> revealed plaintext. Absent = hidden. */
  const [revealed, setRevealed] = useState<Record<number, string>>({});
  const [revealing, setRevealing] = useState<number | null>(null);

  // Add-user form
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  // Inline edit — one row at a time.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [eName, setEName] = useState('');
  const [eUsername, setEUsername] = useState('');
  const [eEmail, setEEmail] = useState('');
  const [ePassword, setEPassword] = useState('');
  const [eShowPw, setEShowPw] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  // Mirrors editingId for the async password fetch, so a late-resolving reveal
  // can tell whether the user is still editing the same row.
  const editingIdRef = useRef<number | null>(null);

  const reload = useCallback(async () => {
    const list = await api.listAdminUsers().catch(() => null);
    setUsers(list || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function togglePassword(id: number) {
    if (revealed[id] !== undefined) {
      setRevealed((r) => {
        const next = { ...r };
        delete next[id];
        return next;
      });
      return;
    }
    setRevealing(id);
    try {
      const pw = await api.revealAdminPassword(id);
      if (pw === null) {
        say('Password unavailable for this user');
        return;
      }
      setRevealed((r) => ({ ...r, [id]: pw }));
    } catch {
      say('Could not reveal the password');
    } finally {
      setRevealing(null);
    }
  }

  async function create() {
    if (!username.trim() || !fullName.trim() || !password) {
      say('Username, full name and password are required');
      return;
    }
    setBusy(true);
    try {
      await api.createAdminUser({
        username: username.trim(),
        password,
        fullName: fullName.trim(),
        email: email.trim(),
        role: 'ADMIN',
      });
      setUsername('');
      setFullName('');
      setEmail('');
      setPassword('');
      await reload();
      say('User created');
    } catch (e) {
      say(e instanceof Error ? e.message : 'Could not create user');
    } finally {
      setBusy(false);
    }
  }

  async function startEdit(u: AdminUser) {
    setEditingId(u.id);
    editingIdRef.current = u.id;
    setEName(u.fullName);
    setEUsername(u.username);
    setEEmail(u.email || '');
    setEShowPw(false);
    // Pre-fill the current password. Reuse an already-revealed value if we have one,
    // otherwise fetch it so the field shows the old password instead of a blank.
    if (revealed[u.id] !== undefined) {
      setEPassword(revealed[u.id]);
      return;
    }
    setEPassword('');
    try {
      const pw = await api.revealAdminPassword(u.id);
      // Only apply if the user is still editing this same row.
      if (pw !== null && editingIdRef.current === u.id) setEPassword(pw);
    } catch {
      // Password unavailable (e.g. legacy hash) — leave blank; blank keeps it on save.
    }
  }

  function cancelEdit() {
    setEditingId(null);
    editingIdRef.current = null;
    setSavingEdit(false);
  }

  async function saveEdit(u: AdminUser) {
    if (!eUsername.trim() || !eName.trim()) {
      say('Username and full name are required');
      return;
    }
    setSavingEdit(true);
    try {
      await api.updateAdminUser(u.id, {
        username: eUsername.trim(),
        fullName: eName.trim(),
        email: eEmail.trim(),
        password: ePassword, // blank keeps the existing password
        role: u.role,
      });
      // Drop any revealed plaintext for this row — it may now be stale.
      setRevealed((r) => {
        const next = { ...r };
        delete next[u.id];
        return next;
      });
      setEditingId(null);
      editingIdRef.current = null;
      await reload();
      say('User updated');
    } catch (e) {
      say(e instanceof Error ? e.message : 'Could not update user');
    } finally {
      setSavingEdit(false);
    }
  }

  async function remove(id: number, name: string) {
    if (!confirm(`Remove ${name}? They will no longer be able to sign in.`)) return;
    await api.deleteAdminUser(id);
    await reload();
    say('User removed');
  }

  return (
    <>
      <div className="panel">
        <h2>Add an admin user</h2>
        <p className="sub">
          Creates a team login with the Admin role. You can view the password any time with the
          eye button in the table below.
        </p>
        <div className="toolrow" style={{ alignItems: 'stretch', gap: 12 }}>
          <input
            type="text"
            style={{ flex: 1, minWidth: 150 }}
            placeholder="Username *"
            autoComplete="off"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="text"
            style={{ flex: 1, minWidth: 150 }}
            placeholder="Full name *"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <input
            type="text"
            style={{ flex: 1, minWidth: 160 }}
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="Password *"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              style={{ paddingRight: 40 }}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              title={showPw ? 'Hide password' : 'Show password'}
              aria-label={showPw ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                right: 6,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--muted)',
                display: 'flex',
                alignItems: 'center',
                padding: 4,
              }}
            >
              <EyeIcon off={showPw} size={18} />
            </button>
          </div>
          {/* Only one role for now. */}
          <select style={{ flex: '0 0 130px' }} value="ADMIN" disabled>
            <option value="ADMIN">Admin</option>
          </select>
          <button
            className="btn btn-primary"
            style={{ flex: '0 0 auto' }}
            disabled={busy}
            onClick={create}
          >
            {busy ? 'Adding...' : 'Add user'}
          </button>
        </div>
        <p className="meta-line" style={{ marginTop: 10 }}>
          <span style={{ color: 'var(--clay)' }}>*</span> required &middot; Minimum 6 characters.
        </p>
      </div>

      <div className="panel">
        <h2>All admin users</h2>
        <div style={{ overflowX: 'auto' }}>
          <table className="est">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th style={{ minWidth: 170 }}>Password</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="meta-line">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={8} className="meta-line">
                    No users yet.
                  </td>
                </tr>
              )}
              {users.map((u) => {
                const isEditing = editingId === u.id;
                return (
                  <tr key={u.id}>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          style={{ minWidth: 120, width: '100%' }}
                          placeholder="Full name *"
                          value={eName}
                          onChange={(e) => setEName(e.target.value)}
                        />
                      ) : (
                        <strong>{u.fullName}</strong>
                      )}
                    </td>
                    <td className="meta-line">
                      {isEditing ? (
                        <input
                          type="text"
                          style={{ minWidth: 110, width: '100%' }}
                          placeholder="Username *"
                          autoComplete="off"
                          value={eUsername}
                          onChange={(e) => setEUsername(e.target.value)}
                        />
                      ) : (
                        u.username
                      )}
                    </td>
                    <td className="meta-line">
                      {isEditing ? (
                        <input
                          type="text"
                          style={{ minWidth: 130, width: '100%' }}
                          placeholder="Email (optional)"
                          value={eEmail}
                          onChange={(e) => setEEmail(e.target.value)}
                        />
                      ) : (
                        u.email || '—'
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <div style={{ position: 'relative', minWidth: 150 }}>
                          <input
                            type={eShowPw ? 'text' : 'password'}
                            placeholder="Password (blank = keep)"
                            autoComplete="new-password"
                            value={ePassword}
                            onChange={(e) => setEPassword(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEdit(u)}
                            style={{ paddingRight: 36, width: '100%' }}
                          />
                          <button
                            type="button"
                            onClick={() => setEShowPw((v) => !v)}
                            title={eShowPw ? 'Hide password' : 'Show password'}
                            aria-label={eShowPw ? 'Hide password' : 'Show password'}
                            style={{
                              position: 'absolute',
                              right: 6,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: 'var(--muted)',
                              display: 'flex',
                              alignItems: 'center',
                              padding: 4,
                            }}
                          >
                            <EyeIcon off={eShowPw} size={16} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <code
                            style={{
                              fontFamily: "'JetBrains Mono','Consolas',monospace",
                              fontSize: 12.5,
                              letterSpacing: revealed[u.id] ? 0 : 1.5,
                              color: revealed[u.id] ? 'var(--leaf)' : 'var(--muted)',
                              fontWeight: revealed[u.id] ? 700 : 400,
                            }}
                          >
                            {revealed[u.id] ?? '••••••••'}
                          </code>
                          <button
                            className="btn btn-ghost"
                            style={{
                              padding: '5px 9px',
                              display: 'flex',
                              alignItems: 'center',
                              color: 'var(--muted)',
                            }}
                            onClick={() => togglePassword(u.id)}
                            disabled={revealing === u.id}
                            title={revealed[u.id] ? 'Hide password' : 'Show password'}
                            aria-label={revealed[u.id] ? 'Hide password' : 'Show password'}
                          >
                            {revealing === u.id ? (
                              '...'
                            ) : (
                              <EyeIcon off={!!revealed[u.id]} size={17} />
                            )}
                          </button>
                        </div>
                      )}
                    </td>
                    <td>{u.role}</td>
                    <td>{u.status}</td>
                    <td className="meta-line">{u.createdAt ? fmtDate(u.createdAt) : '—'}</td>
                    <td>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-primary"
                            style={{ padding: '7px 12px', fontSize: 13 }}
                            onClick={() => saveEdit(u)}
                            disabled={savingEdit}
                          >
                            {savingEdit ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '7px 12px', fontSize: 13 }}
                            onClick={cancelEdit}
                            disabled={savingEdit}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-ghost"
                            style={{
                              padding: '7px 10px',
                              display: 'flex',
                              alignItems: 'center',
                              color: 'var(--muted)',
                            }}
                            onClick={() => startEdit(u)}
                            disabled={editingId !== null}
                            title="Edit user"
                            aria-label={`Edit ${u.fullName}`}
                          >
                            <svg
                              width={16}
                              height={16}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                            </svg>
                          </button>
                          <button
                            className="btn btn-danger"
                            style={{ padding: '7px 12px', fontSize: 13 }}
                            onClick={() => remove(u.id, u.fullName)}
                            disabled={editingId !== null}
                            title="Remove user"
                            aria-label={`Remove ${u.fullName}`}
                          >
                            &times;
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
