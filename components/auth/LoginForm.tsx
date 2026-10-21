"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const [loginId,  setLoginId]  = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [busy,     setBusy]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setBusy(true);

    try {
      // Step 1: Resolve auth_email from login_id (server validates)
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loginId: loginId.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login gagal. Periksa ID dan password.");
        setBusy(false);
        return;
      }

      // Step 2: Sign in with Supabase Auth
      const supabase = createClient();
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: data.email,
        password,
      });

      if (authErr) {
        setError("ID atau password salah. Coba lagi.");
        setBusy(false);
        return;
      }

      // Redirect to dashboard
      window.location.href = "/dashboard";
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
      setBusy(false);
    }
  }

  return (
    <div className="login-card">
      <h2>Masuk ke MelekCafe POS</h2>
      <p className="sub">Gunakan ID dan password yang diberikan oleh owner.</p>

      {error && <div className="alert alert-error" role="alert">{error}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="field" style={{ marginBottom: 14 }}>
          <label htmlFor="loginId">ID Kasir / Login ID</label>
          <input
            id="loginId"
            type="text"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            placeholder="Contoh: kasir01"
            autoComplete="username"
            autoFocus
            required
          />
        </div>

        <div className="field" style={{ marginBottom: 14 }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password kamu"
            autoComplete="current-password"
            required
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <input
            type="checkbox"
            id="showpw"
            checked={showPw}
            onChange={(e) => setShowPw(e.target.checked)}
            style={{ width: 15, height: 15, cursor: "pointer" }}
          />
          <label htmlFor="showpw" style={{ fontSize: 13, cursor: "pointer", color: "#555" }}>
            Tampilkan password
          </label>
        </div>

        <button
          type="submit"
          className="btn btn-lg"
          style={{ width: "100%" }}
          disabled={busy || !loginId.trim() || !password}
        >
          {busy ? "Masuk..." : "Masuk"}
        </button>
      </form>
    </div>
  );
}
