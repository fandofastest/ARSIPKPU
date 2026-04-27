'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';

type UserItem = {
  _id: string;
  nama: string;
  nip: string | null;
  golongan: string | null;
  jabatan: string | null;
  phone: string;
  role: 'admin' | 'staff' | 'viewer';
  unit: string | null;
  createdAt: string;
};

type ListResp =
  | { success: true; data: UserItem[] }
  | { error: string };

type CreateResp =
  | { success: true; data: UserItem }
  | {
      error: string;
      details?: {
        formErrors?: string[];
        fieldErrors?: Record<string, string[] | undefined>;
      };
    };

type UpdateResp =
  | { success: true; data: UserItem }
  | { error: string; details?: unknown };

export default function UsersPage() {
  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createNama, setCreateNama] = useState('');
  const [createNip, setCreateNip] = useState('');
  const [createGolongan, setCreateGolongan] = useState('');
  const [createJabatan, setCreateJabatan] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<UserItem['role']>('staff');
  const [createUnit, setCreateUnit] = useState('');
  const [createSaving, setCreateSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editNip, setEditNip] = useState('');
  const [editGolongan, setEditGolongan] = useState('');
  const [editJabatan, setEditJabatan] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserItem['role']>('staff');
  const [editUnit, setEditUnit] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteSaving, setDeleteSaving] = useState(false);

  function refresh() {
    setLoading(true);
    setError(null);
    fetch('/api/users', { credentials: 'include' })
      .then((r) => r.json() as Promise<ListResp>)
      .then((d) => {
        if ('success' in d) {
          setItems(d.data);
        } else {
          setError(d.error);
        }
      })
      .catch(() => setError('Failed to load users'))
      .finally(() => setLoading(false));
  }

  function formatCreateUserError(json: CreateResp): string {
    if (!('error' in json)) return 'Failed to create user';
    const details = json.details;
    if (!details) return json.error;
    const fieldErrors = details.fieldErrors || {};
    const msgMap: Array<[string, string]> = [
      ['nama', 'Nama wajib diisi'],
      ['nip', 'NIP wajib diisi (3-40 karakter)'],
      ['phone', 'Phone wajib diisi (minimal 5 karakter)'],
      ['password', 'Password minimal 6 karakter'],
      ['role', 'Role harus dipilih']
    ];
    const hits = msgMap
      .filter(([key]) => Array.isArray(fieldErrors[key]) && fieldErrors[key]!.length)
      .map(([, msg]) => msg);
    if (hits.length) return `Input tidak valid: ${hits.join(', ')}`;
    return json.error;
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    function onDocPointerDown(e: PointerEvent) {
      const t = e.target as Element | null;
      if (t && typeof t.closest === 'function' && t.closest('.menuWrap')) return;
      setOpenMenuId(null);
    }
    document.addEventListener('pointerdown', onDocPointerDown, true);
    return () => document.removeEventListener('pointerdown', onDocPointerDown, true);
  }, []);

  function openCreate() {
    setMessage(null);
    setError(null);
    setCreateNama('');
    setCreateNip('');
    setCreateGolongan('');
    setCreateJabatan('');
    setCreatePhone('');
    setCreatePassword('');
    setCreateRole('staff');
    setCreateUnit('');
    setCreateOpen(true);
  }

  async function createUser() {
    setMessage(null);
    setError(null);
    setCreateSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: createNama.trim(),
          nip: createNip.trim(),
          golongan: createGolongan.trim() ? createGolongan.trim() : undefined,
          jabatan: createJabatan.trim() ? createJabatan.trim() : undefined,
          phone: createPhone.trim(),
          password: createPassword.trim(),
          role: createRole,
          unit: createUnit.trim() ? createUnit.trim() : undefined
        })
      });
      const json = (await res.json()) as CreateResp;
      if (!res.ok) {
        setError(formatCreateUserError(json));
        return;
      }
      setCreateOpen(false);
      setMessage('User created');
      refresh();
    } catch {
      setError('Failed to create user');
    } finally {
      setCreateSaving(false);
    }
  }

  function openEdit(u: UserItem) {
    setMessage(null);
    setError(null);
    setEditId(u._id);
    setEditNama(u.nama);
    setEditNip(u.nip ?? '');
    setEditGolongan(u.golongan ?? '');
    setEditJabatan(u.jabatan ?? '');
    setEditPhone(u.phone);
    setEditRole(u.role);
    setEditUnit(u.unit ?? '');
    setEditPassword('');
    setEditOpen(true);
  }

  async function saveEdit() {
    if (!editId) return;
    setEditSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        nama: editNama,
        nip: editNip.trim(),
        golongan: editGolongan.trim() ? editGolongan.trim() : null,
        jabatan: editJabatan.trim() ? editJabatan.trim() : null,
        phone: editPhone,
        role: editRole,
        unit: editUnit.trim() ? editUnit.trim() : null
      };
      if (editPassword.trim()) payload.password = editPassword.trim();

      const res = await fetch(`/api/users/${editId}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = (await res.json()) as UpdateResp;
      if (!res.ok) {
        setError('error' in json ? json.error : 'Failed to update user');
        return;
      }
      setEditOpen(false);
      setEditId(null);
      setMessage('User updated');
      refresh();
    } catch {
      setError('Failed to update user');
    } finally {
      setEditSaving(false);
    }
  }

  function openDelete(u: UserItem) {
    setMessage(null);
    setError(null);
    setDeleteId(u._id);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setDeleteSaving(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/users/${deleteId}`, { method: 'DELETE', credentials: 'include' });
      const json = (await res.json()) as { success?: true; error?: string };
      if (!res.ok) {
        setError(json?.error || 'Failed to delete user');
        return;
      }
      setDeleteOpen(false);
      setDeleteId(null);
      setMessage('User deleted');
      refresh();
    } catch {
      setError('Failed to delete user');
    } finally {
      setDeleteSaving(false);
    }
  }

  return (
    <AppShell>
      <div className="container">
        <div className="row" style={{ alignItems: 'end', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ marginBottom: 6 }}>Users</h1>
            <div style={{ color: 'var(--muted)' }}>Admin only</div>
          </div>
          <button className="btn" type="button" onClick={openCreate}>
            Add User
          </button>
        </div>

        <div style={{ height: 12 }} />

        {message ? <div style={{ color: '#16a34a' }}>{message}</div> : null}
        {error ? <div style={{ color: '#ef4444' }}>{error}</div> : null}

        <div style={{ height: 16 }} />

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>User List</h2>
            <button className="btn btnSecondary" type="button" onClick={refresh} disabled={loading}>
              Refresh
            </button>
          </div>

          <div style={{ height: 12 }} />

          {loading ? <div style={{ color: '#9ca3af' }}>Loading…</div> : null}

          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>NIP</th>
                <th>Gol</th>
                <th>Jabatan</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Unit</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u._id}>
                  <td>{u.nama}</td>
                  <td>{u.nip || '-'}</td>
                  <td>{u.golongan || '-'}</td>
                  <td>{u.jabatan || '-'}</td>
                  <td>{u.phone}</td>
                  <td>{u.role}</td>
                  <td>{u.unit || '-'}</td>
                  <td>{new Date(u.createdAt).toLocaleString()}</td>
                  <td>
                    <div className="menuWrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btnSecondary"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId((cur) => (cur === u._id ? null : u._id));
                        }}
                      >
                        ⋯
                      </button>
                      {openMenuId === u._id ? (
                        <div className="menu" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="menuItem"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              openEdit(u);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="menuItem"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(null);
                              openDelete(u);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && !loading ? (
                <tr>
                  <td colSpan={9} style={{ color: 'var(--muted)' }}>
                    No users
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {createOpen ? (
          <div className="modalOverlay" onClick={() => (createSaving ? null : setCreateOpen(false))}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ marginTop: 0, marginBottom: 0 }}>Create User</h3>
                <button className="btn btnSecondary" type="button" onClick={() => setCreateOpen(false)} disabled={createSaving}>
                  Close
                </button>
              </div>

              <div style={{ height: 12 }} />

              <div
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 10,
                  color: 'var(--muted)',
                  fontSize: 13
                }}
              >
                Wajib diisi: Nama, NIP (3-40), Phone (min 5), Password (min 6), Role.
                <br />
                Boleh kosong: Unit, Golongan, Jabatan.
              </div>

              <div style={{ height: 12 }} />

              <div className="row" style={{ alignItems: 'end' }}>
                <label style={{ flex: 1, minWidth: 220 }}>
                  Nama (wajib)
                  <input className="input" value={createNama} onChange={(e) => setCreateNama(e.target.value)} placeholder="Contoh: Budi Santoso" />
                </label>
                <label style={{ flex: 1, minWidth: 220 }}>
                  NIP (wajib, 3-40)
                  <input className="input" value={createNip} onChange={(e) => setCreateNip(e.target.value)} placeholder="Contoh: 199001012020121001" />
                </label>
                <label style={{ flex: 1, minWidth: 220 }}>
                  Phone (wajib, min 5)
                  <input className="input" value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} placeholder="Contoh: 08123456789" />
                </label>
              </div>

              <div style={{ height: 12 }} />

              <div className="row" style={{ alignItems: 'end' }}>
                <label style={{ flex: 1, minWidth: 220 }}>
                  Password (wajib, min 6)
                  <input
                    className="input"
                    type="password"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                  />
                </label>
                <label style={{ width: 180 }}>
                  Role
                  <select className="input" value={createRole} onChange={(e) => setCreateRole(e.target.value as UserItem['role'])}>
                    <option value="admin">admin</option>
                    <option value="staff">staff</option>
                    <option value="viewer">viewer</option>
                  </select>
                </label>
                <label style={{ flex: 1, minWidth: 240 }}>
                  Unit (opsional)
                  <input className="input" value={createUnit} onChange={(e) => setCreateUnit(e.target.value)} placeholder="Contoh: Sekretariat" />
                </label>
                <label style={{ width: 140 }}>
                  Golongan (opsional)
                  <input className="input" value={createGolongan} onChange={(e) => setCreateGolongan(e.target.value)} />
                </label>
                <label style={{ flex: 1, minWidth: 220 }}>
                  Jabatan (opsional)
                  <input className="input" value={createJabatan} onChange={(e) => setCreateJabatan(e.target.value)} />
                </label>
              </div>

              <div style={{ height: 12 }} />

              <button
                className="btn"
                type="button"
                onClick={createUser}
                disabled={
                  !createNama.trim() ||
                  createNip.trim().length < 3 ||
                  createPhone.trim().length < 5 ||
                  createPassword.trim().length < 6 ||
                  createSaving
                }
              >
                {createSaving ? 'Saving…' : 'Create'}
              </button>
            </div>
          </div>
        ) : null}

        {editOpen ? (
          <div className="modalOverlay" onClick={() => (editSaving ? null : setEditOpen(false))}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ marginTop: 0, marginBottom: 0 }}>Edit User</h3>
                <button
                  className="btn btnSecondary"
                  type="button"
                  onClick={() => {
                    setEditOpen(false);
                    setEditId(null);
                  }}
                  disabled={editSaving}
                >
                  Close
                </button>
              </div>

              <div style={{ height: 12 }} />

              <div className="row" style={{ alignItems: 'end' }}>
                <label style={{ flex: 1, minWidth: 220 }}>
                  Nama
                  <input className="input" value={editNama} onChange={(e) => setEditNama(e.target.value)} />
                </label>
                <label style={{ flex: 1, minWidth: 220 }}>
                  NIP
                  <input className="input" value={editNip} onChange={(e) => setEditNip(e.target.value)} />
                </label>
                <label style={{ flex: 1, minWidth: 220 }}>
                  Phone
                  <input className="input" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </label>
              </div>

              <div style={{ height: 12 }} />

              <div className="row" style={{ alignItems: 'end' }}>
                <label style={{ width: 180 }}>
                  Role
                  <select className="input" value={editRole} onChange={(e) => setEditRole(e.target.value as UserItem['role'])}>
                    <option value="admin">admin</option>
                    <option value="staff">staff</option>
                    <option value="viewer">viewer</option>
                  </select>
                </label>
                <label style={{ flex: 1, minWidth: 240 }}>
                  Unit
                  <input className="input" value={editUnit} onChange={(e) => setEditUnit(e.target.value)} />
                </label>
                <label style={{ width: 140 }}>
                  Golongan
                  <input className="input" value={editGolongan} onChange={(e) => setEditGolongan(e.target.value)} />
                </label>
                <label style={{ flex: 1, minWidth: 220 }}>
                  Jabatan
                  <input className="input" value={editJabatan} onChange={(e) => setEditJabatan(e.target.value)} />
                </label>
              </div>

              <div style={{ height: 12 }} />

              <label>
                New Password (optional)
                <input
                  className="input"
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="leave blank to keep current"
                />
              </label>

              <div style={{ height: 12 }} />

              <button className="btn" type="button" onClick={saveEdit} disabled={!editNama || !editNip || !editPhone || editSaving}>
                {editSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : null}

        {deleteOpen ? (
          <div className="modalOverlay" onClick={() => (deleteSaving ? null : setDeleteOpen(false))}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ marginTop: 0, marginBottom: 0 }}>Delete User</h3>
                <button className="btn btnSecondary" type="button" onClick={() => setDeleteOpen(false)} disabled={deleteSaving}>
                  Close
                </button>
              </div>

              <div style={{ height: 12 }} />

              <div style={{ color: 'var(--muted)' }}>Hapus user ini? Aksi ini tidak bisa dibatalkan.</div>

              <div style={{ height: 12 }} />

              <button className="btn" type="button" onClick={confirmDelete} disabled={deleteSaving}>
                {deleteSaving ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
