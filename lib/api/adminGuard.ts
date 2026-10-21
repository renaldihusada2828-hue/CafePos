import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type GuardResult =
  | { ok: true;  supabase: Awaited<ReturnType<typeof createClient>>; userId: string }
  | { ok: false; response: NextResponse };

export async function requireAdmin(): Promise<GuardResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user)
    return { ok: false, response: NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 }) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin" || !profile?.is_active)
    return { ok: false, response: NextResponse.json({ error: "Akses ditolak." }, { status: 403 }) };

  return { ok: true, supabase, userId: user.id };
}

export async function requireAuth(): Promise<GuardResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user)
    return { ok: false, response: NextResponse.json({ error: "Sesi tidak ditemukan." }, { status: 401 }) };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_active)
    return { ok: false, response: NextResponse.json({ error: "Akun tidak aktif." }, { status: 403 }) };

  return { ok: true, supabase, userId: user.id };
}
