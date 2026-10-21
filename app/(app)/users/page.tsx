"use client";
import { useCallback, useEffect, useState } from "react";

type Profile = {
  id: string; login_id: string; display_name: string;
  role: "admin" | "cashier"; is_active: boolean;
  must_change_password: boolean; created_at: string;
};

const EMPTY_FORM = { login_id: "", display_name: "", role: "cashier" as "admin" | "cashier", password: "" };

export default function UsersPage() {
  const [users,   setUsers]   = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy,    setBusy]    = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [msg,     setMsg]     = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function createUser() {
    setMsg(null); setBusy(true);
    const res  = await fetch("/api/admin/users", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(form),
    });
    const json = await res.json();
    if (!res.ok) { setMsg({ type: "error", text: json.error ?? "Gagal." }); setBusy(false); return; }
    setMsg({ type: "success", text: `Akun "${form.login_id}" berhasil dibuat.` });
    setShowCreate(false); setForm(EMPTY_FORM);
    await load(); setBusy(false);
  }

  async function toggleActive(u: Profile) {
    setBusy(true);
    const res  = await fetch(`/api/admin/users/${u.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ is_active: !u.is_active }),
    });
    const json = await res.json();
    if (!res.ok) setMsg({ type: "error", text: json.error ?? "Gagal." });
    await load(); setBusy(false);
  }

  async function forcePasswordChange(u: Profile) {
    setBusy(true);
    await fetch(`/api/admin/users/${u.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ must_change_password: true }),
    });
    setMsg({ type: "success", text: `${u.display_name} wajib ganti password saat login berikutnya.` });
    await load(); setBusy(false);
  }

  return (
    <>
      <div className="topbar">
        <div><h1>Pengguna</h1><p className="sub">Kelola akun admin dan kasir.</p></div>
        <button className="btn" onClick={() => { setShowCreate(true); setForm(EMPTY_FORM); setMsg(null); }}>
          + Tambah Pengguna
        </button>
      </div>

      {showCreate && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginBottom: 6 }}>Buat Akun Baru</h2>
          <p className="muted" style={{ marginBottom: 14 }}>Login ID: huruf kecil, angka, underscore. Password minimal 12 karakter.</p>
          {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div className="field"><label>Login ID</label>
              <input value={form.login_id} onChange={(e) => setForm({ ...form, login_id: e.target.value.toLowerCase() })} placeholder="kasir02" />
            </div>
            <div className="field"><label>Nama Tampil</label>
              <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="Kasir 2" />
            </div>
            <div className="field"><label>Role</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "cashier" })}>
                <option value="cashier">Kasir</option>
                <option value="admin">Admin / Owner</option>
              </select>
            </div>
            <div className="field"><label>Password Awal</label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min. 12 karakter" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn"
              onClick={createUser}
              disabled={busy || !form.login_id || !form.display_name || form.password.length < 12}
            >
              {busy ? "Membuat..." : "Buat Akun"}
            </button>
            <button className="btn btn-ghost" onClick={() => setShowCreate(false)}>Batal</button>
          </div>
        </div>
      )}

      {msg && !showCreate && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      <div className="card">
        {loading ? <p className="muted">Memuat...</p> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Login ID</th><th>Nama</th><th>Role</th><th>Status</th><th>Password</th><th>Dibuat</th><th>Aksi</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.login_id}</strong></td>
                    <td>{u.display_name}</td>
                    <td>
                      <span className={`badge ${u.role === "admin" ? "badge-red" : "badge-blue"}`}>
                        {u.role === "admin" ? "Admin" : "Kasir"}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.is_active ? "badge-green" : "badge-gray"}`}>
                        {u.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td>
                      {u.must_change_password
                        ? <span className="badge badge-amber">Wajib Ganti</span>
                        : <span className="badge badge-green">OK</span>}
                    </td>
                    <td className="muted">{new Date(u.created_at).toLocaleDateString("id-ID")}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(u)} disabled={busy}>
                          {u.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                        {u.is_active && !u.must_change_password && (
                          <button className="btn btn-ghost btn-sm" onClick={() => forcePasswordChange(u)} disabled={busy}>
                            Paksa Ganti PW
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={7} className="muted" style={{ textAlign: "center", padding: 32 }}>Tidak ada pengguna.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
