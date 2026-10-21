import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/adminGuard";
import { z } from "zod";

const updateSchema = z.object({
  name:          z.string().min(1).max(100).optional(),
  base_unit:     z.string().min(1).max(20).optional(),
  minimum_stock:  z.number().min(0).optional(),
  cost_per_unit:  z.number().min(0).optional(),
});

const adjustSchema = z.object({
  delta: z.number().refine((v) => v !== 0, "Delta tidak boleh nol."),
  note:  z.string().max(200).default(""),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const body = await req.json().catch(() => null);

  // Stock adjustment via RPC
  if (body && "delta" in body) {
    const parsed = adjustSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });

    const { data, error } = await supabase.rpc("adjust_stock", {
      p_material_id: params.id,
      p_delta:       parsed.data.delta,
      p_note:        parsed.data.note,
    });

    if (error) {
      const msg = error.message.includes("NEGATIVE_STOCK")
        ? "Stok tidak boleh negatif."
        : error.message.includes("MATERIAL_NOT_FOUND")
        ? "Bahan tidak ditemukan."
        : error.message;
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json(data);
  }

  // General update (name, unit, minimum_stock, cost)
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });

  const { data, error } = await supabase
    .from("raw_materials")
    .update(parsed.data)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const { error } = await supabase.from("raw_materials").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
