"use client";
import { useState } from "react";
import { formatIDR } from "@/lib/currency";

type SaleRow = {
  id: string; receipt_number: string; total_amount: string;
  payment_method: string; payment_status: string; status: string;
  created_at: string; profiles?: { display_name: string } | null;
};

type TopProduct = { name: string; qty: number; revenue: number };

type ReportData = {
  from: string; to: string;
  total_completed:  number;
  total_voided:     number;
  total_revenue:    number;
  by_payment_method: Record<string, number>;
  top_products:     TopProduct[];
  sales:            SaleRow[];
};

function today() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
}

export default function ReportsPage() {
  const [from,    setFrom]    = useState(today());
  const [to,      setTo]      = useState(today());
  const [data,    setData]    = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function load() {
    setError(""); setLoading(true);
    const res = await fetch(`/api/reports?from=${from}&to=${to}`);
    if (!res.ok) { setError("Gagal memuat laporan."); setLoading(false); return; }
    setData(await res.json());
    setLoading(false);
  }

  function downloadCSV() {
    window.location.href = `/api/reports?from=${from}&to=${to}&format=csv`;
  }

  const avg = data && data.total_completed > 0 ? data.total_revenue / data.total_completed : 0;

  return (
    <>
      <div className="topbar">
        <div><h1>Laporan Penjualan</h1><p className="sub">Data aktual dari database. Zona waktu WIB (Asia/Jakarta).</p></div>
      </div>

      {/* Date range filter */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ margin: 0 }}>
            <label>Dari Tanggal</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label>Sampai Tanggal</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button className="btn" onClick={load} disabled={loading}>{loading ? "Memuat..." : "Tampilkan"}</button>
          {data && <button className="btn btn-ghost" onClick={downloadCSV}>↓ Unduh CSV</button>}
        </div>
        {error && <div className="alert alert-error" style={{ marginTop: 12 }}>{error}</div>}
      </div>

      {data && (
        <>
          {/* Summary cards */}
          <div className="grid-4" style={{ marginBottom: 18 }}>
            <div className="metric-card">
              <div className="metric-label">Transaksi Selesai</div>
              <div className="metric-value">{data.total_completed}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Total Pendapatan</div>
              <div className="metric-value">{formatIDR(data.total_revenue)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Rata-rata Transaksi</div>
              <div className="metric-value">{formatIDR(avg)}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Transaksi Void</div>
              <div className="metric-value" style={{ color: data.total_voided > 0 ? "var(--red)" : "inherit" }}>
                {data.total_voided}
              </div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            {/* Payment breakdown */}
            <div className="card">
              <h2 style={{ marginBottom: 14 }}>Per Metode Pembayaran</h2>
              {Object.keys(data.by_payment_method).length === 0 ? (
                <p className="muted">Tidak ada data pembayaran.</p>
              ) : Object.entries(data.by_payment_method).map(([method, total]) => (
                <div key={method} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
                  <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{method}</span>
                  <strong>{formatIDR(total)}</strong>
                </div>
              ))}
            </div>

            {/* Top products */}
            <div className="card">
              <h2 style={{ marginBottom: 14 }}>Produk Terlaris</h2>
              {data.top_products.length === 0 ? (
                <p className="muted">Tidak ada data.</p>
              ) : (
                <table>
                  <thead><tr><th>Produk</th><th>Qty</th><th>Pendapatan</th></tr></thead>
                  <tbody>
                    {data.top_products.map((p) => (
                      <tr key={p.name}>
                        <td>{p.name}</td>
                        <td>{p.qty}</td>
                        <td>{formatIDR(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* All transactions */}
          <div className="card">
            <div className="section-header">
              <h2>Detail Semua Transaksi ({data.sales.length})</h2>
            </div>
            {data.sales.length === 0 ? (
              <div className="empty-state"><p>Tidak ada transaksi pada periode ini.</p></div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Struk</th><th>Waktu</th><th>Kasir</th>
                      <th>Total</th><th>Metode</th><th>Bayar</th><th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sales.map((s) => (
                      <tr key={s.id} style={{ opacity: s.status === "voided" ? 0.55 : 1 }}>
                        <td>
                          <a href={`/transactions/${s.id}`} className="text-red semibold">{s.receipt_number}</a>
                        </td>
                        <td className="muted">
                          {new Date(s.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}
                        </td>
                        <td>{(s.profiles as { display_name: string } | null)?.display_name ?? "—"}</td>
                        <td>{formatIDR(Number(s.total_amount))}</td>
                        <td style={{ textTransform: "capitalize" }}>{s.payment_method}</td>
                        <td>
                          {s.payment_status === "paid"
                            ? <span className="badge badge-green">Lunas</span>
                            : <span className="badge badge-amber">Pending</span>}
                        </td>
                        <td>
                          {s.status === "voided"
                            ? <span className="badge badge-red">Void</span>
                            : <span className="badge badge-green">Selesai</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
