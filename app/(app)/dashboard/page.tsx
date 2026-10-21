import { createClient } from "@/lib/supabase/server";
import { formatIDR, startOfDayJakarta } from "@/lib/currency";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role, display_name").eq("id", user.id).maybeSingle()
    : { data: null };

  const isAdmin = profile?.role === "admin";

  // ─── Admin metrics ──────────────────────────────────────────
  let totalRevenue     = 0;
  let txCount          = 0;
  let pendingCount     = 0;
  let lowStockItems:   { name: string; stock_quantity: string; minimum_stock: string; base_unit: string }[] = [];
  let recentSales:     { id: string; receipt_number: string; total_amount: string; payment_method: string; payment_status: string; status: string; created_at: string; profiles?: { display_name: string } | null }[] = [];
  const paymentBreakdown: Record<string, number> = {};

  if (isAdmin) {
    const todayStart = startOfDayJakarta();

    const { data: sales } = await supabase
      .from("sales")
      .select("id, total_amount, payment_method, payment_status, status, created_at, receipt_number, profiles!cashier_id(display_name)")
      .gte("created_at", todayStart)
      .order("created_at", { ascending: false })
      .limit(50);

    const completed = (sales ?? []).filter((s) => s.status === "completed");
    txCount      = completed.length;
    totalRevenue = completed.reduce((sum, s) => sum + Number(s.total_amount), 0);
    pendingCount = (sales ?? []).filter((s) => s.payment_status === "pending" && s.status === "completed").length;

    for (const s of completed) {
      paymentBreakdown[s.payment_method] = (paymentBreakdown[s.payment_method] ?? 0) + Number(s.total_amount);
    }

    recentSales = (sales ?? []).slice(0, 8) as unknown as typeof recentSales;

    // Low stock
    const { data: materials } = await supabase
      .from("raw_materials")
      .select("name, stock_quantity, minimum_stock, base_unit")
      .eq("is_active", true);

    lowStockItems = (materials ?? []).filter(
      (m) => Number(m.stock_quantity) <= Number(m.minimum_stock)
    );
  }

  const avgTx = txCount > 0 ? totalRevenue / txCount : 0;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <p className="sub">
            Selamat datang, <strong>{profile?.display_name || "—"}</strong> ·{" "}
            {new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        {isAdmin && (
          <Link href="/pos" className="btn">
            Buka Kasir
          </Link>
        )}
      </div>

      {isAdmin ? (
        <>
          {/* Metric cards */}
          <div className="grid-4" style={{ marginBottom: 20 }}>
            <div className="metric-card">
              <div className="metric-label">Penjualan Hari Ini</div>
              <div className="metric-value">{formatIDR(totalRevenue)}</div>
              <div className="metric-sub">{txCount} transaksi selesai</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Rata-rata Transaksi</div>
              <div className="metric-value">{formatIDR(avgTx)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Menunggu Konfirmasi</div>
              <div className="metric-value" style={{ color: pendingCount > 0 ? "var(--amber)" : "inherit" }}>
                {pendingCount}
              </div>
              <div className="metric-sub">QRIS/Transfer belum dikonfirmasi</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Stok Bahan Kritis</div>
              <div className="metric-value" style={{ color: lowStockItems.length > 0 ? "var(--red)" : "inherit" }}>
                {lowStockItems.length}
              </div>
              <div className="metric-sub">Di bawah atau sama dengan minimum</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, alignItems: "start" }}>
            {/* Recent transactions */}
            <div className="card">
              <div className="section-header">
                <h2>Transaksi Hari Ini</h2>
                <Link href="/transactions" className="btn btn-ghost btn-sm">Lihat semua</Link>
              </div>
              {recentSales.length === 0 ? (
                <div className="empty-state">
                  <p>Belum ada transaksi hari ini.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Struk</th>
                        <th>Waktu</th>
                        <th>Kasir</th>
                        <th>Total</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSales.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <Link href={`/transactions/${s.id}`} className="text-red semibold">
                              {s.receipt_number}
                            </Link>
                          </td>
                          <td className="muted">
                            {new Date(s.created_at).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" })}
                          </td>
                          <td>{(s.profiles as { display_name: string } | null)?.display_name ?? "—"}</td>
                          <td>{formatIDR(Number(s.total_amount))}</td>
                          <td>
                            {s.status === "voided" ? (
                              <span className="badge badge-red">Void</span>
                            ) : s.payment_status === "pending" ? (
                              <span className="badge badge-amber">Pending</span>
                            ) : (
                              <span className="badge badge-green">Lunas</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Right column */}
            <div style={{ display: "grid", gap: 16 }}>
              {/* Payment breakdown */}
              <div className="card">
                <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Metode Pembayaran</h2>
                {Object.keys(paymentBreakdown).length === 0 ? (
                  <p className="muted" style={{ fontSize: 13 }}>Belum ada data.</p>
                ) : (
                  Object.entries(paymentBreakdown).map(([method, total]) => (
                    <div key={method} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                      <span style={{ textTransform: "capitalize" }}>{method}</span>
                      <strong>{formatIDR(total)}</strong>
                    </div>
                  ))
                )}
              </div>

              {/* Low stock */}
              {lowStockItems.length > 0 && (
                <div className="card">
                  <div className="section-header">
                    <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--red)" }}>⚠ Stok Kritis</h2>
                    <Link href="/inventory" className="btn btn-ghost btn-sm">Atur</Link>
                  </div>
                  {lowStockItems.slice(0, 5).map((m) => (
                    <div key={m.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                      <span>{m.name}</span>
                      <span style={{ color: "var(--red)", fontWeight: 700 }}>
                        {Number(m.stock_quantity).toLocaleString("id-ID")} {m.base_unit}
                      </span>
                    </div>
                  ))}
                  {lowStockItems.length > 5 && (
                    <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>+{lowStockItems.length - 5} lainnya</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="card" style={{ maxWidth: 480 }}>
          <h2 style={{ marginBottom: 8 }}>Siap Melayani</h2>
          <p className="muted" style={{ marginBottom: 16 }}>
            Buka halaman kasir untuk memulai transaksi.
          </p>
          <Link href="/pos" className="btn">Buka Kasir / POS</Link>
        </div>
      )}
    </>
  );
}
