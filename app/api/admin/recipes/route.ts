import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/adminGuard";
import { z } from "zod";

const schema = z.object({
  product_id: z.string().uuid(),
  notes:      z.string().max(500).default(""),
  is_active:  z.boolean().default(true),
  items: z.array(
    z.object({
      raw_material_id: z.string().uuid(),
      quantity:        z.number().positive(),
      unit:            z.string().max(20).default(""),
    })
  ).min(1),
});

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const { data, error } = await supabase
    .from("recipes")
    .select(`
      id, product_id, notes, is_active, created_at, updated_at,
      products ( id, name, category ),
      recipe_items (
        id, raw_material_id, quantity, unit,
        raw_materials ( id, name, base_unit )
      )
    `)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });

  const { data: recipe, error: rErr } = await supabase
    .from("recipes")
    .insert({ product_id: parsed.data.product_id, notes: parsed.data.notes, is_active: parsed.data.is_active })
    .select()
    .single();

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

  const { error: iErr } = await supabase.from("recipe_items").insert(
    parsed.data.items.map((item) => ({
      recipe_id:       recipe.id,
      raw_material_id: item.raw_material_id,
      quantity:        item.quantity,
      unit:            item.unit,
    }))
  );

  if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
  return NextResponse.json(recipe, { status: 201 });
}
