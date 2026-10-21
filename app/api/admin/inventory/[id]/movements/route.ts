import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/adminGuard";

// GET /api/admin/inventory/[id]/movements?limit=50
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const url   = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50"), 200);

  const { data, error } = await supabase
    .from("stock_movements")
    .select(`
      id, movement_type, quantity_change, quantity_before, quantity_after,
      reference_id, note, created_at,
      profiles!actor_id ( display_name, login_id )
    `)
    .eq("raw_material_id", params.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
