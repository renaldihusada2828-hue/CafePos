/**
 * MelekCafe POS — Provisioning Akun Awal
 *
 * Jalankan SEKALI dari terminal terpercaya (bukan browser/CI publik)
 * setelah menjalankan SQL migration dan seed.
 *
 * Cara pakai (PowerShell):
 *   $env:NEXT_PUBLIC_SUPABASE_URL  = "https://xxx.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY = "eyJ..."
 *   $env:INITIAL_OWNER_LOGIN_ID    = "owner"
 *   $env:INITIAL_OWNER_PASSWORD    = "GantiPasswordIniKuatMin12!"
 *   $env:INITIAL_CASHIER_LOGIN_ID  = "kasir01"
 *   $env:INITIAL_CASHIER_PASSWORD  = "GantiPasswordIniKuatMin12!"
 *   node scripts/provision-users.mjs
 *
 * Bash:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *   INITIAL_OWNER_LOGIN_ID=owner INITIAL_OWNER_PASSWORD="..." \
 *   INITIAL_CASHIER_LOGIN_ID=kasir01 INITIAL_CASHIER_PASSWORD="..." \
 *   node scripts/provision-users.mjs
 *
 * IDEMPOTEN: Login ID yang sudah ada dilewati.
 * Hapus variabel INITIAL_*_PASSWORD setelah selesai.
 */

import { createClient } from "@supabase/supabase-js";

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "INITIAL_OWNER_LOGIN_ID",
  "INITIAL_OWNER_PASSWORD",
  "INITIAL_CASHIER_LOGIN_ID",
  "INITIAL_CASHIER_PASSWORD",
];

for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`\n❌  Variabel lingkungan "${key}" belum diset.\n`);
    process.exit(1);
  }
}

const MIN_PW_LENGTH = 12;
for (const key of ["INITIAL_OWNER_PASSWORD", "INITIAL_CASHIER_PASSWORD"]) {
  if ((process.env[key]?.length ?? 0) < MIN_PW_LENGTH) {
    console.error(`\n❌  ${key} harus minimal ${MIN_PW_LENGTH} karakter.\n`);
    process.exit(1);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const accounts = [
  {
    loginId:     process.env.INITIAL_OWNER_LOGIN_ID,
    password:    process.env.INITIAL_OWNER_PASSWORD,
    role:        "admin",
    displayName: "Owner",
  },
  {
    loginId:     process.env.INITIAL_CASHIER_LOGIN_ID,
    password:    process.env.INITIAL_CASHIER_PASSWORD,
    role:        "cashier",
    displayName: "Kasir 1",
  },
];

async function provision({ loginId, password, role, displayName }) {
  const slug      = loginId.toLowerCase().replace(/[^a-z0-9]/g, "");
  const authEmail = `${slug}@melekcafe.internal`;

  // Check idempotency
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, login_id")
    .eq("login_id", loginId)
    .maybeSingle();

  if (existing) {
    console.log(`⏭  login_id "${loginId}" sudah ada — dilewati.`);
    return;
  }

  // Create Supabase Auth user
  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email:         authEmail,
    password,
    email_confirm: true, // skip email verification for internal accounts
  });

  if (authErr) {
    console.error(`❌  Gagal membuat auth user "${loginId}": ${authErr.message}`);
    process.exit(1);
  }

  const userId = authData.user.id;

  // Insert profile
  const { error: profileErr } = await supabase.from("profiles").insert({
    id:                   userId,
    login_id:             loginId,
    auth_email:           authEmail,
    role,
    display_name:         displayName,
    is_active:            true,
    must_change_password: true,
  });

  if (profileErr) {
    console.error(`❌  Gagal membuat profil "${loginId}": ${profileErr.message}`);
    process.exit(1);
  }

  console.log(`✅  Berhasil: login_id="${loginId}", role="${role}", id=${userId}`);
}

console.log("\n🔧  MelekCafe POS — Provisioning akun awal...\n");
for (const account of accounts) {
  await provision(account);
}
console.log("\n✔   Selesai. Hapus variabel INITIAL_*_PASSWORD dari environment.\n");
console.log("📋  Login menggunakan Login ID (bukan email) di halaman /login.\n");
