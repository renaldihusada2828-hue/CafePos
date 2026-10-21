"use client";
import { useState } from "react";

export default function SettingsPage() {
  const [current, setCurrent] = useState("");
  const [newPw,   setNewPw]   = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw,  setShowPw]  = useState(false);
  const [busy,    setBusy]    = useState(false);
  const [msg,     setMsg]     = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    if (newPw !== confirm) {
      setMsg({ type: "error", text: "Password baru dan konfirmasi tidak cocok." });
      return;
    }
    if (newPw.length < 12) {
      setMsg({ type: "error", text: "Password baru minimal 12 karakter." });
      return;
    }

    setBusy(true);
    const res  = await fetch("/api/settings", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ current_password: current, new_password: newPw }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMsg({ type: "error", text: json.error ?? "Gagal mengubah password." });
      setBusy(false);
      return;
    }

    setMsg({ type: "success", text: "Password berhasil diubah. Gunakan password baru saat login berikutnya." });
    setCurrent(""); setNewPw(""); setConfirm("");
    setBusy(false);
  }

  const pwStrength = (): string => {
    if (!newPw) return "";
    const has = (r: RegExp) => r.test(newPw);
    const score = [newPw.length >= 12, newPw.length >= 16, has(/[A-Z]/), has(/[0-9]/), has(/[^A-Za-z0-9]/)].filter(Boolean).length;
    if (score <= 2) return "Lemah";
    if (score <= 3) return "Sedang";
    return "Kuat";
  };

  const strengthColor = () => {
    const s = pwStrength();
    return s === "Kuat" ? "var(--green)" : s === "Sedang" ? "var(--amber)" : "var(--red)";
  };

  return (
    <>
      <div className="topbar">
        <div><h1>Pengaturan Akun</h1><p className="sub">Kelola keamanan akun kamu.</p></div>
      </div>

      <div className="card" style={{ maxWidth: 480 }}>
        <h2 style={{ marginBottom: 6 }}>Ganti Password</h2>
        <p className="muted" style={{ marginBottom: 18 }}>
          Password minimal 12 karakter. Gunakan kombinasi huruf besar/kecil, angka, dan simbol untuk keamanan lebih baik.
        </p>

        {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

        <form onSubmit={changePassword}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Password Saat Ini</label>
            <input
              type={showPw ? "text" : "password"}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <div className="field" style={{ marginBottom: 6 }}>
            <label>Password Baru</label>
            <input
              type={showPw ? "text" : "password"}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
            />
            {newPw && (
              <div style={{ fontSize: 12, marginTop: 4, color: strengthColor() }}>
                Kekuatan: <strong>{pwStrength()}</strong>
              </div>
            )}
          </div>

          <div className="field" style={{ marginBottom: 14 }}>
            <label>Konfirmasi Password Baru</label>
            <input
              type={showPw ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={12}
              required
            />
            {confirm && newPw !== confirm && (
              <div style={{ fontSize: 12, color: "var(--red)", marginTop: 4 }}>Password tidak cocok.</div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <input type="checkbox" id="showpw" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} style={{ width: 15, height: 15 }} />
            <label htmlFor="showpw" style={{ fontSize: 13, cursor: "pointer" }}>Tampilkan password</label>
          </div>

          <button
            type="submit"
            className="btn btn-lg"
            style={{ width: "100%" }}
            disabled={busy || !current || !newPw || !confirm || newPw !== confirm}
          >
            {busy ? "Menyimpan..." : "Ubah Password"}
          </button>
        </form>
      </div>
    </>
  );
}
