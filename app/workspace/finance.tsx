"use client";
import { useEffect, useRef, useState } from "react";
import { Plus, X, DownloadSimple } from "@phosphor-icons/react";
type Item = Record<string, any>;
type Request = (
  path: string,
  method?: string,
  body?: any,
  key?: string,
) => Promise<any>;
const money = (n: number) => "Rp " + Number(n || 0).toLocaleString("id-ID");
const period = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
export default function Finance({
  request,
  children = [],
  family = false,
}: {
  request: Request;
  children?: Item[];
  family?: boolean;
}) {
  const [data, setData] = useState<Item | null>(null),
    [offset, setOffset] = useState(0),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [modal, setModal] = useState<Item | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  async function load() {
    try {
      setData(
        await request(
          (family ? "family/billing" : "billing/overview") +
            "?offset=" +
            offset,
        ),
      );
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    void load();
  }, [offset]);
  useEffect(() => {
    if (!modal) return;
    const prev = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return () => {
      dialog.current?.close();
      prev?.focus();
    };
  }, [modal]);
  async function mutation(fn: () => Promise<any>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
      setModal(null);
      setNotice("Perubahan tersimpan dan tercatat dalam audit.");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function receipt(invoice: Item) {
    try {
      const file = await request(
        (family ? "family" : "billing") + "/receipts/" + invoice.id,
      );
      const bytes = Uint8Array.from(atob(file.base64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: file.mime }));
      const link = document.createElement("a");
      link.href = url;
      link.download = file.filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e: any) {
      setError(e.message);
    }
  }
  return (
    <div className="v10-finance">
      <link rel="stylesheet" href="/workspace-v10.css" />
      <div className="v10-pagehead">
        <div>
          <h2>{family ? "Paket & Tagihan Keluarga" : "Tagihan Orang Tua"}</h2>
          <p>Tagihan daycare ke keluarga. Terpisah dari langganan Daylio.</p>
        </div>
        {!family && (
          <button
            className="op-btn primary"
            onClick={() => setModal({ type: "invoice" })}
          >
            <Plus size={16} /> Buat tagihan
          </button>
        )}
      </div>
      {error && !modal && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!data ? (
        <p>Memuat tagihan…</p>
      ) : (
        <>
          {family && data.packages.length > 0 && (
            <section className="v10-block">
              <h3>Paket anak Anda</h3>
              {data.packages.map((p: Item) => (
                <div className="v10-minirow" key={p.id}>
                  <span>
                    {p.child_name} · {p.data.packageName}
                  </span>
                  <b>{money(p.data.packagePrice)}</b>
                </div>
              ))}
            </section>
          )}
          <div className="v10-statstrip">
            {[
              ["Total tagihan", data.totals.count],
              ["Sudah diterima", money(data.totals.paid)],
              ["Belum diterima", money(data.totals.outstanding)],
              ["Jatuh tempo", data.totals.overdue],
            ].map(([l, v]) => (
              <div className="v10-stat" key={l}>
                <label>{l}</label>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
          <section className="v10-block">
            <div className="v10-table-scroll">
              <table className="v10-live-table">
                <thead>
                  <tr>
                    <th>Anak / tagihan</th>
                    <th>Jatuh tempo</th>
                    <th>Jumlah</th>
                    <th>Status</th>
                    <th>Tindakan</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((i: Item) => (
                    <tr key={i.id}>
                      <td>
                        <b>{i.child_name}</b>
                        <p>
                          {i.data.lines
                            .map((l: Item) => l.description)
                            .join(", ")}
                        </p>
                      </td>
                      <td>
                        {new Date(i.data.dueAt).toLocaleDateString("id-ID")}
                      </td>
                      <td>
                        {money(
                          i.data.lines.reduce(
                            (s: number, l: Item) => s + l.amount,
                            0,
                          ),
                        )}
                      </td>
                      <td>
                        {i.state === "paid"
                          ? "Terverifikasi manual"
                          : new Date(i.data.dueAt) < new Date()
                            ? "Jatuh tempo"
                            : "Menunggu pembayaran"}
                      </td>
                      <td>
                        {i.state === "paid" ? (
                          <button
                            className="op-btn"
                            onClick={() => void receipt(i)}
                          >
                            <DownloadSimple size={15} /> Bukti bayar
                          </button>
                        ) : (
                          !family && (
                            <>
                              <button
                                className="op-btn"
                                onClick={() =>
                                  setModal({ type: "verify", invoice: i })
                                }
                              >
                                Verifikasi transfer
                              </button>
                              <button
                                className="op-btn"
                                disabled={busy}
                                onClick={() =>
                                  void mutation(() =>
                                    request(
                                      "invoices/" + i.id + "/remind",
                                      "POST",
                                      {},
                                    ),
                                  )
                                }
                              >
                                Pengingat aplikasi
                              </button>
                            </>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.invoices.length && <p>Belum ada tagihan.</p>}
            <div className="op-row">
              <button
                className="op-btn"
                disabled={!offset}
                onClick={() => setOffset(Math.max(0, offset - 50))}
              >
                Sebelumnya
              </button>
              <button
                className="op-btn"
                disabled={data.nextOffset == null}
                onClick={() => setOffset(data.nextOffset)}
              >
                Berikutnya
              </button>
            </div>
            <p className="op-muted">
              Gateway belum terhubung. Tidak ada pembayaran yang dianggap lunas
              dari tampilan sukses atau tombol pelanggan.
            </p>
          </section>
          {!family && (
            <section className="v10-block">
              <div className="v10-blockhead">
                <div>
                  <h3>Tagihan bulanan berulang</h3>
                  <p>
                    Worker membuat invoice dari aturan yang disetujui, tanpa
                    mengonfirmasi pembayaran.
                  </p>
                </div>
                <button
                  className="op-btn"
                  onClick={() => setModal({ type: "recurring" })}
                >
                  Atur tagihan berulang
                </button>
              </div>
              {data.rules.map((r: Item) => (
                <div className="op-list-item" key={r.id}>
                  <strong>
                    {r.child_name} ·{" "}
                    {money(
                      r.lines.reduce((s: number, l: Item) => s + l.amount, 0),
                    )}
                    /bulan
                  </strong>
                  <p>
                    Tanggal {r.due_day} · mulai {r.start_month} ·{" "}
                    {r.active ? "Aktif" : "Dihentikan"}
                  </p>
                  {r.active && (
                    <div className="op-row">
                      <button
                        className="op-btn"
                        disabled={busy}
                        onClick={() =>
                          void mutation(() =>
                            request(
                              `billing/recurring/${r.id}/generate`,
                              "POST",
                              { period: period() },
                            ),
                          )
                        }
                      >
                        Buat invoice bulan ini
                      </button>
                      <button
                        className="op-btn"
                        disabled={busy}
                        onClick={() => setModal({ type: "stop", rule: r })}
                      >
                        Hentikan aturan
                      </button>
                    </div>
                  )}
                </div>
              ))}
              {!data.rules.length && <p>Belum ada aturan tagihan berulang.</p>}
            </section>
          )}
        </>
      )}
      {modal && (
        <dialog
          ref={dialog}
          className="v10-commercial-dialog"
          onCancel={(e) => {
            if (busy) e.preventDefault();
            else setModal(null);
          }}
        >
          <button
            className="op-icon"
            aria-label="Tutup"
            disabled={busy}
            onClick={() => setModal(null)}
          >
            <X size={18} />
          </button>
          <h2>
            {modal.type === "verify"
              ? "Verifikasi pembayaran manual"
              : modal.type === "stop"
                ? "Hentikan tagihan berulang"
                : modal.type === "recurring"
                  ? "Atur tagihan bulanan"
                  : "Buat tagihan keluarga"}
          </h2>
          <form
            className="op-form"
            onSubmit={(e) => {
              e.preventDefault();
              const v = Object.fromEntries(
                new FormData(e.currentTarget),
              ) as Record<string, string>;
              void mutation(() =>
                modal.type === "verify"
                  ? request(
                      "invoices/" + modal.invoice.id + "/record-manual-payment",
                      "POST",
                      { reference: v.reference, confirmed: true },
                    )
                  : modal.type === "stop"
                    ? request(
                        "billing/recurring/" + modal.rule.id + "/stop",
                        "POST",
                        {},
                      )
                    : modal.type === "recurring"
                      ? request("billing/recurring", "POST", {
                          childId: v.childId,
                          lines: [
                            {
                              description: v.description,
                              amount: Number(v.amount),
                            },
                          ],
                          dueDay: Number(v.dueDay),
                          startMonth: v.startMonth,
                          confirmed: true,
                        })
                      : request("invoices", "POST", {
                          childId: v.childId,
                          data: {
                            lines: [
                              {
                                description: v.description,
                                amount: Number(v.amount),
                              },
                            ],
                            dueAt: v.dueAt + "T23:59:59+07:00",
                          },
                        }),
              );
            }}
          >
            {modal.type === "verify" ? (
              <>
                <p>
                  Periksa transaksi yang benar-benar diterima untuk{" "}
                  {modal.invoice.child_name}. Jumlah dihitung dari invoice
                  tersimpan.
                </p>
                <label>
                  Referensi bank / transaksi
                  <input
                    name="reference"
                    required
                    minLength={6}
                    maxLength={160}
                  />
                </label>
                <label className="op-checkbox">
                  <input type="checkbox" required />
                  Saya telah memeriksa transaksi dan mengonfirmasi jumlahnya
                  sesuai invoice.
                </label>
              </>
            ) : modal.type === "stop" ? (
              <p>
                Invoice yang sudah dibuat dan bukti pembayaran tetap tersimpan.
                Aturan ini tidak menghasilkan invoice berikutnya.
              </p>
            ) : (
              <>
                <label>
                  Anak
                  <select name="childId" aria-label="Anak" required>
                    {children.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Rincian biaya
                  <input name="description" required maxLength={160} />
                </label>
                <label>
                  Jumlah IDR
                  <input
                    name="amount"
                    type="number"
                    min="1"
                    max="1000000000"
                    required
                  />
                </label>
                {modal.type === "recurring" ? (
                  <>
                    <label>
                      Tanggal jatuh tempo setiap bulan
                      <input
                        name="dueDay"
                        type="number"
                        min="1"
                        max="28"
                        required
                        defaultValue="10"
                      />
                    </label>
                    <label>
                      Mulai bulan
                      <input
                        name="startMonth"
                        type="month"
                        defaultValue={period()}
                        required
                      />
                    </label>
                    <label className="op-checkbox">
                      <input type="checkbox" required />
                      Saya menyetujui penerbitan invoice bulanan dari aturan
                      ini.
                    </label>
                  </>
                ) : (
                  <label>
                    Jatuh tempo
                    <input name="dueAt" type="date" required />
                  </label>
                )}
              </>
            )}
            {error && <p role="alert">{error}</p>}
            <button className="op-btn primary" disabled={busy}>
              {busy
                ? "Memproses…"
                : modal.type === "verify"
                  ? "Konfirmasi verifikasi"
                  : "Simpan"}
            </button>
          </form>
        </dialog>
      )}
    </div>
  );
}
