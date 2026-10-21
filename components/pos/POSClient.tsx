"use client";
import { useMemo, useState } from "react";
import { formatIDR } from "@/lib/currency";

type Product = { id: string; name: string; category: string; price: string; description: string };
type CartItem = Product & { qty: number };

export default function POSClient({ products }: { products: Product[] }) {
  const [cart,    setCart]    = useState<CartItem[]>([]);
  const [search,  setSearch]  = useState("");
  const [cat,     setCat]     = useState("Semua");
  const [payment, setPayment] = useState<"cash" | "qris" | "transfer">("cash");
  const [paid,    setPaid]    = useState("");
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState("");

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.category)));
    return ["Semua", ...cats];
  }, [products]);

  const filtered = products.filter((p) => {
    const matchCat    = cat === "Semua" || p.category === cat;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const total    = useMemo(() => cart.reduce((s, i) => s + Number(i.price) * i.qty, 0), [cart]);
  const paidNum  = parseFloat(paid.replace(/\./g, "")) || 0;
  const change   = paidNum - total;
  const canPay   = payment !== "cash" || paidNum >= total;

  function addToCart(p: Product) {
    setCart((prev) => {
      const existing = prev.find((x) => x.id === p.id);
      return existing
        ? prev.map((x) => x.id === p.id ? { ...x, qty: Math.min(x.qty + 1, 99) } : x)
        : [...prev, { ...p, qty: 1 }];
    });
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) =>
      prev.flatMap((x) => {
        if (x.id !== id) return [x];
        const newQty = x.qty + delta;
        return newQty <= 0 ? [] : [{ ...x, qty: newQty }];
      })
    );
  }

  function removeItem(id: string) {
    setCart((prev) => prev.filter((x) => x.id !== id));
  }

  function clearCart() {
    setCart([]); setPaid(""); setError("");
  }

  async function checkout() {
    if (cart.length === 0) return;
    setError(""); setBusy(true);

    try {
      const res = await fetch("/api/checkout", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          items:          cart.map((x) => ({ productId: x.id, quantity: x.qty })),
          paymentMethod:  payment,
          amountReceived: payment === "cash" ? paidNum : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Transaksi gagal. Coba lagi.");
        setBusy(false);
        return;
      }

      // Redirect to receipt
      window.location.href = `/transactions/${data.saleId}`;
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
      setBusy(false);
    }
  }

  return (
    <div className="pos-layout">
      {/* ── Product catalog ── */}
      <div>
        {/* Search */}
        <div className="field" style={{ marginBottom: 12 }}>
          <input
            type="search"
            placeholder="Cari nama produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category tabs */}
        <div className="cat-tabs">
          {categories.map((c) => (
            <button
              key={c}
              className={`cat-tab${cat === c ? " active" : ""}`}
              onClick={() => setCat(c)}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Product grid */}
        <div className="pos-products-grid">
          {filtered.map((p) => (
            <button
              key={p.id}
              className="product-card"
              onClick={() => addToCart(p)}
              title={p.description || p.name}
            >
              <span className="product-card-cat">{p.category}</span>
              <span className="product-card-name">{p.name}</span>
              <span className="product-card-price">{formatIDR(Number(p.price))}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn: "1/-1", padding: "32px 0", color: "var(--muted)", textAlign: "center" }}>
              Tidak ada produk yang cocok.
            </div>
          )}
        </div>
      </div>

      {/* ── Cart ── */}
      <div className="cart-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2>Pesanan</h2>
          {cart.length > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={clearCart}>Kosongkan</button>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="empty-state" style={{ padding: "24px 0" }}>
            <p>Belum ada item. Pilih produk di sebelah kiri.</p>
          </div>
        ) : (
          <>
            {cart.map((item) => (
              <div className="cart-item" key={item.id}>
                <div>
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-sub">
                    {item.qty} × {formatIDR(Number(item.price))} = <strong>{formatIDR(Number(item.price) * item.qty)}</strong>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <div className="qty-ctrl">
                    <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>−</button>
                    <span className="qty-num">{item.qty}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.id, +1)}>+</button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    style={{ fontSize: 11, color: "var(--muted)", background: "none", border: "none", cursor: "pointer" }}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}

            <div className="cart-total">
              <span>Total</span>
              <span className="text-red">{formatIDR(total)}</span>
            </div>

            {/* Payment method */}
            <div className="field" style={{ marginTop: 14 }}>
              <label>Metode Pembayaran</label>
              <select
                value={payment}
                onChange={(e) => {
                  setPayment(e.target.value as "cash" | "qris" | "transfer");
                  setPaid("");
                }}
              >
                <option value="cash">Tunai</option>
                <option value="qris">QRIS (konfirmasi manual)</option>
                <option value="transfer">Transfer (konfirmasi manual)</option>
              </select>
            </div>

            {payment === "cash" && (
              <div className="field">
                <label>Uang Diterima (Rp)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={total}
                  step={1000}
                  value={paid}
                  onChange={(e) => setPaid(e.target.value)}
                  placeholder={`Min. ${formatIDR(total)}`}
                />
                <div className="muted" style={{ marginTop: 4 }}>
                  Kembalian: <strong style={{ color: change >= 0 ? "var(--green)" : "var(--red)" }}>
                    {formatIDR(Math.max(0, change))}
                  </strong>
                </div>
              </div>
            )}

            {payment !== "cash" && (
              <div className="alert alert-warning" style={{ fontSize: 12 }}>
                QRIS/Transfer tidak otomatis diverifikasi. Periksa bukti pembayaran sebelum menyerahkan pesanan. Konfirmasi dilakukan oleh owner.
              </div>
            )}

            {error && <div className="alert alert-error">{error}</div>}

            <button
              className="btn btn-lg"
              style={{ width: "100%", marginTop: 8 }}
              disabled={busy || !canPay}
              onClick={checkout}
            >
              {busy ? "Memproses..." : "Proses Transaksi"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
