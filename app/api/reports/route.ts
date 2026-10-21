import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/adminGuard";
import { startOfDayJakarta, endOfDayJakarta, todayStringJakarta } from "@/lib/currency";

export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const url    = new URL(req.url);
  const from   = url.searchParams.get("from") ?? todayStringJakarta();
  const to     = url.searchParams.get("to")   ?? todayStringJakarta();
  const format = url.searchParams.get("format") ?? "json";

  // Parse dates
  const fromDate  = new Date(from + "T00:00:00");
  const toDate    = new Date(to   + "T00:00:00");
  const fromTs    = startOfDayJakarta(fromDate);
  const toTs      = endOfDayJakarta(toDate);

  const { data: sales, error } = await supabase
    .from("sales")
    .select(`
      id, receipt_number, total_amount, payment_method,
      payment_status, status, created_at, cashier_id,
      profiles!cashier_id ( display_name, login_id ),
      sale_items ( product_name_snapshot, quantity, unit_price, line_total )
    `)
    .gte("created_at", fromTs)
    .lte("created_at", toTs)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const all       = sales ?? [];
  const completed = all.filter((s) => s.status === "completed");
  const voided    = all.filter((s) => s.status === "voided");

  // Best-selling products
  const productTotals: Record<string, { name: string; qty: number; revenue: number }> = {};
  for (const sale of completed) {
    for (const item of (sale.sale_items ?? [])) {
      const key = item.product_name_snapshot;
      if (!productTotals[key])
        productTotals[key] = { name: key, qty: 0, revenue: 0 };
      productTotals[key].qty     += item.quantity;
      productTotals[key].revenue += Number(item.line_total);
    }
  }
  const topProducts = Object.values(productTotals)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  if (format === "csv") {
    const lines = [
      "Nomor Struk,Tanggal,Kasir,Total,Metode,Status Bayar,Status Transaksi",
      ...all.map((s) => {
        const p = (s.profiles as unknown) as { display_name: string } | null;
        const dt = new Date(s.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
        return [
          `"${s.receipt_number}"`,
          `"${dt}"`,
          `"${p?.display_name ?? "-"}"`,
          s.total_amount,
          s.payment_method,
          s.payment_status,
          s.status,
        ].join(",");
      }),
    ];
    return new NextResponse(lines.join("\r\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan-${from}-${to}.csv"`,
      },
    });
  }

  return NextResponse.json({
    from, to,
    total_completed:  completed.length,
    total_voided:     voided.length,
    total_revenue:    completed.reduce((s, x) => s + Number(x.total_amount), 0),
    by_payment_method: completed.reduce<Record<string, number>>((acc, s) => {
      acc[s.payment_method] = (acc[s.payment_method] ?? 0) + Number(s.total_amount);
      return acc;
    }, {}),
    top_products: topProducts,
    sales: all,
  });
}
