"use client";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  X,
  ArrowRight,
  VideoCamera,
  Sparkle,
} from "@phosphor-icons/react";
type Item = Record<string, any>;
type Request = (
  path: string,
  method?: string,
  body?: any,
  key?: string,
) => Promise<any>;
const money = (value: number) =>
  "Rp" + Number(value || 0).toLocaleString("id-ID");
const featureNames: Record<string, string> = {
  crm: "CRM & Pendaftaran",
  scheduling: "Jadwal & Booking",
  finance: "Tagihan Orang Tua",
  "business-reporting": "Laporan Bisnis",
  leo: "LEO AI Workspace",
};
export default function Commercial({ request }: { request: Request }) {
  const [data, setData] = useState<Item | null>(null),
    [cycle, setCycle] = useState("monthly"),
    [selected, setSelected] = useState<Item | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  async function load() {
    try {
      setData(await request("commercial/context"));
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  useEffect(() => {
    if (!selected) return;
    const old = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return () => {
      dialog.current?.close();
      old?.focus();
    };
  }, [selected]);
  const current = data?.catalog.find(
      (p: Item) => p.id === data.subscription.effective_plan,
    ),
    pending = data?.invoices.some((i: Item) => i.state === "pending");
  return (
    <div className="v9-app">
      <link rel="stylesheet" href="/workspace-v10.css" />
      {error && !selected && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!data ? (
        <p>Memuat langganan…</p>
      ) : (
        <>
          <section className="v9-card v9-plan-hero">
            <div>
              <span className="v9-overline">LANGGANAN DAYLIO</span>
              <h2>{current?.name}</h2>
              <p>
                {data.subscription.state === "legacy"
                  ? "Akses migrasi · belum merupakan langganan berbayar"
                  : data.subscription.state === "trial"
                    ? "Masa percobaan · bukan pembayaran terverifikasi"
                    : data.subscription.state === "active"
                      ? "Langganan aktif"
                      : "Paket dasar"}
              </p>
              <p>
                {data.subscription.period_end &&
                  "Periode sampai " +
                    new Date(data.subscription.period_end).toLocaleDateString(
                      "id-ID",
                    )}
              </p>
            </div>
            <div>
              <strong>
                {data.used} / {current?.child_limit} anak
              </strong>
              <p>Data pengasuhan dan keselamatan tetap tersimpan.</p>
            </div>
          </section>
          <div className="v9-card v9-elevated v10-commercial-note">
            <strong>Pembayaran memerlukan verifikasi</strong>
            <p>
              Gateway pembayaran belum terhubung. Permintaan tagihan tidak
              mengaktifkan paket; administrator platform memverifikasi transaksi
              yang benar-benar diterima. Tagihan orang tua dikelola terpisah.
            </p>
            <p>
              Perpanjangan dan perubahan paket yang sudah berbayar dimulai
              setelah seluruh periode terbayar selesai. Tidak ada pemotongan
              sisa waktu, prorata, atau penagihan otomatis.
            </p>
          </div>
          {data.scheduledTerms?.length > 0 && (
            <section
              className="v9-card v9-elevated"
              aria-label="Periode paket terjadwal"
            >
              <h3>Periode paket terjadwal</h3>
              <p>
                Pembayaran sudah diverifikasi; akses berubah pada tanggal mulai,
                tanpa menghapus catatan anak.
              </p>
              {data.scheduledTerms.map((t: Item) => (
                <article className="op-list-item" key={t.id}>
                  <strong>
                    {data.catalog.find((p: Item) => p.id === t.plan_id)?.name}
                  </strong>
                  <p>
                    {new Date(t.starts_at).toLocaleDateString("id-ID")} —{" "}
                    {new Date(t.ends_at).toLocaleDateString("id-ID")}
                  </p>
                </article>
              ))}
            </section>
          )}
          <div className="v9-cycle">
            <button
              className={"op-btn " + (cycle === "monthly" ? "primary" : "")}
              onClick={() => setCycle("monthly")}
            >
              Bulanan
            </button>
            <button
              className={"op-btn " + (cycle === "yearly" ? "primary" : "")}
              onClick={() => setCycle("yearly")}
            >
              Tahunan · 10× harga bulanan
            </button>
          </div>
          <div className="v9-price-grid">
            {data.catalog.map((p: Item) => (
              <article
                className={
                  "v9-card v9-price-card " +
                  (p.id === current?.id ? "current" : "")
                }
                key={p.id}
              >
                <div className="v9-between">
                  <h3>{p.name}</h3>
                  {p.id === current?.id && (
                    <span className="v9-pill success">Akses saat ini</span>
                  )}
                </div>
                <div className="v9-price">
                  {money(
                    cycle === "yearly"
                      ? Math.round((p.monthly_idr * 10) / 12)
                      : p.monthly_idr,
                  )}
                  <small>/bulan{cycle === "yearly" ? " rata-rata" : ""}</small>
                </div>
                <p className="v9-smallprint">
                  {cycle === "yearly"
                    ? "Ditagih " + money(p.monthly_idr * 10) + " setahun"
                    : "Ditagih bulanan"}{" "}
                  · hingga {p.child_limit} anak
                </p>
                {[
                  "Catatan anak, kehadiran & Care Passport",
                  "Daily Story & komunikasi keluarga",
                  "Penjemputan & keselamatan",
                  ...p.features.map((f: string) => featureNames[f] || f),
                ].map((f: string) => (
                  <div className="v9-feature" key={f}>
                    <Check size={14} />
                    {f}
                  </div>
                ))}
                <footer>
                  <button
                    className="op-btn primary"
                    disabled={pending || data.used > p.child_limit}
                    onClick={() => setSelected(p)}
                  >
                    {data.used > p.child_limit
                      ? "Kuota belum sesuai"
                      : pending
                        ? "Tagihan menunggu verifikasi"
                        : "Ajukan paket"}{" "}
                    <ArrowRight size={15} />
                  </button>
                </footer>
              </article>
            ))}
          </div>
          <section className="v9-card v9-elevated">
            <span className="v9-overline">
              TEKNOLOGI ELENIO · ADD-ON TERPISAH
            </span>
            <h3>CCTV & AI Video Analytics</h3>
            <p>
              Tidak termasuk otomatis dalam Intelligence. Harga referensi draft;
              koneksi dan biaya implementasi perlu dikonfirmasi.
            </p>
            <div className="v10-addon-grid">
              {data.addonCatalog.map((a: Item) => (
                <form
                  key={a.id}
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (busy) return;
                    const quantity = Number(
                      new FormData(e.currentTarget).get("quantity"),
                    );
                    setBusy(true);
                    setError("");
                    void request("commercial/addons", "POST", {
                      addonId: a.id,
                      quantity,
                    })
                      .then(async () => {
                        setNotice(
                          "Kebutuhan add-on tersimpan. Layanan belum terhubung.",
                        );
                        await load();
                      })
                      .catch((e) => setError(e.message))
                      .finally(() => setBusy(false));
                  }}
                >
                  <h4>
                    {a.id === "cctv" ? (
                      <VideoCamera size={18} />
                    ) : (
                      <Sparkle size={18} />
                    )}{" "}
                    {a.name}
                  </h4>
                  <p>
                    {money(a.draft_unit_idr)}/kamera/bulan · referensi draft
                  </p>
                  <label>
                    Jumlah kamera
                    <input
                      name="quantity"
                      type="number"
                      min="0"
                      max="1000"
                      defaultValue="1"
                      required
                    />
                  </label>
                  <button className="op-btn" disabled={busy}>
                    Simpan kebutuhan
                  </button>
                </form>
              ))}
            </div>
            {data.addons.length > 0 && (
              <details>
                <summary>Riwayat permintaan ({data.addons.length})</summary>
                {data.addons.map((a: Item) => (
                  <p key={a.id}>
                    {a.name} · {a.quantity} kamera ·{" "}
                    {new Date(a.created_at).toLocaleDateString("id-ID")} · belum
                    terhubung
                  </p>
                ))}
              </details>
            )}
          </section>
          <section className="v9-card v9-elevated">
            <h3>Tagihan langganan Daylio</h3>
            <p>Terpisah dari pembayaran keluarga ke daycare.</p>
            <div className="v10-table-scroll">
              <table className="v10-live-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Paket</th>
                    <th>Jumlah</th>
                    <th>Status</th>
                    <th>Verifikasi</th>
                    <th>Periode / tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((i: Item) => (
                    <tr key={i.id}>
                      <td>
                        {new Date(i.created_at).toLocaleDateString("id-ID")}
                      </td>
                      <td>
                        {
                          data.catalog.find((p: Item) => p.id === i.plan_id)
                            ?.name
                        }{" "}
                        · {i.cycle}
                      </td>
                      <td>{money(i.amount)}</td>
                      <td>
                        {i.state === "verified"
                          ? "Terverifikasi"
                          : i.state === "pending"
                            ? "Menunggu verifikasi"
                            : "Dibatalkan"}
                      </td>
                      <td>
                        {i.reference || "Belum ada transaksi terverifikasi"}
                      </td>
                      <td>
                        {i.starts_at ? (
                          <>
                            <span>
                              {new Date(i.starts_at).toLocaleDateString(
                                "id-ID",
                              )}{" "}
                              —{" "}
                              {new Date(i.ends_at).toLocaleDateString("id-ID")}
                            </span>
                            {new Date(i.starts_at) > new Date() && (
                              <small> · Terjadwal</small>
                            )}
                          </>
                        ) : i.state === "pending" ? (
                          <CancelInvoice
                            invoice={i}
                            request={request}
                            onDone={async () => {
                              setNotice(
                                "Permintaan tagihan dibatalkan. Paket aktif tetap sama.",
                              );
                              await load();
                            }}
                          />
                        ) : (
                          i.cancel_reason || "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.invoices.length && <p>Belum ada tagihan langganan.</p>}
          </section>
        </>
      )}
      {selected && (
        <dialog
          ref={dialog}
          className="v10-commercial-dialog"
          onCancel={(e) => {
            if (busy) e.preventDefault();
            else setSelected(null);
          }}
        >
          <button
            className="op-icon"
            aria-label="Tutup"
            disabled={busy}
            onClick={() => setSelected(null)}
          >
            <X size={18} />
          </button>
          <span className="v9-overline">LANGGANAN DAYLIO</span>
          <h2>Ajukan {selected.name}</h2>
          <p>
            {selected.child_limit} anak ·{" "}
            {money(selected.monthly_idr * (cycle === "yearly" ? 10 : 1))} /{" "}
            {cycle === "yearly" ? "tahun" : "bulan"}
          </p>
          <p>
            Paket tidak berubah sampai transaksi diverifikasi administrator
            platform. Perpanjangan dan perubahan paket berbayar menunggu periode
            terbayar selesai; catatan anak tidak dihapus.
          </p>
          {data?.nextPaidTermStartsAt &&
            new Date(data.nextPaidTermStartsAt) >
              new Date(Date.now() + 60000) && (
              <p>
                Perkiraan mulai periode baru:{" "}
                <strong>
                  {new Date(data.nextPaidTermStartsAt).toLocaleDateString(
                    "id-ID",
                  )}
                </strong>
                . Tanggal final ditetapkan server saat pembayaran diverifikasi.
              </p>
            )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (busy) return;
              setBusy(true);
              setError("");
              void request("commercial/invoices", "POST", {
                planId: selected.id,
                cycle,
                confirmed: true,
              })
                .then(async () => {
                  setSelected(null);
                  setNotice(
                    "Tagihan tersimpan. Belum ada pembayaran atau aktivasi paket.",
                  );
                  await load();
                })
                .catch((e) => setError(e.message))
                .finally(() => setBusy(false));
            }}
          >
            <label className="op-checkbox">
              <input type="checkbox" required />
              Saya meminta tagihan paket ini dan memahami pembayaran perlu
              diverifikasi.
            </label>
            {error && <p role="alert">{error}</p>}
            <button className="op-btn primary" disabled={busy}>
              {busy ? "Menyimpan…" : "Buat permintaan tagihan"}
            </button>
          </form>
        </dialog>
      )}
    </div>
  );
}

function CancelInvoice({
  invoice,
  request,
  onDone,
}: {
  invoice: Item;
  request: Request;
  onDone: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (!open) return;
    const old = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return () => {
      dialog.current?.close();
      old?.focus();
    };
  }, [open]);
  return (
    <>
      <button
        className="op-btn"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        Batalkan tagihan
      </button>
      {open && (
        <dialog
          ref={dialog}
          className="v10-commercial-dialog"
          aria-label="Batalkan permintaan tagihan"
          onCancel={(e) => {
            if (busy) e.preventDefault();
            else setOpen(false);
          }}
        >
          <h2>Batalkan permintaan tagihan</h2>
          <p>
            Hanya tagihan yang belum diverifikasi dapat dibatalkan. Paket aktif
            dan catatan pengasuhan tetap tersimpan. Pembayaran yang sudah
            diverifikasi tidak dapat dibatalkan melalui tindakan ini.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (busy) return;
              const reason = String(
                new FormData(e.currentTarget).get("reason"),
              );
              setBusy(true);
              void request(`commercial/invoices/${invoice.id}/cancel`, "POST", {
                reason,
                confirmed: true,
              })
                .then(async () => {
                  setOpen(false);
                  await onDone();
                })
                .catch((e) => setError(e.message))
                .finally(() => setBusy(false));
            }}
          >
            <label>
              Alasan pembatalan
              <textarea name="reason" required minLength={6} maxLength={500} />
            </label>
            <label className="op-checkbox">
              <input type="checkbox" required />
              Saya membatalkan permintaan tagihan yang belum diverifikasi.
            </label>
            {error && <p role="alert">{error}</p>}
            <div className="op-row wrap">
              <button
                className="op-btn"
                type="button"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                Kembali
              </button>
              <button className="op-btn primary" disabled={busy}>
                Konfirmasi pembatalan
              </button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}
