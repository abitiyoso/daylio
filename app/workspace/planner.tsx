"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  CalendarBlank,
  X,
  UsersThree,
} from "@phosphor-icons/react";
import ClassroomSetup from "./classroom-setup";
type Item = Record<string, any>;
type Request = (
  path: string,
  method?: string,
  body?: any,
  key?: string,
) => Promise<any>;
const day = (value: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(value);
const dateShift = (value: string, n: number) =>
  day(new Date(new Date(value + "T12:00:00+07:00").getTime() + n * 86400000));
const label = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value + "T12:00:00+07:00"));
const clock = (value: string) =>
  new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
const inputTime = (value: string) =>
  new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .format(new Date(value))
    .replace(" ", "T");
export default function Planner({
  request,
  role,
}: {
  request: Request;
  role: string;
}) {
  const today = day(new Date()),
    [anchor, setAnchor] = useState(today),
    [view, setView] = useState("week"),
    [room, setRoom] = useState(""),
    [selectedDate, setDate] = useState(today),
    [data, setData] = useState<Item | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [modal, setModal] = useState<Item | null>(null),
    [history, setHistory] = useState<Item[]>([]);
  const dialog = useRef<HTMLDialogElement>(null),
    version = useRef(0);
  const weekday = new Date(anchor + "T12:00:00+07:00").getUTCDay(),
    monday = dateShift(anchor, -((weekday + 6) % 7)),
    days = Array.from({ length: 7 }, (_, i) => dateShift(monday, i));
  const management = ["owner", "manager"].includes(role);
  async function load() {
    const n = ++version.current;
    setError("");
    try {
      const result = await request(
        "planner/overview?" +
          new URLSearchParams({
            from: monday + "T00:00:00+07:00",
            to: dateShift(monday, 7) + "T00:00:00+07:00",
          }),
      );
      if (n === version.current) {
        setData(result);
        setRoom((old) =>
          result.classrooms.some((c: Item) => c.id === old)
            ? old
            : result.classrooms[0]?.id || "",
        );
      }
    } catch (e: any) {
      if (n === version.current) setError(e.message);
    }
  }
  useEffect(() => {
    void load();
  }, [monday]);
  useEffect(() => {
    if (!modal) return;
    const prev = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return () => {
      dialog.current?.close();
      prev?.focus();
    };
  }, [modal?.key]);
  const classes: Item[] = data?.classrooms || [],
    kids: Item[] = data?.children || [],
    staff: Item[] = data?.staff || [],
    bookings: Item[] = data?.bookings || [],
    shifts: Item[] = data?.shifts || [];
  const activeBookings = bookings.filter((b) => b.state === "confirmed"),
    activeShifts = shifts.filter((s) => s.state === "scheduled");
  const onDay = (rows: Item[], classId: string, date: string) =>
    rows.filter(
      (r) => r.classroom_id === classId && day(new Date(r.starts_at)) === date,
    );
  const occupied = (classId: string, date: string) =>
    kids.filter((k) => k.classroom_id === classId).length +
    onDay(activeBookings, classId, date).filter((b) => !b.child_id).length;
  const roomData = classes.find((c) => c.id === room),
    roomBookings = onDay(activeBookings, room, selectedDate);
  async function open(type: string, row?: Item) {
    setHistory([]);
    setModal({ key: crypto.randomUUID(), type, row });
    if (row && management)
      try {
        setHistory(await request("planner/history/" + row.id));
      } catch (e: any) {
        setError(e.message);
      }
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !modal) return;
    const values = Object.fromEntries(
      new FormData(event.currentTarget),
    ) as Record<string, string>;
    setBusy(true);
    setError("");
    try {
      const payload: Item = {
        classroomId: values.classroomId,
        startsAt: values.startsAt + ":00+07:00",
        endsAt: values.endsAt + ":00+07:00",
      };
      if (modal.type === "shift") payload.userId = values.userId;
      else
        Object.assign(payload, {
          type: values.type,
          childId: values.childId || null,
          leadId: values.leadId || null,
          childName:
            values.childName ||
            kids.find((k) => k.id === values.childId)?.name ||
            "Anak",
        });
      if (modal.row) payload.revision = modal.row.revision;
      await request(
        `planner/${modal.type === "shift" ? "shifts" : "bookings"}${modal.row ? "/" + modal.row.id : ""}`,
        modal.row ? "PATCH" : "POST",
        payload,
      );
      setModal(null);
      setNotice(
        "Jadwal tersimpan. Kapasitas dan penugasan diperiksa oleh server.",
      );
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    if (!modal?.row || busy) return;
    setBusy(true);
    try {
      await request(
        `planner/${modal.type === "shift" ? "shifts" : "bookings"}/${modal.row.id}/cancel`,
        "POST",
        { revision: modal.row.revision },
      );
      setModal(null);
      setNotice("Jadwal dibatalkan; riwayat tetap tersimpan.");
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const fieldDate = modal?.row
      ? inputTime(modal.row.starts_at)
      : selectedDate + "T09:00",
    fieldEnd = modal?.row
      ? inputTime(modal.row.ends_at)
      : selectedDate + "T11:00";
  return (
    <div className="sc-app">
      <link rel="stylesheet" href="/workspace-v10.css" />
      <div className="sc-topbar">
        <div>
          <span className="sc-eyebrow">DAYLIO · OPERATIONS / SCHEDULING</span>
          <h1>Jadwal yang jelas. Kapasitas terkendali.</h1>
          <p>Atur kelas, penugasan pengasuh, dan booking tanpa bentrok.</p>
        </div>
        {management && (
          <div className="sc-actions">
            <ClassroomSetup
              request={request}
              classes={classes}
              branches={data?.branches || []}
              onSaved={load}
            />
            <button className="sc-button" onClick={() => void open("shift")}>
              <UsersThree size={16} /> Atur shift
            </button>
            <button
              className="sc-button primary"
              onClick={() => void open("booking")}
            >
              <Plus size={16} /> Booking baru
            </button>
          </div>
        )}
      </div>
      {error && !modal && (
        <p className="sc-formerror" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {!data ? (
        <p>Memuat jadwal…</p>
      ) : (
        <>
          <div className="sc-shellstats">
            {[
              ["Anak terdaftar", kids.length, "Dari data aktif"],
              ["Booking khusus", activeBookings.length, "Pada minggu ini"],
              ["Kelas", classes.length, "Sesuai hak akses"],
              ["Shift terjadwal", activeShifts.length, "Pada minggu ini"],
            ].map(([title, value, note]) => (
              <div className="sc-stat" key={title}>
                <span>{title}</span>
                <strong>{value}</strong>
                <small>{note}</small>
              </div>
            ))}
          </div>
          <div className="sc-workspace">
            <section className="sc-main">
              <div className="sc-toolbar">
                <div className="sc-weeknav">
                  <button
                    className="sc-button icon"
                    aria-label="Minggu sebelumnya"
                    onClick={() => setAnchor(dateShift(anchor, -7))}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <button
                    className="sc-button"
                    onClick={() => {
                      setAnchor(today);
                      setDate(today);
                    }}
                  >
                    Hari ini
                  </button>
                  <button
                    className="sc-button icon"
                    aria-label="Minggu berikutnya"
                    onClick={() => setAnchor(dateShift(anchor, 7))}
                  >
                    <ArrowRight size={16} />
                  </button>
                  <b>
                    {label(monday)} – {label(days[6])}
                  </b>
                </div>
                <div className="sc-viewtabs">
                  {[
                    ["week", "Minggu"],
                    ["day", "Hari"],
                    ["staff", "Roster staf"],
                  ].map(([key, title]) => (
                    <button
                      className={view === key ? "active" : ""}
                      onClick={() => setView(key)}
                      key={key}
                    >
                      {title}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sc-filters">
                <label>
                  Kelas{" "}
                  <select
                    aria-label="Kelas planner"
                    value={room}
                    onChange={(e) => setRoom(e.target.value)}
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tanggal{" "}
                  <input
                    aria-label="Tanggal planner"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setAnchor(e.target.value);
                    }}
                  />
                </label>
              </div>
              {view === "week" ? (
                <>
                  <div className="sc-mobilehint">
                    Geser untuk melihat seluruh hari · Pilih sel untuk detail
                  </div>
                  <div className="sc-tablewrap">
                    <div className="sc-grid v10-live-week">
                      <div className="sc-gridhead">Kelas / Ruang</div>
                      {days.map((d) => (
                        <div className="sc-gridhead" key={d}>
                          {label(d)}
                        </div>
                      ))}
                      {classes.map((c) => (
                        <div className="v10-contents" key={c.id}>
                          <div className="sc-roomlead">
                            <strong>{c.name}</strong>
                            <small>
                              {c.capacity || "Belum diatur"} kapasitas
                            </small>
                            <span className="sc-roomtag">
                              Rasio konfigurasi 1:{c.caregiver_ratio || "—"}
                            </span>
                          </div>
                          {days.map((d) => (
                            <button
                              className={
                                "sc-cell " +
                                (room === c.id && selectedDate === d
                                  ? "selected"
                                  : "")
                              }
                              key={d}
                              onClick={() => {
                                setRoom(c.id);
                                setDate(d);
                              }}
                            >
                              <strong>
                                {occupied(c.id, d)}/{c.capacity || "—"}
                              </strong>
                              <small>Basis terdaftar + booking</small>
                              {onDay(activeBookings, c.id, d).map((b) => (
                                <span className="sc-event" key={b.id}>
                                  {b.child_name} · {b.type}
                                </span>
                              ))}
                              <small>
                                {onDay(activeShifts, c.id, d).length} shift
                              </small>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : view === "day" ? (
                <div className="sc-dayview">
                  {classes.map((c) => (
                    <article className="sc-daycard" key={c.id}>
                      <div>
                        <h3>{c.name}</h3>
                        <small>{label(selectedDate)}</small>
                      </div>
                      <div>
                        <strong>
                          {occupied(c.id, selectedDate)}/{c.capacity || "—"}{" "}
                          anak
                        </strong>
                        <p>
                          {onDay(activeShifts, c.id, selectedDate).length} shift
                          terjadwal
                        </p>
                      </div>
                      <button
                        className="sc-button"
                        onClick={() => setRoom(c.id)}
                      >
                        Detail <ArrowRight size={14} />
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="sc-dayview">
                  {activeShifts.length ? (
                    activeShifts.map((s) => (
                      <article className="sc-daycard" key={s.id}>
                        <div>
                          <h3>{s.staff_name || "Pengasuh"}</h3>
                          <small>
                            {classes.find((c) => c.id === s.classroom_id)?.name}
                          </small>
                        </div>
                        <div>
                          {label(day(new Date(s.starts_at)))}
                          <p>
                            {clock(s.starts_at)}–{clock(s.ends_at)}
                          </p>
                        </div>
                        {management && (
                          <button
                            className="sc-button"
                            onClick={() => void open("shift", s)}
                          >
                            Ubah shift
                          </button>
                        )}
                      </article>
                    ))
                  ) : (
                    <p>Belum ada shift pada minggu ini.</p>
                  )}
                </div>
              )}
              <div className="sc-footnote">
                Anak terdaftar sudah memesan kursi kelas. Prospek menambah
                kebutuhan kursi pada interval booking; server memeriksa puncak
                bersamaan dan cakupan staf sepanjang interval. Angka pada sel
                adalah batas atas per hari. Rasio berasal dari konfigurasi
                daycare. Tidak ada pembayaran atau WhatsApp yang dikirim
                otomatis.
              </div>
            </section>
            <aside className="sc-side">
              <section className="sc-sidepanel">
                <div className="sc-sidepanel-header">
                  <small>DETAIL KAPASITAS</small>
                  <h3>
                    {roomData?.name || "Kelas"} · {label(selectedDate)}
                  </h3>
                  <p>{roomData?.branch_name}</p>
                </div>
                <div className="sc-sidepanel-body">
                  <div className="sc-minirow">
                    <span>Basis anak terdaftar</span>
                    <strong>
                      {kids.filter((k) => k.classroom_id === room).length} /{" "}
                      {roomData?.capacity || "—"}
                    </strong>
                  </div>
                  <div className="sc-minirow">
                    <span>Pengasuh bertugas</span>
                    <strong>
                      {onDay(activeShifts, room, selectedDate).length} shift
                    </strong>
                  </div>
                  <h4>Booking khusus</h4>
                  {roomBookings.length ? (
                    roomBookings.map((b) => (
                      <div className="sc-minirow" key={b.id}>
                        <span>
                          {b.child_name}
                          <small>
                            {b.type} · {clock(b.starts_at)}–{clock(b.ends_at)}
                          </small>
                        </span>
                        {management && (
                          <button
                            className="sc-button"
                            onClick={() => void open("booking", b)}
                          >
                            Ubah
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p>Belum ada booking khusus.</p>
                  )}
                  {management && (
                    <button
                      className="sc-button primary"
                      onClick={() => void open("booking")}
                    >
                      <CalendarBlank size={16} /> Tambah trial / booking
                    </button>
                  )}
                </div>
              </section>
            </aside>
          </div>
        </>
      )}
      {modal && (
        <dialog
          ref={dialog}
          className="sc-modal v10-schedule-dialog"
          onCancel={(e) => {
            if (busy) e.preventDefault();
            else setModal(null);
          }}
        >
          <div className="sc-modal-head">
            <div>
              <h2>
                {modal.row ? "Ubah" : "Tambah"}{" "}
                {modal.type === "shift"
                  ? "penugasan pengasuh"
                  : "booking daycare"}
              </h2>
              <p>Kapasitas, waktu, dan izin diperiksa saat menyimpan.</p>
            </div>
            <button
              className="sc-button icon"
              aria-label="Tutup dialog"
              disabled={busy}
              onClick={() => setModal(null)}
            >
              <X size={18} />
            </button>
          </div>
          <form className="sc-modal-body" onSubmit={save}>
            <div className="sc-formgrid">
              <label>
                Kelas
                <select
                  name="classroomId"
                  aria-label="Kelas"
                  defaultValue={modal.row?.classroom_id || room}
                  required
                >
                  {classes.map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              {modal.type === "shift" ? (
                <label>
                  Pengasuh
                  <select
                    name="userId"
                    aria-label="Pengasuh"
                    defaultValue={modal.row?.user_id}
                    required
                  >
                    {staff.map((s) => (
                      <option value={s.user_id} key={s.user_id}>
                        {s.display_name || s.role}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label>
                  Jenis booking
                  <select
                    name="type"
                    aria-label="Jenis booking"
                    defaultValue={modal.row?.type || "trial"}
                  >
                    {[
                      ["trial", "Trial"],
                      ["regular", "Reguler"],
                      ["extra-day", "Extra day"],
                      ["drop-in", "Drop-in"],
                    ].map(([v, l]) => (
                      <option value={v} key={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {modal.type === "booking" && (
              <>
                <div className="sc-formgrid">
                  <label>
                    Anak terdaftar
                    <select
                      name="childId"
                      aria-label="Anak terdaftar"
                      defaultValue={modal.row?.child_id || ""}
                    >
                      <option value="">Booking prospek</option>
                      {kids.map((k) => (
                        <option value={k.id} key={k.id}>
                          {k.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Prospek
                    <select
                      name="leadId"
                      aria-label="Prospek"
                      defaultValue={modal.row?.lead_id || ""}
                    >
                      <option value="">Tidak menggunakan prospek</option>
                      {(data?.leads || []).map((l: Item) => (
                        <option value={l.id} key={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  Nama anak prospek
                  <input
                    name="childName"
                    maxLength={160}
                    defaultValue={modal.row?.child_name || ""}
                  />
                </label>
              </>
            )}
            <div className="sc-formgrid">
              <label>
                Mulai
                <input
                  name="startsAt"
                  type="datetime-local"
                  defaultValue={fieldDate}
                  required
                />
              </label>
              <label>
                Selesai
                <input
                  name="endsAt"
                  type="datetime-local"
                  defaultValue={fieldEnd}
                  required
                />
              </label>
            </div>
            <p className="sc-formhelp">
              Waktu Indonesia Barat · Pilih anak terdaftar atau prospek yang
              terhubung. Catatan tidak menagih pembayaran.
            </p>
            {error && (
              <p className="sc-formerror" role="alert">
                {error}
              </p>
            )}
            {history.length > 0 && (
              <details>
                <summary>Riwayat perubahan ({history.length})</summary>
                {history.map((h) => (
                  <p key={h.id}>
                    {new Date(h.created_at).toLocaleString("id-ID")} · revisi{" "}
                    {h.after_data.revision} · {h.after_data.state}
                  </p>
                ))}
              </details>
            )}
            <div className="sc-modalfoot">
              {modal.row && (
                <button
                  type="button"
                  className="sc-button"
                  disabled={busy}
                  onClick={() => void cancel()}
                >
                  Batalkan jadwal
                </button>
              )}
              <button
                type="button"
                className="sc-button"
                disabled={busy}
                onClick={() => setModal(null)}
              >
                Tutup
              </button>
              <button
                className="sc-button primary"
                disabled={busy || !classes.length}
              >
                {busy ? "Memeriksa…" : "Cek & simpan"}
              </button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}
