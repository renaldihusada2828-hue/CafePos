import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/adminGuard";
import { z } from "zod";

const patchSchema = z.object({
  name:        z.string().min(1).max(100).trim().optional(),
  category:    z.string().max(60).optional(),
  price:       z.number().nonnegative().optional(),
  description: z.string().max(500).optional(),
  is_active:   z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const parsed = patchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });

  const { data, error } = await supabase
    .from("products")
    .update(parsed.data)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
