import { createClient } from "@/lib/supabase/server";
import POSClient from "@/components/pos/POSClient";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, category, price, description")
    .eq("is_active", true)
    .order("category")
    .order("name");

  if (error) {
    return (
      <div>
        <div className="topbar"><div><h1>Kasir / POS</h1></div></div>
        <div className="alert alert-error">
          Gagal memuat produk: {error.message}. Cek koneksi dan konfigurasi Supabase.
        </div>
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div>
        <div className="topbar"><div><h1>Kasir / POS</h1></div></div>
        <div className="card">
          <div className="empty-state">
            <p><strong>Belum ada produk aktif.</strong></p>
            <p style={{ marginTop: 8 }}>Owner perlu menambahkan produk di menu Produk terlebih dahulu.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="topbar no-print">
        <div>
          <h1>Kasir / POS</h1>
          <p className="sub">Pilih produk, atur jumlah, lalu proses transaksi.</p>
        </div>
      </div>
      <POSClient products={products} />
    </div>
  );
}
