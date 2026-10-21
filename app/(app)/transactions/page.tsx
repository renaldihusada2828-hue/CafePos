import { createClient } from "@/lib/supabase/server";
import { formatIDR, formatDateTimeJakarta } from "@/lib/currency";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  const isAdmin = profile?.role === "admin";

  let query = supabase
    .from("sales")
    .select(`
      id, receipt_number, total_amount, payment_method,
      payment_status, status, created_at, cashier_id,
      profiles!cashier_id ( display_name )
    `)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!isAdmin) query = query.eq("cashier_id", user?.id ?? "");

  const { data: sales } = await query;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Riwayat Transaksi</h1>
          <p className="sub">{isAdmin ? "Semua transaksi" : "Transaksi kamu"} — 200 terbaru</p>
        </div>
        {isAdmin && (
          <Link href="/reports" className="btn btn-ghost">
            Laporan lengkap
          </Link>
        )}
      </div>

      <div className="card">
        {(!sales || sales.length === 0) ? (
          <div className="empty-state">
            <p>Belum ada transaksi.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nomor Struk</th>
                  {isAdmin && <th>Kasir</th>}
                  <th>Waktu</th>
                  <th>Total</th>
                  <th>Metode</th>
                  <th>Pembayaran</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((s) => (
                  <tr key={s.id} style={{ opacity: s.status === "voided" ? 0.55 : 1 }}>
                    <td>
                      <Link href={`/transactions/${s.id}`} className="text-red semibold">
                        {s.receipt_number}
                      </Link>
                    </td>
                    {isAdmin && (
                      <td className="muted">
                        {((s.profiles as unknown) as { display_name: string } | null)?.display_name ?? "—"}
                      </td>
                    )}
                    <td className="muted">{formatDateTimeJakarta(s.created_at)}</td>
                    <td><strong>{formatIDR(Number(s.total_amount))}</strong></td>
                    <td style={{ textTransform: "capitalize" }}>{s.payment_method}</td>
                    <td>
                      {s.payment_status === "paid"      ? <span className="badge badge-green">Lunas</span>
                      : s.payment_status === "pending"  ? <span className="badge badge-amber">Pending</span>
                      : <span className="badge badge-gray">Dibatalkan</span>}
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
  );
}
