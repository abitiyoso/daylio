"use client";
import { useEffect, useRef, useState } from "react";
import { VideoCamera, ShieldCheck, Plus, X } from "@phosphor-icons/react";
type Item = Record<string, any>;
type Request = (
  path: string,
  method?: string,
  body?: any,
  key?: string,
) => Promise<any>;
export default function VideoIntegration({
  request,
  parent,
  childId,
  classes,
}: {
  request: Request;
  parent: boolean;
  childId: string;
  classes: Item[];
}) {
  const [data, setData] = useState<Item | null>(null),
    [modal, setModal] = useState<Item | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [tab, setTab] = useState("registry"),
    [incidents, setIncidents] = useState<Item[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  async function load() {
    if (parent) return;
    try {
      setData(await request("integrations/overview"));
      setIncidents(await request("incidents"));
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    void load();
  }, [parent]);
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
      setNotice("Perubahan tersimpan dalam audit.");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="op-stack">
      <section className="v10-block">
        <div className="v10-blockhead">
          <div>
            <h2>{parent ? "CCTV Area Anak" : "CCTV & AI Video Analytics"}</h2>
            <p>Reuse layanan Elenio · add-on terpisah dari langganan Daylio.</p>
          </div>
          <VideoCamera size={24} />
        </div>
        <div className="op-banner">
          <ShieldCheck size={24} />
          <div>
            <strong>Live CCTV belum terhubung</strong>
            <p>
              Belum ada sesi streaming yang dapat diterbitkan. Izin tenant,
              wali, anak, area, waktu, dan consent harus diperiksa sebelum
              koneksi provider dapat digunakan.
            </p>
          </div>
        </div>
        <p>
          Event AI merupakan sinyal untuk review manusia, bukan bukti final atau
          persetujuan otomatis penjemputan.
        </p>
        {parent && (
          <button
            className="op-btn"
            disabled={!childId}
            onClick={() =>
              void request("cameras?childId=" + childId)
                .then(() => setNotice("Tidak ada sesi kamera terhubung."))
                .catch((e) => setError(e.message))
            }
          >
            Periksa izin & ketersediaan
          </button>
        )}
      </section>
      {error && !modal && (
        <p className="op-alert" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="op-notice" role="status">
          {notice}
        </p>
      )}
      {!parent && (
        <section className="v10-block">
          <div className="op-row">
            <button
              className={"op-btn " + (tab === "registry" ? "primary" : "")}
              onClick={() => setTab("registry")}
            >
              Kamera & Area
            </button>
            <button
              className={"op-btn " + (tab === "events" ? "primary" : "")}
              onClick={() => setTab("events")}
            >
              AI Event Review
            </button>
          </div>
          {!data ? (
            <p>Memuat metadata integrasi…</p>
          ) : tab === "registry" ? (
            <>
              <div className="v10-blockhead">
                <div>
                  <h3>Pemetaan kamera</h3>
                  <p>
                    Registrasi metadata tidak membuat koneksi kamera atau
                    menyimpan kredensial RTSP.
                  </p>
                </div>
                <button
                  className="op-btn"
                  disabled={!classes.length}
                  onClick={() => setModal({ type: "camera" })}
                >
                  <Plus size={16} /> Tambah pemetaan
                </button>
              </div>
              {data.registry.map((c: Item) => (
                <article className="op-list-item" key={c.id}>
                  <strong>{c.name}</strong>
                  <p>
                    {c.classroom_name} · {c.area} · ID eksternal {c.external_id}
                  </p>
                  <span className="op-badge">
                    {c.enabled ? "Menunggu koneksi provider" : "Dinonaktifkan"}
                  </span>
                  {c.enabled && (
                    <button
                      className="op-btn"
                      disabled={busy}
                      onClick={() => setModal({ type: "disable", camera: c })}
                    >
                      Nonaktifkan pemetaan
                    </button>
                  )}
                </article>
              ))}
              {!data.registry.length && (
                <p>
                  Belum ada kamera yang dipetakan. Tidak ada video atau event
                  contoh dalam workspace.
                </p>
              )}
            </>
          ) : (
            <>
              <h3>Sinyal provider untuk review</h3>
              {data.events.length ? (
                data.events.map((e: Item) => (
                  <article className="op-list-item" key={e.id}>
                    <div className="op-row between">
                      <strong>
                        {e.camera_name} · {e.event_type}
                      </strong>
                      <span className="op-badge">
                        {e.state === "reviewed"
                          ? "Ditinjau manusia"
                          : "Menunggu review"}
                      </span>
                    </div>
                    <p>
                      {new Date(e.occurred_at).toLocaleString("id-ID")} ·
                      metadata diterima{" "}
                      {new Date(e.received_at).toLocaleString("id-ID")}
                    </p>
                    <p>
                      {e.review_note ||
                        "Periksa konteks dan prosedur daycare sebelum menyimpulkan tindakan."}
                    </p>
                    {e.state === "reviewed" && (
                      <button
                        className="op-btn"
                        onClick={() => setModal({ type: "link", event: e })}
                      >
                        {e.incident_id
                          ? "Ubah tautan insiden"
                          : "Tautkan insiden yang ditinjau"}
                      </button>
                    )}
                    {e.state === "pending" && (
                      <button
                        className="op-btn"
                        onClick={() => setModal({ type: "review", event: e })}
                      >
                        Review & catat tindak lanjut
                      </button>
                    )}
                  </article>
                ))
              ) : (
                <p>
                  Belum ada event dari provider. Tidak ada deteksi yang dibuat
                  oleh Daylio.
                </p>
              )}
            </>
          )}
        </section>
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
            {modal.type === "camera"
              ? "Tambah pemetaan kamera"
              : modal.type === "link"
                ? "Tautkan catatan insiden"
                : modal.type === "review"
                  ? "Review sinyal video"
                  : "Nonaktifkan pemetaan"}
          </h2>
          <form
            className="op-form"
            onSubmit={(e) => {
              e.preventDefault();
              const v = Object.fromEntries(new FormData(e.currentTarget));
              void mutation(() =>
                modal.type === "camera"
                  ? request("integrations/registry", "POST", v)
                  : modal.type === "link"
                    ? request(
                        `integrations/events/${modal.event.id}/link-incident`,
                        "POST",
                        { ...v, confirmed: true },
                      )
                    : modal.type === "review"
                      ? request(
                          `integrations/events/${modal.event.id}/review`,
                          "POST",
                          v,
                        )
                      : request(
                          `integrations/registry/${modal.camera.id}/disable`,
                          "POST",
                          {},
                        ),
              );
            }}
          >
            {modal.type === "camera" ? (
              <>
                <label>
                  Nama kamera
                  <input name="name" required maxLength={160} />
                </label>
                <label>
                  ID eksternal Elenio
                  <input
                    name="externalId"
                    required
                    pattern="[A-Za-z0-9_.:\-]+"
                    maxLength={160}
                  />
                </label>
                <label>
                  Kelas / lokasi
                  <select name="classroomId" required>
                    {classes.map((c) => (
                      <option value={c.id} key={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Area
                  <select name="area">
                    <option value="shared-play">Area bermain bersama</option>
                    <option value="shared-learning">
                      Area belajar bersama
                    </option>
                    <option value="lobby">Lobby / pintu masuk</option>
                  </select>
                </label>
                <p>
                  Gunakan pengenal kamera, bukan URL stream, password atau token
                  provider.
                </p>
              </>
            ) : modal.type === "link" ? (
              <>
                <label>
                  Insiden terdaftar
                  <select name="incidentId" required>
                    {incidents.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.data.severity} · {i.data.note}
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  Server memeriksa organisasi, kelas, dan catatan insiden yang
                  sudah ada. Tidak ada identifikasi anak dari sinyal AI.
                </p>
                <label className="op-checkbox">
                  <input type="checkbox" required />
                  Saya telah memeriksa hubungan ini sesuai SOP.
                </label>
              </>
            ) : modal.type === "review" ? (
              <>
                <label>
                  Catatan verifikasi & tindak lanjut
                  <textarea
                    name="note"
                    required
                    minLength={10}
                    maxLength={2000}
                  />
                </label>
                <label className="op-checkbox">
                  <input type="checkbox" required />
                  Saya sudah meninjau konteks sesuai SOP. Catatan ini tidak
                  membuktikan identitas penjemput.
                </label>
              </>
            ) : (
              <p>
                Metadata dan audit tetap tersimpan. Pemetaan ini tidak lagi
                menerima event baru.
              </p>
            )}
            {error && <p role="alert">{error}</p>}
            <button className="op-btn primary" disabled={busy}>
              {busy ? "Menyimpan…" : "Simpan"}
            </button>
          </form>
        </dialog>
      )}
    </div>
  );
}
