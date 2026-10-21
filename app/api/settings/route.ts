import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/adminGuard";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";

const schema = z.object({
  current_password: z.string().min(1),
  new_password:     z.string().min(12, "Password baru minimal 12 karakter.").max(128),
});

export async function POST(req: Request) {
  const guard = await requireAuth();
  if (!guard.ok) return guard.response;
  const { supabase, userId } = guard;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("auth_email")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.auth_email)
    return NextResponse.json({ error: "Profil tidak ditemukan." }, { status: 404 });

  // Verify current password using anon key (public credentials verification)
  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const verifyClient = createServiceClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: signInErr } = await verifyClient.auth.signInWithPassword({
    email:    profile.auth_email,
    password: parsed.data.current_password,
  });

  if (signInErr)
    return NextResponse.json({ error: "Password saat ini tidak cocok." }, { status: 400 });

  // Update password
  const { error: updateErr } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
  });
  if (updateErr)
    return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Clear must_change_password
  await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", userId);

  return NextResponse.json({ ok: true });
}
