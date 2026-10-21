"use client";
import { useState } from "react";

export default function ReceiptActions({
  saleId,
  isAdmin,
  isVoided,
  isPending,
}: {
  saleId:    string;
  isAdmin:   boolean;
  isVoided:  boolean;
  isPending: boolean;
}) {
  const [voidReason, setVoidReason] = useState("");
  const [showVoid,   setShowVoid]   = useState(false);
  const [busy,       setBusy]       = useState(false);
  const [msg,        setMsg]        = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function confirmPayment() {
    if (!confirm("Konfirmasi bahwa pembayaran sudah diterima?")) return;
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/admin/transactions/${saleId}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "confirm_payment" }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMsg({ type: "error", text: json.error ?? "Gagal mengonfirmasi." });
      setBusy(false);
      return;
    }
    setMsg({ type: "success", text: "Pembayaran dikonfirmasi." });
    setTimeout(() => window.location.reload(), 1200);
  }

  async function voidSale() {
    if (voidReason.trim().length < 5) {
      setMsg({ type: "error", text: "Alasan minimal 5 karakter." });
      return;
    }
    if (!confirm(`Batalkan transaksi ini?\n\nAlasan: ${voidReason}\n\nStok akan dikembalikan secara otomatis.`)) return;
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/admin/transactions/${saleId}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: "void", reason: voidReason }),
    });
    const json = await res.json();
    if (!res.ok) {
      setMsg({ type: "error", text: json.error ?? "Gagal membatalkan." });
      setBusy(false);
      return;
    }
    setMsg({ type: "success", text: "Transaksi dibatalkan. Stok dikembalikan." });
    setTimeout(() => window.location.reload(), 1400);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn-ghost" onClick={() => window.print()}>
          Cetak Struk
        </button>
        {isAdmin && isPending && !isVoided && (
          <button className="btn btn-success" onClick={confirmPayment} disabled={busy}>
            Konfirmasi Pembayaran
          </button>
        )}
        {isAdmin && !isVoided && (
          <button
            className="btn btn-danger"
            onClick={() => { setShowVoid((v) => !v); setMsg(null); setVoidReason(""); }}
            disabled={busy}
          >
            Batalkan (Void)
          </button>
        )}
      </div>

      {showVoid && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            className="field input"
            style={{
              border: "1px solid var(--border)", borderRadius: 6,
              padding: "8px 12px", fontSize: 13, minWidth: 260,
            }}
            placeholder="Alasan pembatalan (min 5 karakter)..."
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
          />
          <button
            className="btn btn-danger"
            onClick={voidSale}
            disabled={busy || voidReason.trim().length < 5}
          >
            {busy ? "Memproses..." : "Konfirmasi Void"}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => { setShowVoid(false); setVoidReason(""); }}
          >
            Batal
          </button>
        </div>
      )}

      {msg && (
        <div className={`alert alert-${msg.type}`} style={{ margin: 0 }}>
          {msg.text}
        </div>
      )}
    </div>
  );
}
