import LoginForm from "@/components/auth/LoginForm";

export const metadata = { title: "Login — MelekCafe POS" };

export default function LoginPage() {
  return (
    <div className="login-shell">
      <div className="login-brand">
        <div>
          <div className="login-brand-name">M<span>ë</span>lek<span>Cafe</span></div>
          <div className="login-brand-tagline">Seribu Kenikmatan disetiap Seruputan.</div>
        </div>
        <div>
          <p className="login-brand-footer">Sistem Kasir &amp; Manajemen Inventori</p>
          <p className="login-brand-footer" style={{ marginTop: 4, fontSize: 11 }}>
            Hubungi owner untuk mendapatkan akses.
          </p>
        </div>
      </div>
      <div className="login-form-wrap">
        <LoginForm />
      </div>
    </div>
  );
}
