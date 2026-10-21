import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/adminGuard";
import { z } from "zod";

const createSchema = z.object({
  name:          z.string().min(1).max(100).trim(),
  base_unit:     z.string().min(1).max(20),
  stock_quantity: z.number().min(0).default(0),
  minimum_stock:  z.number().min(0).default(0),
  cost_per_unit:  z.number().min(0).default(0),
});

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const { data, error } = await supabase
    .from("raw_materials")
    .select("*")
    .order("name");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });

  const { data, error } = await supabase
    .from("raw_materials")
    .insert(parsed.data)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
