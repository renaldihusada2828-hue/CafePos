import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/adminGuard";
import { z } from "zod";

const schema = z.object({
  display_name:         z.string().min(1).max(80).optional(),
  is_active:            z.boolean().optional(),
  role:                 z.enum(["admin", "cashier"]).optional(),
  must_change_password: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { supabase, userId } = guard;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });

  // Prevent self-deactivation
  if (params.id === userId && parsed.data.is_active === false)
    return NextResponse.json({ error: "Tidak dapat menonaktifkan akun sendiri." }, { status: 400 });

  const { data, error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("id", params.id)
    .select("id, login_id, display_name, role, is_active, must_change_password")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
