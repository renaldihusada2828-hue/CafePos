"use client";
import { useCallback, useEffect, useState } from "react";
import { formatDateTimeJakarta } from "@/lib/currency";

type RawMaterial = {
  id: string; name: string; base_unit: string;
  stock_quantity: string; minimum_stock: string; cost_per_unit: string; is_active: boolean;
};

type Movement = {
  id: number;
  movement_type: string;
  quantity_change: string;
  quantity_before: string;
  quantity_after: string;
  reference_id: string | null;
  note: string | null;
  created_at: string;
  profiles?: { display_name: string; login_id: string } | null;
};

const EMPTY = { name: "", base_unit: "gram", stock_quantity: "0", minimum_stock: "0", cost_per_unit: "0" };

const MOVEMENT_LABELS: Record<string, { label: string; color: string }> = {
  sale:        { label: "Penjualan",   color: "var(--red)"   },
  restock:     { label: "Restock",     color: "var(--green)" },
  adjustment:  { label: "Koreksi",     color: "var(--amber)" },
  void_return: { label: "Void Return", color: "#1e40af"      },
  initial:     { label: "Stok Awal",   color: "var(--muted)" },
};

export default function InventoryPage() {
  const [items,       setItems]       = useState<RawMaterial[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [editId,      setEditId]      = useState<string | "new" | null>(null);
  const [form,        setForm]        = useState(EMPTY);
  const [adjustId,    setAdjustId]    = useState<string | null>(null);
  const [delta,       setDelta]       = useState("");
  const [note,        setNote]        = useState("");
  const [historyId,   setHistoryId]   = useState<string | null>(null);
  const [movements,   setMovements]   = useState<Movement[]>([]);
  const [movLoading,  setMovLoading]  = useState(false);
  const [busy,        setBusy]        = useState(false);
  const [msg,         setMsg]         = useState<{ type: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/inventory");
    if (res.ok) setItems(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function loadMovements(id: string) {
    setMovLoading(true);
    const res = await fetch(`/api/admin/inventory/${id}/movements?limit=100`);
    if (res.ok) setMovements(await res.json());
    setMovLoading(false);
  }

  function cancel() {
    setEditId(null); setAdjustId(null); setHistoryId(null);
    setForm(EMPTY); setDelta(""); setNote(""); setMsg(null);
    setMovements([]);
  }

  async function save() {
    setMsg(null); setBusy(true);
    const isNew = editId === "new";
    const url   = isNew ? "/api/admin/inventory" : `/api/admin/inventory/${editId}`;
    const res   = await fetch(url, {
      method:  isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        ...form,
        stock_quantity: parseFloat(form.stock_quantity) || 0,
        minimum_stock:  parseFloat(form.minimum_stock)  || 0,
        cost_per_unit:  parseFloat(form.cost_per_unit)  || 0,
      }),
    });
    const json = await res.json();
    if (!res.ok) { setMsg({ type: "error", text: json.error ?? "Gagal." }); setBusy(false); return; }
    setMsg({ type: "success", text: "Data berhasil disimpan." });
    setEditId(null); setForm(EMPTY);
    await load(); setBusy(false);
  }

  async function adjust() {
    const d = parseFloat(delta);
    if (isNaN(d) || d === 0) { setMsg({ type: "error", text: "Delta tidak valid." }); return; }
    setMsg(null); setBusy(true);
    const res = await fetch(`/api/admin/inventory/${adjustId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ delta: d, note }),
    });
    const json = await res.json();
    if (!res.ok) { setMsg({ type: "error", text: json.error ?? "Gagal." }); setBusy(false); return; }
    setMsg({ type: "success", text: `Stok diperbarui. Stok baru: ${Number(json.stock_after).toLocaleString("id-ID")}` });
    setAdjustId(null); setDelta(""); setNote("");
    await load(); setBusy(false);
  }

  async function deleteItem(id: string, name: string) {
    if (!confirm(`Hapus "${name}"? Tidak bisa jika masih ada resep terkait.`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/inventory/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json();
      setMsg({ type: "error", text: json.error ?? "Gagal menghapus." });
    } else {
      setMsg({ type: "success", text: "Bahan berhasil dihapus." });
    }
    await load(); setBusy(false);
  }

  function openHistory(m: RawMaterial) {
    setHistoryId(m.id);
    setEditId(null); setAdjustId(null); setMsg(null);
    loadMovements(m.id);
  }

  const historyItem = items.find((x) => x.id === historyId);

  return (
    <>
      <div className="topbar">
        <div><h1>Inventory Bahan Baku</h1><p className="sub">Pantau stok dan kelola pergerakan bahan baku.</p></div>
        <button className="btn" onClick={() => { setEditId("new"); setForm(EMPTY); setAdjustId(null); setHistoryId(null); setMsg(null); }}>
          + Tambah Bahan
        </button>
      </div>

      {/* ── Form tambah/edit ── */}
      {editId !== null && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginBottom: 14 }}>{editId === "new" ? "Tambah Bahan Baku" : "Edit Bahan Baku"}</h2>
          {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            {[
              { label: "Nama Bahan",        key: "name",           type: "text",   placeholder: "Kopi Arabika" },
              { label: "Satuan Dasar",       key: "base_unit",      type: "text",   placeholder: "gram" },
              { label: "Stok Awal",          key: "stock_quantity", type: "number", placeholder: "0" },
              { label: "Stok Minimum",       key: "minimum_stock",  type: "number", placeholder: "0" },
              { label: "Biaya/Satuan (Rp)",  key: "cost_per_unit",  type: "number", placeholder: "0" },
            ].map(({ label, key, type, placeholder }) => (
              <div className="field" key={key}>
                <label>{label}</label>
                <input
                  type={type} placeholder={placeholder}
                  value={String(form[key as keyof typeof form])}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" onClick={save} disabled={busy || !form.name || !form.base_unit}>
              {busy ? "Menyimpan..." : "Simpan"}
            </button>
            <button className="btn btn-ghost" onClick={cancel}>Batal</button>
          </div>
        </div>
      )}

      {/* ── Form penyesuaian stok ── */}
      {adjustId && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginBottom: 6 }}>
            Sesuaikan Stok — <span className="text-red">{items.find((x) => x.id === adjustId)?.name}</span>
          </h2>
          <p className="muted" style={{ marginBottom: 12 }}>
            Stok saat ini:{" "}
            <strong>
              {Number(items.find((x) => x.id === adjustId)?.stock_quantity ?? 0).toLocaleString("id-ID")}{" "}
              {items.find((x) => x.id === adjustId)?.base_unit}
            </strong>
            . Masukkan angka positif untuk restock, negatif untuk koreksi.
          </p>
          {msg && <div className={`alert alert-${msg.type}`}>{msg.text}</div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12, marginBottom: 12 }}>
            <div className="field">
              <label>Delta (+ restock / − koreksi)</label>
              <input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="+100 atau -5" />
            </div>
            <div className="field">
              <label>Catatan</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Restock dari supplier, koreksi stok opname, dll." />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn" onClick={adjust} disabled={busy || !delta}>{busy ? "Memproses..." : "Terapkan"}</button>
            <button className="btn btn-ghost" onClick={cancel}>Batal</button>
          </div>
        </div>
      )}

      {/* ── Riwayat pergerakan stok ── */}
      {historyId && historyItem && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div>
              <h2>Riwayat Pergerakan Stok — <span className="text-red">{historyItem.name}</span></h2>
              <p className="muted" style={{ marginTop: 2 }}>
                100 entri terbaru. Stok saat ini:{" "}
                <strong>{Number(historyItem.stock_quantity).toLocaleString("id-ID")} {historyItem.base_unit}</strong>
              </p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={cancel}>Tutup</button>
          </div>

          {movLoading ? (
            <p className="muted">Memuat riwayat...</p>
          ) : movements.length === 0 ? (
            <div className="empty-state"><p>Belum ada riwayat pergerakan stok.</p></div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Jenis</th>
                    <th>Perubahan</th>
                    <th>Sebelum</th>
                    <th>Sesudah</th>
                    <th>Pelaku</th>
                    <th>Catatan / Referensi</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((mv) => {
                    const meta  = MOVEMENT_LABELS[mv.movement_type] ?? { label: mv.movement_type, color: "var(--muted)" };
                    const delta = Number(mv.quantity_change);
                    const actor = mv.profiles as { display_name: string; login_id: string } | null;
                    return (
                      <tr key={mv.id}>
                        <td className="muted" style={{ whiteSpace: "nowrap", fontSize: 12 }}>
                          {formatDateTimeJakarta(mv.created_at)}
                        </td>
                        <td>
                          <span style={{
                            display: "inline-block", padding: "2px 8px", borderRadius: 4,
                            fontSize: 11, fontWeight: 700, background: `${meta.color}18`, color: meta.color,
                          }}>
                            {meta.label}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: delta >= 0 ? "var(--green)" : "var(--red)" }}>
                          {delta >= 0 ? "+" : ""}{Number(delta).toLocaleString("id-ID", { maximumFractionDigits: 4 })} {historyItem.base_unit}
                        </td>
                        <td className="muted">
                          {Number(mv.quantity_before).toLocaleString("id-ID", { maximumFractionDigits: 4 })}
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          {Number(mv.quantity_after).toLocaleString("id-ID", { maximumFractionDigits: 4 })}
                        </td>
                        <td className="muted" style={{ fontSize: 12 }}>
                          {actor?.display_name ?? "—"}
                          {actor?.login_id && <div style={{ fontSize: 10, color: "#aaa" }}>{actor.login_id}</div>}
                        </td>
                        <td style={{ fontSize: 12, color: "#555", maxWidth: 220 }}>
                          {mv.note && <div>{mv.note}</div>}
                          {mv.reference_id && (
                            <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                              ref: {mv.reference_id.length > 20 ? `${mv.reference_id.slice(0, 20)}…` : mv.reference_id}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {msg && editId === null && adjustId === null && historyId === null && (
        <div className={`alert alert-${msg.type}`}>{msg.text}</div>
      )}

      {/* ── Tabel utama bahan baku ── */}
      <div className="card">
        {loading ? (
          <p className="muted">Memuat...</p>
        ) : (
          <>
            {items.some((m) => Number(m.stock_quantity) <= Number(m.minimum_stock)) && (
              <div className="alert alert-warning" style={{ marginBottom: 14 }}>
                ⚠ Ada bahan baku yang stoknya mencapai atau di bawah batas minimum. Segera lakukan restock.
              </div>
            )}
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nama Bahan</th>
                    <th>Satuan</th>
                    <th>Stok Saat Ini</th>
                    <th>Stok Minimum</th>
                    <th>Biaya/Satuan</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((m) => {
                    const isCritical = Number(m.stock_quantity) <= Number(m.minimum_stock);
                    const isActive   = historyId === m.id || adjustId === m.id || editId === m.id;
                    return (
                      <tr key={m.id} style={{ background: isActive ? "#fafafa" : undefined }}>
                        <td><strong>{m.name}</strong></td>
                        <td>{m.base_unit}</td>
                        <td style={{ fontWeight: 700, color: isCritical ? "var(--red)" : "inherit" }}>
                          {Number(m.stock_quantity).toLocaleString("id-ID", { maximumFractionDigits: 4 })}
                        </td>
                        <td className="muted">
                          {Number(m.minimum_stock).toLocaleString("id-ID", { maximumFractionDigits: 4 })}
                        </td>
                        <td className="muted">Rp{Number(m.cost_per_unit).toLocaleString("id-ID")}</td>
                        <td>
                          <span className={`badge ${isCritical ? "badge-red" : "badge-green"}`}>
                            {isCritical ? "Kritis" : "Aman"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => { setAdjustId(m.id); setEditId(null); setHistoryId(null); setMsg(null); }}
                            >
                              Sesuaikan
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => openHistory(m)}
                            >
                              Riwayat
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                setEditId(m.id); setAdjustId(null); setHistoryId(null);
                                setForm({ name: m.name, base_unit: m.base_unit, stock_quantity: m.stock_quantity, minimum_stock: m.minimum_stock, cost_per_unit: m.cost_per_unit });
                                setMsg(null);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: "var(--red)", borderColor: "var(--red)" }}
                              onClick={() => deleteItem(m.id, m.name)}
                              disabled={busy}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="muted" style={{ textAlign: "center", padding: 32 }}>
                        Belum ada bahan baku. Tambah bahan terlebih dahulu sebelum mengonfigurasi resep.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
