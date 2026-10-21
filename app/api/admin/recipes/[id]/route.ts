import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/adminGuard";
import { z } from "zod";

const patchSchema = z.object({
  notes:     z.string().max(500).optional(),
  is_active: z.boolean().optional(),
  items: z.array(
    z.object({
      raw_material_id: z.string().uuid(),
      quantity:        z.number().positive(),
      unit:            z.string().max(20).default(""),
    })
  ).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });

  if (parsed.data.notes !== undefined || parsed.data.is_active !== undefined) {
    const update: Record<string, unknown> = {};
    if (parsed.data.notes     !== undefined) update.notes     = parsed.data.notes;
    if (parsed.data.is_active !== undefined) update.is_active = parsed.data.is_active;
    await supabase.from("recipes").update(update).eq("id", params.id);
  }

  if (parsed.data.items !== undefined) {
    await supabase.from("recipe_items").delete().eq("recipe_id", params.id);
    if (parsed.data.items.length > 0) {
      const { error } = await supabase.from("recipe_items").insert(
        parsed.data.items.map((item) => ({
          recipe_id:       params.id,
          raw_material_id: item.raw_material_id,
          quantity:        item.quantity,
          unit:            item.unit,
        }))
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const { data } = await supabase
    .from("recipes")
    .select("*, recipe_items(*, raw_materials(name, base_unit))")
    .eq("id", params.id)
    .single();

  return NextResponse.json(data);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const { error } = await supabase.from("recipes").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
