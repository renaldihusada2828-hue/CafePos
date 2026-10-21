import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Nav items per role
const ADMIN_NAV = [
  {
    section: "Operasional",
    items: [
      { label: "Dashboard",        href: "/dashboard",    icon: "grid" },
      { label: "Kasir / POS",      href: "/pos",          icon: "shoppingcart" },
      { label: "Riwayat Transaksi",href: "/transactions", icon: "receipt" },
      { label: "Laporan",          href: "/reports",      icon: "barchart" },
    ],
  },
  {
    section: "Manajemen",
    items: [
      { label: "Produk & Menu",    href: "/products",   icon: "coffee" },
      { label: "Inventory Bahan",  href: "/inventory",  icon: "package" },
      { label: "Resep",            href: "/recipes",    icon: "clipboard" },
      { label: "Pengguna",         href: "/users",      icon: "users" },
    ],
  },
  {
    section: "Sistem",
    items: [
      { label: "Audit Log",        href: "/audit",    icon: "shield" },
      { label: "Pengaturan Akun",  href: "/settings", icon: "settings" },
    ],
  },
];

const CASHIER_NAV = [
  {
    section: "Kasir",
    items: [
      { label: "Kasir / POS",       href: "/pos",          icon: "shoppingcart" },
      { label: "Riwayat Transaksi", href: "/transactions", icon: "receipt" },
    ],
  },
  {
    section: "Akun",
    items: [
      { label: "Pengaturan Akun", href: "/settings", icon: "settings" },
    ],
  },
];

// Inline SVG icons — keeps bundle small, no extra dep needed
function Icon({ name }: { name: string }) {
  const icons: Record<string, string> = {
    grid:         `<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>`,
    shoppingcart: `<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>`,
    receipt:      `<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/><path d="M9 7h6M9 11h6M9 15h4"/>`,
    barchart:     `<line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>`,
    coffee:       `<path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/>`,
    package:      `<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>`,
    clipboard:    `<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>`,
    users:        `<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
    shield:       `<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>`,
    settings:     `<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>`,
    logout:       `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>`,
  };
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: icons[name] ?? "" }}
    />
  );
}

export default async function Sidebar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("role, display_name, must_change_password")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const isAdmin = profile?.role === "admin";
  const nav     = isAdmin ? ADMIN_NAV : CASHIER_NAV;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-logo">M<span>ë</span>lek<span>Cafe</span></div>
        <div className="sidebar-tagline">Seribu Kenikmatan disetiap Seruputan.</div>
      </div>

      <div className="sidebar-user">
        <strong>{profile?.display_name || user?.email || "Pengguna"}</strong>
        <span className={`sidebar-role ${isAdmin ? "admin" : "cashier"}`}>
          {isAdmin ? "Admin / Owner" : "Kasir"}
        </span>
        {profile?.must_change_password && (
          <div style={{ marginTop: 6, fontSize: 11, color: "#ffaaaa" }}>
            ⚠ Ganti password segera
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        {nav.map((section) => (
          <div key={section.section}>
            <div className="nav-section-label">{section.section}</div>
            {section.items.map((item) => (
              <Link key={item.href} href={item.href} className="nav-link">
                <Icon name={item.icon} />
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="btn btn-ghost"
            style={{ width: "100%", fontSize: 13, justifyContent: "center" }}
          >
            <Icon name="logout" />
            Logout
          </button>
        </form>
      </div>
    </aside>
  );
}
