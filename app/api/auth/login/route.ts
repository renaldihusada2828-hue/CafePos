import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { z } from "zod";

const schema = z.object({
  loginId:  z.string().min(1).max(40),
  password: z.string().min(1).max(128),
});

// Generic error to prevent user enumeration
const GENERIC_ERROR = "ID atau password tidak valid.";

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });

  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey)
    return NextResponse.json({ error: "Server tidak terkonfigurasi." }, { status: 500 });

  // Use service role to look up auth_email by login_id
  // Service key NEVER sent to client; only used here server-side
  const admin = createServiceClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: profile, error } = await admin
    .from("profiles")
    .select("auth_email, is_active, role")
    .eq("login_id", parsed.data.loginId.toLowerCase())
    .maybeSingle();

  if (error || !profile) {
    // Timing-safe: always the same error message
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  if (!profile.is_active) {
    return NextResponse.json({ error: "Akun tidak aktif. Hubungi owner." }, { status: 403 });
  }

  // Return the auth_email; client will call signInWithPassword directly
  return NextResponse.json({ email: profile.auth_email });
}
