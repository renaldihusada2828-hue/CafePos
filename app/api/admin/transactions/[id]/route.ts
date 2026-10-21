import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/adminGuard";
import { z } from "zod";

const voidSchema    = z.object({ action: z.literal("void"),            reason: z.string().min(5).max(300) });
const confirmSchema = z.object({ action: z.literal("confirm_payment") });

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const body = await req.json().catch(() => null);

  if (body?.action === "confirm_payment") {
    const parsed = confirmSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });

    const { error } = await supabase.rpc("confirm_payment", { p_sale_id: params.id });
    if (error) {
      const msg = error.message.includes("ALREADY_PAID") ? "Pembayaran sudah dikonfirmasi."
                : error.message.includes("SALE_VOIDED")  ? "Transaksi sudah dibatalkan."
                : "Gagal mengonfirmasi pembayaran.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  // Default: void_sale
  const parsed = voidSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Alasan pembatalan minimal 5 karakter." }, { status: 400 });

  const { error } = await supabase.rpc("void_sale", {
    p_sale_id: params.id,
    p_reason:  parsed.data.reason,
  });

  if (error) {
    const msg = error.message.includes("ALREADY_VOIDED") ? "Transaksi sudah dibatalkan."
              : error.message.includes("REASON_REQUIRED") ? "Alasan pembatalan wajib diisi."
              : error.message.includes("FORBIDDEN")       ? "Akses ditolak."
              : "Gagal membatalkan transaksi.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
