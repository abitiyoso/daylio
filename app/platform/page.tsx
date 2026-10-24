"use client";
import { useState } from "react";
import "../workspace/workspace.css";
export default function Platform() {
  const [rows, setRows] = useState<any[]>([]),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function api(path: string, method = "GET", body?: any) {
    const r = await fetch("/api/v1/" + path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error?.message || "Akses ditolak");
    return d.data;
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="workspace" style={{ padding: 40 }}>
      <a href="/workspace">← Daylio</a>
      <h1>Administrasi platform</h1>
      <p>
        Akses dukungan memerlukan persetujuan pemilik. Data anak tidak
        ditampilkan di sini.
      </p>
      <div className="actions">
        <button
          disabled={busy}
          onClick={() =>
            void run(async () => setRows(await api("platform/saas-invoices")))
          }
        >
          Tagihan langganan Daylio
        </button>
        <button
          disabled={busy}
          onClick={() =>
            void run(async () => setRows(await api("platform/tenants")))
          }
        >
          Daycare
        </button>
        <button
          disabled={busy}
          onClick={() =>
            void run(async () => setRows(await api("platform/demo-requests")))
          }
        >
          Permintaan demo
        </button>
      </div>
      <p role="status">{busy ? "Memuat…" : message}</p>
      {rows.map((row) => (
        <article key={row.id}>
          <h2>{row.organization_name || row.name || row.daycare}</h2>
          <small>{row.id}</small>
          <p>{row.contact}</p>
          {row.plan_id && (
            <>
              <p>
                {row.plan_id} · Rp {Number(row.amount).toLocaleString("id-ID")}{" "}
                · {row.state}
              </p>
              {row.starts_at && (
                <p>
                  Periode terverifikasi:{" "}
                  {new Date(row.starts_at).toLocaleDateString("id-ID")} —{" "}
                  {new Date(row.ends_at).toLocaleDateString("id-ID")}
                </p>
              )}
              {row.state === "pending" && (
                <p>
                  Perkiraan mulai setelah verifikasi:{" "}
                  {new Date(row.proposed_starts_at).toLocaleDateString("id-ID")}
                  . Sisa periode terbayar tetap utuh. Tidak ada prorata atau
                  pembayaran otomatis.
                </p>
              )}
              {row.state === "pending" && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = Object.fromEntries(new FormData(e.currentTarget));
                    void run(async () => {
                      await api(
                        `platform/saas-invoices/${row.id}/verify`,
                        "POST",
                        {
                          reference: String(v.reference),
                          amount: Number(v.amount),
                          confirmed: true,
                        },
                      );
                      setRows(await api("platform/saas-invoices"));
                      setMessage(
                        "Transaksi dicatat sebagai verifikasi manual administrator platform.",
                      );
                    });
                  }}
                >
                  <label>
                    Referensi transaksi yang diperiksa
                    <input
                      name="reference"
                      minLength={6}
                      maxLength={160}
                      required
                    />
                  </label>
                  <label>
                    Jumlah transaksi yang diterima
                    <input name="amount" type="number" min="1" required />
                  </label>
                  <label>
                    <input type="checkbox" required />
                    Saya telah memeriksa transaksi nyata dan jumlahnya sesuai
                    invoice.
                  </label>
                  <button disabled={busy}>Konfirmasi pembayaran & paket</button>
                </form>
              )}
            </>
          )}
          {"suspended" in row && (
            <div className="actions">
              <button
                onClick={() =>
                  void run(async () => {
                    const limit = Number(prompt("Batas anak aktif"));
                    if (!limit) return;
                    await api("platform/subscriptions", "POST", {
                      organizationId: row.id,
                      plan: "trial",
                      limit,
                    });
                    setMessage(
                      "Batas paket disimpan tanpa memblokir layanan pengasuhan yang sudah berjalan.",
                    );
                  })
                }
              >
                Atur batas paket
              </button>
              <button
                onClick={() =>
                  void run(async () => {
                    const reason = prompt(
                      "Alasan dukungan (minimal 10 karakter)",
                    );
                    if (!reason) return;
                    await api("platform/support-access", "POST", {
                      organizationId: row.id,
                      reason,
                    });
                    setMessage("Persetujuan pemilik diminta.");
                  })
                }
              >
                Minta dukungan
              </button>
              <button
                onClick={() =>
                  void run(async () => {
                    const health = await api(
                      `platform/tenants/${row.id}/health`,
                    );
                    setMessage(JSON.stringify(health));
                  })
                }
              >
                Periksa kesehatan
              </button>
              <button
                onClick={() =>
                  void run(async () => {
                    const reason = prompt(
                      "Alasan perubahan status (minimal 10 karakter)",
                    );
                    if (!reason) return;
                    await api(`platform/tenants/${row.id}/suspend`, "POST", {
                      reason,
                      suspended: !row.suspended,
                    });
                    setRows(await api("platform/tenants"));
                  })
                }
              >
                {row.suspended ? "Aktifkan kembali" : "Tangguhkan"}
              </button>
            </div>
          )}
        </article>
      ))}
    </main>
  );
}
