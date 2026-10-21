"use client";
import { useCallback, useEffect, useState } from "react";

type RawMaterial = { id: string; name: string; base_unit: string };
type Product     = { id: string; name: string; category: string; is_active: boolean };
type RecipeItem  = { raw_material_id: string; quantity: number; unit: string; raw_materials?: { name: string; base_unit: string } | null };
type Recipe      = {
  id: string; product_id: string; notes: string; is_active: boolean;
  products?: { name: string; category: string } | null;
  recipe_items?: RecipeItem[];
};

type FormItem = { raw_material_id: string; quantity: string; unit: string };

export default function RecipesPage() {
  const [recipes,   setRecipes]   = useState<Recipe[]>([]);
  const [products,  setProducts]  = useState<Product[]>([]);
  const [materials, setMaterials] = useState<RawMaterial[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [editId,    setEditId]    = useState<string | null>(null);
  const [busy,      setBusy]      = useState(false);
  const [msg,       setMsg]       = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [selProduct, setSelProduct] = useState("");
  const [notes,      setNotes]      = useState("");
  const [isActive,   setIsActive]   = useState(true);
  const [items,      setItems]      = useState<FormItem[]>([{ raw_material_id: "", quantity: "", unit: "" }]);

  const load = useCallback(async () => {
    setLoading(true);
    const [rRes, mRes, pRes] = await Promise.all([
      fetch("/api/admin/recipes"),
      fetch("/api/admin/inventory"),
      fetch("/api/admin/products"),
    ]);
    if (rRes.ok) setRecipes(await rRes.json());
    if (mRes.ok) setMaterials(await mRes.json());
    if (pRes.ok) setProducts(await pRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const usedProductIds = new Set(recipes.map((r) => r.product_id));
  const availableProducts = products.filter((p) => p.is_active && (!usedProductIds.has(p.id) || p.id === (editId ? recipes.find((r) => r.id === editId)?.product_id : "")));

  function openCreate() {
    setEditId(null); setSelProduct(""); setNotes(""); setIsActive(true);
    setItems([{ raw_material_id: "", quantity: "", unit: "" }]);
    setMsg(null); setShowForm(true);
  }

  function openEdit(r: Recipe) {
    setEditId(r.id); setSelProduct(r.product_id); setNotes(r.notes); setIsActive(r.is_active);
    setItems(r.recipe_items?.map((i) => ({
      raw_material_id: i.raw_material_id,
      quantity:        String(i.quantity),
      unit:            i.unit || "",
    })) ?? [{ raw_material_id: "", quantity: "", unit: "" }]);
    setMsg(null); setShowForm(true);
  }

  function setItemField(i: number, key: keyof FormItem, val: string) {
    setItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [key]: val } : item));
  }

  function addItem()       { setItems((prev) => [...prev, { raw_material_id: "", quantity: "", unit: "" }]); }
  function removeItem(i: number) { setItems((prev) => prev.filter((_, idx) => idx !== i)); }

  async function save() {
    const validItems = items.filter((i) => i.raw_material_id && i.quantity);
    if (!selProduct || validItems.length === 0) {
      setMsg({ type: "error", text: "Pilih produk dan isi minimal satu bahan resep." });
      return;
    }
    setMsg(null); setBusy(true);
    const payload = {
      product_id: selProduct,
      notes,
      is_active:  isActive,
      items:      validItems.map((i) => ({
        raw_material_id: i.raw_material_id,
        quantity:        parseFloat(i.quantity),
        unit:            i.unit,
      })),
    };
    const url    = editId ? `/api/admin/recipes/${editId}` : "/api/admin/recipes";
    const method = editId ? "PATCH" : "POST";
    const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const json   = await res.json();
    if (!res.ok) { setMsg({ type: "error", text: json.error ?? "Gagal." }); setBusy(false); return; }
    setMsg({ type: "success", text: "Resep berhasil disimpan." });
    setShowForm(false); setEditId(null);
    await load(); setBusy(false);
  }

  async function deleteRecipe(id: string, name: string) {
    if (!confirm(`Hapus resep "${name}"? Checkout produk ini akan gagal sampai resep baru ditambahkan.`)) return;
    setBusy(true);
    await fetch(`/api/admin/recipes/${id}`, { method: "DELETE" });
    setMsg({ type: "success", text: "Resep dihapus." });
    await load(); setBusy(false);
  }

  return (
    <>
      <div className="topbar">
        <div><h1>Resep</h1><p className="sub">Definisikan bahan dan takaran aktual dapur untuk setiap produk.</p></div>
        <button className="btn" onClick={openCreate}>+ Tambah Resep</button>
      </div>

      {msg && !showForm && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

      {showForm && (
        <div className="card" style={{ marginBottom: 18 }}>
          <h2 style={{ marginBottom: 4 }}>{editId ? "Edit Resep" : "Tambah Resep Baru"}</h2>
          <p className="muted" style={{ marginBottom: 14 }}>
            Masukkan takaran aktual dari dapur. Sistem tidak menyediakan nilai default.
          </p>
          {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div className="field"><label>Produk</label>
              <select value={selProduct} onChange={(e) => setSelProduct(e.target.value)} disabled={!!editId}>
                <option value="">-- Pilih produk --</option>
                {availableProducts.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.category})</option>)}
              </select>
            </div>
            <div className="field"><label>Status Resep</label>
              <select value={isActive ? "active" : "inactive"} onChange={(e) => setIsActive(e.target.value === "active")}>
                <option value="active">Aktif (bisa dijual dengan pengurangan stok)</option>
                <option value="inactive">Nonaktif (produk tidak bisa checkout)</option>
              </select>
            </div>
          </div>

          <div className="field" style={{ marginBottom: 14 }}><label>Catatan Resep (opsional)</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Catatan penyajian, suhu, dll." />
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Bahan-bahan</div>
          {items.map((item, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr auto", gap: 10, marginBottom: 8 }}>
              <div className="field" style={{ margin: 0 }}>
                {i === 0 && <label>Bahan Baku</label>}
                <select value={item.raw_material_id} onChange={(e) => setItemField(i, "raw_material_id", e.target.value)}>
                  <option value="">-- Pilih bahan --</option>
                  {materials.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.base_unit})</option>)}
                </select>
              </div>
              <div className="field" style={{ margin: 0 }}>
                {i === 0 && <label>Jumlah</label>}
                <input type="number" min="0.001" step="0.001" value={item.quantity}
                  onChange={(e) => setItemField(i, "quantity", e.target.value)} placeholder="0.000" />
              </div>
              <div className="field" style={{ margin: 0 }}>
                {i === 0 && <label>Satuan</label>}
                <input value={item.unit} onChange={(e) => setItemField(i, "unit", e.target.value)} placeholder="gram" />
              </div>
              <div style={{ display: "flex", alignItems: i === 0 ? "flex-end" : "center" }}>
                <button className="btn btn-ghost btn-sm" onClick={() => removeItem(i)} disabled={items.length === 1}>✕</button>
              </div>
            </div>
          ))}
          <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={addItem}>+ Tambah Bahan</button>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" onClick={save} disabled={busy}>{busy ? "Menyimpan..." : "Simpan Resep"}</button>
            <button className="btn btn-ghost" onClick={() => { setShowForm(false); setMsg(null); }}>Batal</button>
          </div>
        </div>
      )}

      {loading ? <p className="muted">Memuat...</p> : (
        <>
          {recipes.length === 0 && !showForm && (
            <div className="card">
              <div className="empty-state">
                <p><strong>Belum ada resep.</strong></p>
                <p style={{ marginTop: 6 }}>Tambah resep agar checkout dapat mengurangi stok bahan baku secara otomatis.</p>
              </div>
            </div>
          )}
          <div style={{ display: "grid", gap: 12 }}>
            {recipes.map((r) => (
              <div className="card" key={r.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{r.products?.name ?? "—"}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{r.products?.category}</div>
                    {r.notes && <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>{r.notes}</div>}
                    <span className={`badge ${r.is_active ? "badge-green" : "badge-gray"}`} style={{ marginTop: 6 }}>
                      {r.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>Edit</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: "var(--red)", borderColor: "var(--red)" }}
                      onClick={() => deleteRecipe(r.id, r.products?.name ?? "?")} disabled={busy}>
                      Hapus
                    </button>
                  </div>
                </div>
                {(r.recipe_items?.length ?? 0) > 0 ? (
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Bahan</th><th>Jumlah per Porsi</th><th>Satuan</th></tr></thead>
                      <tbody>
                        {r.recipe_items?.map((ri, i) => (
                          <tr key={i}>
                            <td>{ri.raw_materials?.name ?? ri.raw_material_id}</td>
                            <td>{Number(ri.quantity).toLocaleString("id-ID", { maximumFractionDigits: 4 })}</td>
                            <td>{ri.unit || ri.raw_materials?.base_unit || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="muted" style={{ fontSize: 13 }}>Belum ada bahan. Edit resep untuk menambahkan.</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
