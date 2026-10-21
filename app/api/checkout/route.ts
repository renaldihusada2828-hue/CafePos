import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const schema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity:  z.number().int().min(1).max(99),
      })
    )
    .min(1)
    .max(100),
  paymentMethod:  z.enum(["cash", "qris", "transfer"]),
  amountReceived: z.number().nonnegative().nullable(),
});

// Friendly error messages for RPC exceptions
function mapRpcError(msg: string): { message: string; status: number } {
  if (msg.includes("RECIPE_MISSING"))      return { message: "Resep untuk produk ini belum dikonfigurasi. Hubungi owner.",   status: 400 };
  if (msg.includes("INSUFFICIENT_STOCK"))  return { message: "Stok bahan baku tidak mencukupi.",                            status: 400 };
  if (msg.includes("PRODUCT_INACTIVE"))    return { message: "Produk tidak aktif dan tidak dapat dijual.",                   status: 400 };
  if (msg.includes("PRODUCT_NOT_FOUND"))   return { message: "Produk tidak ditemukan.",                                      status: 400 };
  if (msg.includes("UNDERPAID"))           return { message: "Uang yang diterima tidak mencukupi total transaksi.",          status: 400 };
  if (msg.includes("ACCESS_DENIED"))       return { message: "Akses ditolak.",                                               status: 403 };
  if (msg.includes("ITEMS_EMPTY"))         return { message: "Keranjang tidak boleh kosong.",                                status: 400 };
  if (msg.includes("MATERIAL_NOT_FOUND"))  return { message: "Bahan baku tidak ditemukan dalam database.",                  status: 400 };
  return { message: "Transaksi gagal diproses. Coba lagi.", status: 500 };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Data transaksi tidak valid." }, { status: 400 });
  }

  const supabase = await createClient();

  // Server-side auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sesi login tidak ditemukan." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_active || !["admin", "cashier"].includes(profile.role ?? "")) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 403 });
  }

  // Delegate to atomic PostgreSQL function
  const { data, error } = await supabase.rpc("checkout_sale", {
    p_items:           parsed.data.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    p_payment_method:  parsed.data.paymentMethod,
    p_amount_received: parsed.data.amountReceived,
  });

  if (error) {
    const mapped = mapRpcError(error.message);
    return NextResponse.json({ error: mapped.message }, { status: mapped.status });
  }

  return NextResponse.json(data, { status: 200 });
}
