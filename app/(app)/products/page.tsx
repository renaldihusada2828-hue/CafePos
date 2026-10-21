"use client";
import { useCallback, useEffect, useState } from "react";
import { formatIDR } from "@/lib/currency";

type Product = {
  id: string; name: string; category: string;
  price: string; description: string; is_active: boolean;
};

const EMPTY = { name: "", category: "", price: "", description: "", is_active: true };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [filter,   setFilter]   = useState<"all" | "active" | "inactive">("active");
  const [editId,   setEditId]   = useState<string | "new" | null>(null);
  const [form,     setForm]     = useState(EMPTY);
  const [busy,     setBusy]     = useState(false);
  const [msg,      setMsg]      = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/products");
    if (!res.ok) { setError("Gagal memuat produk."); setLoading(false); return; }
    setProducts(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditId("new"); setForm(EMPTY); setMsg(null);
  }

  function openEdit(p: Product) {
    setEditId(p.id);
    setForm({ name: p.name, category: p.category, price: p.price, description: p.description, is_active: p.is_active });
    setMsg(null);
  }

  function cancel() { setEditId(null); setForm(EMPTY); setMsg(null); }

  async function save() {
    setMsg(null); setBusy(true);
    const isNew   = editId === "new";
    const method  = isNew ? "POST" : "PATCH";
    const url     = isNew ? "/api/admin/products" : `/api/admin/products/${editId}`;
    const res     = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ ...form, price: parseFloat(form.price) || 0 }),
    });
    const json = await res.json();
    if (!res.ok) { setMsg({ type: "error", text: json.error ?? "Gagal menyimpan." }); setBusy(false); return; }
    setMsg({ type: "success", text: isNew ? "Produk berhasil ditambahkan." : "Produk berhasil diperbarui." });
    setEditId(null); setForm(EMPTY);
    await load();
    setBusy(false);
  }

  async function toggle(p: Product) {
    setBusy(true);
    await fetch(`/api/admin/products/${p.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ is_active: !p.is_active }),
    });
    await load();
    setBusy(false);
  }

  const visible = products.filter((p) =>
    filter === "all" ? true : filter === "active" ? p.is_active : !p.is_active
  );

  return (
    <>
      <div className="topbar">
        <div><h1>Produk & Menu</h1><p className="sub">Kelola katalog dan harga menu.</p></div>
        <button className="btn" onClick={openCreate}>+ Tambah Produk</button>
      </div>

      {editId !== null && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h2 style={{ marginBottom: 16 }}>{editId === "new" ? "Tambah Produk Baru" : "Edit Produk"}</h2>
          {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div className="field"><label>Nama Produk</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Americano Single Shot" />
            </div>
            <div className="field"><label>Kategori</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Coffee" />
            </div>
            <div className="field"><label>Harga (Rp)</label>
              <input type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="5000" />
            </div>
          </div>
          <div className="field" style={{ marginBottom: 12 }}><label>Deskripsi (opsional)</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Keterangan singkat..." rows={2} />
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" onClick={save} disabled={busy || !form.name.trim() || !form.price}>
              {busy ? "Menyimpan..." : "Simpan"}
            </button>
            <button className="btn btn-ghost" onClick={cancel}>Batal</button>
          </div>
        </div>
      )}

      {msg && editId === null && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      <div className="card">
        {/* Filter */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {(["active", "inactive", "all"] as const).map((f) => (
            <button key={f} className={`cat-tab${filter === f ? " active" : ""}`} onClick={() => setFilter(f)}>
              {f === "active" ? "Aktif" : f === "inactive" ? "Nonaktif" : "Semua"}
            </button>
          ))}
          <span className="muted" style={{ marginLeft: "auto", alignSelf: "center", fontSize: 12 }}>
            {visible.length} produk
          </span>
        </div>

        {loading ? <p className="muted">Memuat...</p> : error ? <p style={{ color: "var(--red)" }}>{error}</p> : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Nama</th><th>Kategori</th><th>Harga</th><th>Status</th><th>Aksi</th></tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong>{p.description && <div className="muted" style={{ fontSize: 12 }}>{p.description}</div>}</td>
                    <td>{p.category || "—"}</td>
                    <td>{formatIDR(Number(p.price))}</td>
                    <td>
                      <span className={`badge ${p.is_active ? "badge-green" : "badge-gray"}`}>
                        {p.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}>Edit</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => toggle(p)} disabled={busy}>
                          {p.is_active ? "Nonaktifkan" : "Aktifkan"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visible.length === 0 && (
                  <tr><td colSpan={5} className="muted" style={{ textAlign: "center", padding: 32 }}>
                    Tidak ada produk.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
