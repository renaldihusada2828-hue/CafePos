import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatIDR, formatDateTimeJakarta } from "@/lib/currency";
import ReceiptActions from "@/components/transactions/ReceiptActions";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role, display_name").eq("id", user.id).maybeSingle()
    : { data: null };

  const { data: sale } = await supabase
    .from("sales")
    .select(`
      *, sale_items(*),
      profiles!cashier_id ( display_name )
    `)
    .eq("id", params.id)
    .maybeSingle();

  if (!sale) notFound();
  if (profile?.role !== "admin" && sale.cashier_id !== user?.id) notFound();

  const isAdmin  = profile?.role === "admin";
  const isVoided = sale.status === "voided";
  const isPending = sale.payment_status === "pending";

  const change = sale.payment_method === "cash" && sale.amount_received != null
    ? Number(sale.amount_received) - Number(sale.total_amount)
    : null;

  const cashierName = (sale.profiles as { display_name: string } | null)?.display_name ?? "—";

  return (
    <>
      {/* Topbar — hidden when printing */}
      <div className="topbar no-print" style={{ flexWrap: "wrap" }}>
        <div>
          <h1>Struk Transaksi</h1>
          <p className="sub">{sale.receipt_number}</p>
        </div>
        <ReceiptActions
          saleId={sale.id}
          isAdmin={isAdmin}
          isVoided={isVoided}
          isPending={isPending}
        />
      </div>

      {isVoided && (
        <div className="alert alert-error no-print" style={{ marginBottom: 16 }}>
          <strong>Transaksi Dibatalkan (Void)</strong>
          {sale.void_reason && <> — {sale.void_reason}</>}
        </div>
      )}

      {isPending && !isVoided && (
        <div className="alert alert-warning no-print" style={{ marginBottom: 16 }}>
          Pembayaran <strong>{sale.payment_method.toUpperCase()}</strong> belum dikonfirmasi.
          {isAdmin && " Klik \"Konfirmasi Pembayaran\" setelah dana diterima."}
        </div>
      )}

      {/* Receipt */}
      <div className="receipt-wrap">
        <div className="card" style={{ fontFamily: "monospace, monospace" }}>
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: -0.5 }}>
              M<span style={{ color: "var(--red)" }}>ë</span>lekCafe
            </div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
              Seribu Kenikmatan disetiap Seruputan.
            </div>
            <div style={{ borderTop: "1px dashed #ccc", margin: "12px 0" }} />
            <div style={{ fontWeight: 700 }}>{sale.receipt_number}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              {formatDateTimeJakarta(sale.created_at)}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Kasir: {cashierName}
            </div>
          </div>

          <div style={{ borderTop: "1px dashed #ccc", margin: "12px 0" }} />

          {/* Items */}
          <table style={{ width: "100%", fontSize: 13, fontFamily: "monospace" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", fontWeight: 700, paddingBottom: 6, fontSize: 11 }}>PRODUK</th>
                <th style={{ textAlign: "right", fontWeight: 700, paddingBottom: 6, fontSize: 11 }}>QTY</th>
                <th style={{ textAlign: "right", fontWeight: 700, paddingBottom: 6, fontSize: 11 }}>HARGA</th>
                <th style={{ textAlign: "right", fontWeight: 700, paddingBottom: 6, fontSize: 11 }}>SUBTOTAL</th>
              </tr>
            </thead>
            <tbody>
              {(sale.sale_items ?? []).map((item: {
                id: string;
                product_name_snapshot: string;
                quantity: number;
                unit_price: string;
                line_total: string;
              }) => (
                <tr key={item.id}>
                  <td style={{ paddingBottom: 4, paddingRight: 8 }}>{item.product_name_snapshot}</td>
                  <td style={{ textAlign: "right", paddingBottom: 4 }}>{item.quantity}</td>
                  <td style={{ textAlign: "right", paddingBottom: 4 }}>{formatIDR(Number(item.unit_price))}</td>
                  <td style={{ textAlign: "right", paddingBottom: 4, fontWeight: 700 }}>{formatIDR(Number(item.line_total))}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ borderTop: "1px dashed #ccc", margin: "12px 0" }} />

          {/* Totals */}
          <div style={{ fontSize: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 16, marginBottom: 6 }}>
              <span>TOTAL</span>
              <span>{formatIDR(Number(sale.total_amount))}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)", fontSize: 13 }}>
              <span>Metode</span>
              <span style={{ textTransform: "uppercase", fontWeight: 700 }}>{sale.payment_method}</span>
            </div>
            {change !== null && (
              <>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span>Diterima</span>
                  <span>{formatIDR(Number(sale.amount_received))}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
                  <span>Kembalian</span>
                  <span>{formatIDR(change)}</span>
                </div>
              </>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4 }}>
              <span>Status</span>
              <span style={{ fontWeight: 700, color: isVoided ? "var(--red)" : isPending ? "var(--amber)" : "var(--green)" }}>
                {isVoided ? "VOID" : isPending ? "MENUNGGU KONFIRMASI" : "LUNAS"}
              </span>
            </div>
          </div>

          <div style={{ borderTop: "1px dashed #ccc", margin: "14px 0 8px" }} />
          <div style={{ textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
            Terima kasih telah berkunjung ke MelekCafe!
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .sidebar, .topbar { display: none !important; }
          .shell { display: block !important; }
          .main  { padding: 0 !important; }
          .card  { border: none !important; box-shadow: none !important; }
          .receipt-wrap { max-width: 100% !important; }
        }
      `}</style>
    </>
  );
}
