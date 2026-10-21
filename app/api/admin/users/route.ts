import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api/adminGuard";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";

const createSchema = z.object({
  login_id:     z.string().min(3).max(40).regex(/^[a-z0-9_]+$/, "Hanya huruf kecil, angka, underscore."),
  password:     z.string().min(12, "Password minimal 12 karakter.").max(128),
  display_name: z.string().min(1).max(80),
  role:         z.enum(["admin", "cashier"]).default("cashier"),
});

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { supabase } = guard;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, login_id, display_name, role, is_active, must_change_password, created_at")
    .order("created_at");

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

  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server tidak terkonfigurasi." }, { status: 500 });

  // Check duplicate login_id
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("login_id", parsed.data.login_id)
    .maybeSingle();
  if (existing)
    return NextResponse.json({ error: "Login ID sudah digunakan." }, { status: 409 });

  const admin = createServiceClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const slug      = parsed.data.login_id.toLowerCase().replace(/[^a-z0-9]/g, "");
  const authEmail = `${slug}@melekcafe.internal`;

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email:          authEmail,
    password:       parsed.data.password,
    email_confirm:  true,
  });

  if (authErr)
    return NextResponse.json({ error: authErr.message }, { status: 500 });

  const { error: profileErr } = await supabase.from("profiles").upsert({
    id:                   authData.user.id,
    login_id:             parsed.data.login_id,
    auth_email:           authEmail,
    role:                 parsed.data.role,
    display_name:         parsed.data.display_name,
    is_active:            true,
    must_change_password: true,
  });

  if (profileErr)
    return NextResponse.json({ error: profileErr.message }, { status: 500 });

  return NextResponse.json(
    { id: authData.user.id, login_id: parsed.data.login_id },
    { status: 201 }
  );
}
