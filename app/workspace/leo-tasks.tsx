"use client";
import { useEffect, useRef, useState } from "react";
import { X, Sparkle, ShieldCheck } from "@phosphor-icons/react";
type Item = Record<string, any>;
type Request = (
  path: string,
  method?: string,
  body?: any,
  key?: string,
) => Promise<any>;
export default function LeoTasks({
  request,
  role,
  children,
  records,
  canCrm,
}: {
  request: Request;
  role: string;
  children: Item[];
  records: Item[];
  canCrm: boolean;
}) {
  const [tasks, setTasks] = useState<Item[]>([]),
    [leads, setLeads] = useState<Item[]>([]),
    [error, setError] = useState(""),
    [modal, setModal] = useState<Item | null>(null),
    [busy, setBusy] = useState(false),
    [kind, setKind] = useState("care-summary-draft");
  const dialog = useRef<HTMLDialogElement>(null);
  const management = ["owner", "manager"].includes(role);
  async function load() {
    try {
      setTasks((await request("leo/work-items")).items);
      if (canCrm) setLeads(await request("leads"));
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    if (role !== "parent") void load();
  }, []);
  useEffect(() => {
    if (!modal) return;
    const prev = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return () => {
      dialog.current?.close();
      prev?.focus();
    };
  }, [modal]);
  async function act(fn: () => Promise<any>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
      setModal(null);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (role === "parent") return null;
  return (
    <section className="op-card">
      <div className="op-section-head">
        <div>
          <h2>LEO AI Workspace</h2>
          <p className="op-muted">
            Mode catatan terverifikasi · provider AI belum terhubung.
          </p>
        </div>
        <Sparkle size={22} />
      </div>
      <p>
        Usulan disiapkan dari catatan berizin. Pemeriksaan dan persetujuan
        manusia selalu mendahului pelaksanaan. LEO tidak mengirim pesan
        eksternal, membayar tagihan, menyetujui penjemput, atau menerbitkan
        cerita otomatis.
      </p>
      {error && !modal && <p role="alert">{error}</p>}
      <button
        className="op-btn primary"
        onClick={() => setModal({ type: "new" })}
      >
        Buat usulan tindakan
      </button>
      {tasks.map((t) => (
        <article className="op-list-item" key={t.id}>
          <div className="op-row between">
            <strong>
              {t.kind === "care-summary-draft"
                ? "Draf ringkasan pengasuhan"
                : "Tindak lanjut prospek"}
            </strong>
            <span className="op-badge">
              {
                (
                  {
                    proposed: "Diusulkan",
                    drafted: "Draf siap ditinjau",
                    approved: "Disetujui manusia",
                    executed: "Dilaksanakan",
                    cancelled: "Dibatalkan",
                  } as Item
                )[t.state]
              }
            </span>
          </div>
          <p>
            {t.draft_text ||
              "Catatan sumber akan diperiksa kembali sebelum draf disiapkan."}
          </p>
          <small>
            {t.source_ids.length} sumber ·{" "}
            {new Date(t.created_at).toLocaleString("id-ID")}
          </small>
          <div className="op-row">
            {t.state === "proposed" && (
              <button
                className="op-btn"
                disabled={busy}
                onClick={() =>
                  void act(() =>
                    request(`leo/work-items/${t.id}/draft`, "POST", {}),
                  )
                }
              >
                Siapkan draf
              </button>
            )}
            {t.state === "drafted" && management && (
              <button
                className="op-btn"
                onClick={() => setModal({ type: "approve", task: t })}
              >
                Tinjau & setujui
              </button>
            )}
            {t.state === "approved" && management && (
              <button
                className="op-btn"
                onClick={() => setModal({ type: "execute", task: t })}
              >
                Jalankan tindakan disetujui
              </button>
            )}
            {!["executed", "cancelled"].includes(t.state) && (
              <button
                className="op-btn"
                disabled={busy}
                onClick={() =>
                  void act(() =>
                    request(`leo/work-items/${t.id}/cancel`, "POST", {}),
                  )
                }
              >
                Batalkan usulan
              </button>
            )}
          </div>
          {t.state === "executed" && (
            <p className="op-muted">
              {t.kind === "care-summary-draft"
                ? "Draf internal dibuat; belum dipublikasikan ke orang tua."
                : "Tugas follow-up tersimpan; tidak ada pesan dikirim."}
            </p>
          )}
        </article>
      ))}
      {!tasks.length && <p>Belum ada usulan tindakan.</p>}
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
            {modal.type === "new"
              ? "Usulan tindakan LEO"
              : modal.type === "approve"
                ? "Tinjau sebelum menyetujui"
                : "Konfirmasi pelaksanaan"}
          </h2>
          <form
            className="op-form"
            onSubmit={(e) => {
              e.preventDefault();
              const v = Object.fromEntries(
                new FormData(e.currentTarget),
              ) as Record<string, string>;
              void act(() =>
                modal.type === "new"
                  ? request(
                      "leo/work-items",
                      "POST",
                      kind === "care-summary-draft"
                        ? {
                            kind,
                            childId: v.childId,
                            sourceIds: records
                              .filter(
                                (r) =>
                                  r.child_id === v.childId &&
                                  r.kind === "activity" &&
                                  r.state === "published",
                              )
                              .slice(0, 30)
                              .map((r) => r.id),
                          }
                        : {
                            kind,
                            leadId: v.leadId,
                            dueAt: new Date(v.dueAt).toISOString(),
                            note: v.note,
                          },
                    )
                  : request(
                      `leo/work-items/${modal.task.id}/${modal.type}`,
                      "POST",
                      { confirmed: true },
                    ),
              );
            }}
          >
            {modal.type === "new" ? (
              <>
                <label>
                  Tindakan yang diizinkan
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value)}
                  >
                    <option value="care-summary-draft">
                      Siapkan draf ringkasan pengasuhan
                    </option>
                    {canCrm && (
                      <option value="crm-followup">
                        Siapkan tugas tindak lanjut prospek
                      </option>
                    )}
                  </select>
                </label>
                {kind === "care-summary-draft" ? (
                  <>
                    <label>
                      Anak
                      <select name="childId" aria-label="Anak" required>
                        {children
                          .filter((c) =>
                            records.some(
                              (r) =>
                                r.child_id === c.id &&
                                r.kind === "activity" &&
                                r.state === "published",
                            ),
                          )
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <p>
                      Hanya aktivitas terbit anak tersebut yang menjadi sumber.
                      Bila belum ada catatan, catat dan review kegiatan terlebih
                      dahulu.
                    </p>
                  </>
                ) : (
                  <>
                    <label>
                      Prospek
                      <select name="leadId" aria-label="Prospek" required>
                        {leads
                          .filter(
                            (l) => !["lost", "enrolled"].includes(l.state),
                          )
                          .map((l) => (
                            <option key={l.id} value={l.id}>
                              {l.data.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <label>
                      Jadwal tindak lanjut
                      <input type="datetime-local" name="dueAt" required />
                    </label>
                    <label>
                      Draf catatan
                      <textarea name="note" maxLength={2000} required />
                    </label>
                  </>
                )}
              </>
            ) : (
              <>
                <ShieldCheck size={24} />
                <p>{modal.task.draft_text}</p>
                <p>
                  {modal.task.kind === "care-summary-draft"
                    ? "Pelaksanaan hanya membuat draf internal, bukan publikasi."
                    : "Pelaksanaan membuat tugas follow-up, bukan mengirim WhatsApp."}
                </p>
                <label className="op-checkbox">
                  <input type="checkbox" required />
                  Saya telah memeriksa sumber dan menyetujui{" "}
                  {modal.type === "execute"
                    ? "pelaksanaan tindakan ini"
                    : "draf ini"}
                  .
                </label>
              </>
            )}
            {error && <p role="alert">{error}</p>}
            <button className="op-btn primary" disabled={busy}>
              {busy ? "Memeriksa…" : "Konfirmasi"}
            </button>
          </form>
        </dialog>
      )}
    </section>
  );
}
