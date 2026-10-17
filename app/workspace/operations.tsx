"use client";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  Heart,
  SquaresFour,
  ClipboardText,
  ForkKnife,
  Moon,
  PuzzlePiece,
  Drop,
  BookOpen,
  NotePencil,
  ShieldCheck,
  ChartBar,
  ChatCircleText,
  UsersThree,
  GearSix,
  Sparkle,
  Bell,
  SignOut,
  List,
  X,
  CaretRight,
  Plus,
  Check,
  ArrowRight,
  Sun,
  CheckCircle,
  Clock,
  WarningCircle,
  House,
  CalendarBlank,
  Baby,
  DownloadSimple,
} from "@phosphor-icons/react";
import "./operations.css";
type Item = Record<string, any>;
type Request = (
  path: string,
  method?: string,
  body?: any,
  key?: string,
) => Promise<any>;
type Props = {
  user: Item;
  organizationId: string;
  memberships: Item[];
  request: Request;
  onTools: () => void;
  onLogout: () => Promise<void>;
  onOrganization: (id: string) => Promise<void>;
};
type FormField = {
  name: string;
  label: string;
  type?: string;
  options?: { value: string; label: string }[];
  value?: string;
  required?: boolean;
};
const roles: Record<string, string> = {
  owner: "Pemilik",
  manager: "Pengelola",
  caregiver: "Pengasuh",
  parent: "Orang tua",
};
const kinds: Record<string, string> = {
  "daily-story": "Daily Story menunggu review",
  "staff-coverage": "Cakupan pengasuh perlu diperiksa",
  "morning-note": "Pesan pagi",
  activity: "Catatan aktivitas",
  "pickup-authorization": "Izin penjemput pengganti",
  incident: "Insiden",
  "passport-change": "Perubahan Care Passport",
  observation: "Observasi perkembangan",
  handoff: "Serah terima shift",
  "still-present": "Anak belum pulang",
  "missing-story": "Daily Story belum terbit",
};
const status: Record<string, string> = {
  draft: "Draf",
  published: "Terbit",
  approved: "Disetujui",
  requested: "Menunggu review",
  submitted: "Menunggu review",
  acknowledged: "Sudah diterima",
  used: "Sudah digunakan",
  revoked: "Dicabut",
  rejected: "Perlu perbaikan",
  recorded: "Tercatat",
  active: "Aktif",
  enrolled: "Terdaftar",
  qualified: "Terkualifikasi",
  new: "Baru",
  contacted: "Dihubungi",
  resolved: "Selesai",
};
const activities = [
  ["meal", "Makan", ForkKnife],
  ["sleep", "Tidur", Moon],
  ["play", "Bermain", PuzzlePiece],
  ["hygiene", "Kebersihan", Drop],
  ["learning", "Belajar", BookOpen],
  ["note", "Catatan", NotePencil],
] as const;
const titles: Record<string, [string, string]> = {
  home: [
    "Business Pulse",
    "Keputusan hari ini, berangkat dari catatan yang nyata.",
  ],
  control: ["Control Tower", "Fokus pada hal yang membutuhkan perhatian Anda."],
  care: [
    "Catat Aktivitas",
    "Lebih sedikit administrasi, lebih banyak waktu bersama anak.",
  ],
  today: ["My Child Today", "Cerita kecil hari ini, terhubung dengan Anda."],
  pickup: [
    "Penjemputan Aman",
    "Izin wali, verifikasi petugas, dan serah terima tercatat.",
  ],
  story: [
    "Daily Story",
    "Tinjau catatan sebelum membagikannya kepada keluarga.",
  ],
  children: [
    "Anak & Care Passport",
    "Informasi penting untuk perawatan yang berkesinambungan.",
  ],
  reports: [
    "Rapor & Perkembangan",
    "Observasi nyata, ditinjau manusia, dibagikan dengan aman.",
  ],
  crm: ["CRM & WhatsApp", "Dari percakapan pertama hingga keluarga baru."],
  leo: ["LEO Copilot", "Temukan kembali fakta yang sudah tercatat."],
  messages: ["Pesan & Pengumuman", "Komunikasi keluarga dalam satu tempat."],
  closing: [
    "Daily Closing",
    "Catat tindak lanjut tanpa menutup masalah yang belum selesai.",
  ],
  settings: ["Pengaturan Daycare", "Kebijakan perawatan dan izin tim."],
};
function localDate() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date(),
  );
}
function time(value: string) {
  return value
    ? new Intl.DateTimeFormat("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Jakarta",
      }).format(new Date(value))
    : "—";
}
function Badge({ state }: { state: string }) {
  return (
    <span
      className={`op-badge ${["published", "approved", "acknowledged", "verified", "resolved"].includes(state) ? "good" : ""}`}
    >
      {status[state] || state}
    </span>
  );
}
function Card({
  title,
  sub,
  children,
  action,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="op-card">
      <div className="op-section-head">
        <div>
          <h2>{title}</h2>
          {sub && <p className="op-muted">{sub}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Empty({ children }: { children: ReactNode }) {
  return <p className="op-empty">{children}</p>;
}
function SmartForm({
  fields,
  onSubmit,
  button = "Simpan",
  busy,
  children,
}: {
  fields: FormField[];
  onSubmit: (data: Record<string, string>) => Promise<void> | void;
  button?: string;
  busy: boolean;
  children?: ReactNode;
}) {
  return (
    <form
      className="op-form"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const values = Object.fromEntries(new FormData(form)) as Record<
          string,
          string
        >;
        void Promise.resolve(onSubmit(values))
          .then(() => {
            if (form.isConnected) form.reset();
          })
          .catch(() => {});
      }}
    >
      <div className="op-form-grid">
        {fields.map((f) => (
          <label key={f.name}>
            {f.label}
            {f.type === "textarea" ? (
              <textarea
                aria-label={f.label}
                name={f.name}
                defaultValue={f.value}
                required={f.required !== false}
                maxLength={2000}
                rows={3}
              />
            ) : f.options ? (
              <select
                aria-label={f.label}
                name={f.name}
                defaultValue={f.value}
                required={f.required !== false}
              >
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                aria-label={f.label}
                name={f.name}
                type={f.type || "text"}
                defaultValue={f.value}
                required={f.required !== false}
                maxLength={f.type === "number" ? undefined : 2000}
              />
            )}
          </label>
        ))}
      </div>
      {children}
      <button className="op-btn primary" disabled={busy} type="submit">
        {busy ? "Menyimpan…" : button}
        <ArrowRight size={16} />
      </button>
    </form>
  );
}
export default function OperationsWorkspace({
  user,
  organizationId,
  memberships,
  request,
  onTools,
  onLogout,
  onOrganization,
}: Props) {
  const role = user.role,
    management = ["owner", "manager"].includes(role),
    isParent = role === "parent";
  const [view, setView] = useState(
      role === "owner"
        ? "home"
        : role === "manager"
          ? "control"
          : role === "caregiver"
            ? "care"
            : "today",
    ),
    [data, setData] = useState<Item | null>(null),
    [extraState, setExtra] = useState<Item>({}),
    [childId, setChild] = useState(""),
    [classId, setClass] = useState(""),
    [selected, setSelected] = useState<string[]>([]),
    [activity, setActivity] = useState("meal"),
    [result, setResult] = useState("Habis"),
    [note, setNote] = useState(""),
    [exceptions, setExceptions] = useState<Record<string, Item>>({}),
    [menu, setMenu] = useState(false),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [modal, setModal] = useState<{ title: string; body: ReactNode } | null>(
      null,
    ),
    [branch, setBranch] = useState(""),
    [date, setDate] = useState(localDate()),
    [answer, setAnswer] = useState<Item | null>(null);
  const retryKeys = useRef(new Map<string, string>()),
    version = useRef(0);
  const careSubmission = useRef<{ signature: string; payload: Item } | null>(
      null,
    ),
    mutationPending = useRef(false);
  const extraScope = JSON.stringify([view, childId, branch, date]);
  const extra = extraState._scope === extraScope ? extraState : {};
  const extraReady = extraState._scope === extraScope;
  const needsExtra = [
    "home",
    "control",
    "closing",
    "today",
    "children",
    "reports",
    "crm",
    "messages",
    "settings",
  ].includes(view);
  const children: Item[] = data?.children || [],
    records: Item[] = data?.records || [],
    classes: Item[] = data?.classrooms || [],
    current = children.find((c) => c.id === childId),
    present = children.filter((c) => c.classroom_id === classId && c.present),
    presentKey = present
      .map((c) => c.id)
      .sort()
      .join(",");
  const req: Request = async (path, method = "GET", body, key) => {
    const signature = JSON.stringify([organizationId, path, method, body]);
    if (method === "POST" && !key) {
      key = retryKeys.current.get(signature) || crypto.randomUUID();
      retryKeys.current.set(signature, key);
    }
    try {
      const response = await request(path, method, body, key);
      retryKeys.current.delete(signature);
      return response;
    } catch (e) {
      throw e;
    }
  };
  async function reload() {
    const n = ++version.current;
    setLoading(true);
    try {
      const context = await req("workspace/context");
      if (n !== version.current) return;
      setData(context);
      setChild((c) =>
        context.children.some((k: Item) => k.id === c)
          ? c
          : context.children[0]?.id || "",
      );
      setClass((c) =>
        context.classrooms.some((k: Item) => k.id === c)
          ? c
          : context.classrooms[0]?.id || "",
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      if (n === version.current) setLoading(false);
    }
  }
  useEffect(() => {
    setData(null);
    setExtra({});
    void reload();
  }, [organizationId]);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>(".op-modal");
    dialog
      ?.querySelector<HTMLElement>("button,input,select,textarea,a[href]")
      ?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !mutationPending.current) {
        setModal(null);
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const elements = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
        ),
      );
      const first = elements[0],
        last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      if (previous?.isConnected) previous.focus();
    };
  }, [modal]);
  useEffect(() => {
    setSelected(present.map((c) => c.id));
    setExceptions({});
  }, [classId, presentKey]);
  useEffect(() => {
    let cancelled = false;
    setExtra({});
    setAnswer(null);
    const fetchExtra = async () => {
      try {
        let value: Item = {};
        if (view === "home")
          value = await req(
            `owner/business-pulse?date=${date}${branch ? "&branchId=" + branch : ""}`,
          );
        if (view === "control" || view === "closing")
          value = await req(
            view === "closing" ? "manager/closing" : "manager/exceptions",
          );
        if (view === "today" && childId)
          value = await req("parent/today?childId=" + childId);
        if (view === "children" && childId)
          value = await req("passports/" + childId);
        if (view === "reports") {
          value = { reports: await req("development-reports") };
          if (!isParent) value.rubrics = await req("development-rubrics");
        }
        if (view === "crm") value = await req("crm/overview");
        if (view === "messages")
          value = {
            messages: await req(
              "messages" + (childId ? "?childId=" + childId : ""),
            ),
            announcements: await req("announcements"),
          };
        if (view === "settings" && role === "owner")
          value = { settings: await req("settings") };
        if (!cancelled) setExtra({ ...value, _scope: extraScope });
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      }
    };
    if (data) void fetchExtra();
    return () => {
      cancelled = true;
    };
  }, [view, childId, data, branch, date]);
  async function mutate(fn: () => Promise<any>, message = "Tersimpan.") {
    if (mutationPending.current)
      throw new Error("Proses sebelumnya masih berjalan.");
    mutationPending.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const value = await fn();
      setNotice(message);
      setModal(null);
      await reload();
      return value;
    } catch (e: any) {
      setError(
        navigator.onLine
          ? e.message
          : "Anda sedang offline. Isian tetap tersedia; sambungkan internet lalu coba lagi.",
      );
      throw e;
    } finally {
      mutationPending.current = false;
      setBusy(false);
    }
  }
  function go(next: string) {
    setView(next);
    setError("");
    setNotice("");
    setMenu(false);
    void reload();
  }
  function confirm(
    title: string,
    description: ReactNode,
    action: () => Promise<any>,
  ) {
    setModal({
      title,
      body: (
        <>
          <div>{description}</div>
          <button
            className="op-btn primary"
            disabled={busy}
            onClick={() =>
              void mutate(action, "Perubahan telah tercatat.").catch(() => {})
            }
          >
            <Check size={16} />
            Konfirmasi
          </button>
        </>
      ),
    });
  }
  const childOptions = children.map((c) => ({ value: c.id, label: c.name }));
  const nav: [string, string, any][] = isParent
    ? [
        ["today", "My Child Today", House],
        ["story", "Daily Story", BookOpen],
        ["pickup", "Penjemputan", ShieldCheck],
        ["reports", "Rapor Anak", ChartBar],
        ["children", "Care Passport", Baby],
        ["messages", "Pesan Daycare", ChatCircleText],
        ["leo", "Tanya LEO", Sparkle],
      ]
    : role === "caregiver"
      ? [
          ["care", "Catat Aktivitas", NotePencil],
          ["story", "Review Catatan", ClipboardText],
          ["children", "Anak & Care Passport", Baby],
          ["pickup", "Penjemputan", ShieldCheck],
          ["reports", "Observasi & Rapor", BookOpen],
          ["messages", "Pesan & Pengumuman", ChatCircleText],
          ["leo", "LEO Assistant", Sparkle],
        ]
      : [
          ...(role === "owner"
            ? [["home", "Business Pulse", SquaresFour] as [string, string, any]]
            : []),
          ["control", "Control Tower", SquaresFour],
          ["care", "Operasional Harian", NotePencil],
          ["pickup", "Penjemputan", ShieldCheck],
          ["children", "Anak & Keluarga", UsersThree],
          ["reports", "Rapor & Perkembangan", BookOpen],
          ...(user.capabilities?.crm
            ? [
                ["crm", "CRM & WhatsApp", ChatCircleText] as [
                  string,
                  string,
                  any,
                ],
              ]
            : []),
          ["messages", "Komunikasi Keluarga", ChatCircleText],
          ["closing", "Daily Closing", CheckCircle],
          ["leo", "LEO Copilot", Sparkle],
          ...(role === "owner"
            ? [["settings", "Pengaturan", GearSix] as [string, string, any]]
            : []),
        ];
  const selectedRecords = records.filter(
    (r) => !childId || r.child_id === childId,
  );
  const batchClass =
    view === "care" ? classId : view === "story" ? current?.classroom_id : null;
  const drafts = records.filter(
    (r) =>
      r.kind === "activity" &&
      r.state === "draft" &&
      (!batchClass ||
        children.find((c) => c.id === r.child_id)?.classroom_id === batchClass),
  );
  const batches = Object.values(
    drafts.reduce((all: Record<string, Item[]>, r: Item) => {
      (all[r.data.batchId || r.id] ??= []).push(r);
      return all;
    }, {}),
  ) as Item[][];
  const nameFor = (id: string) =>
    children.find((c) => c.id === id)?.name || "Anak";
  function selector() {
    return (
      <label className="op-inline-label">
        Anak aktif
        <select
          aria-label="Anak aktif"
          value={childId}
          onChange={(e) => setChild(e.target.value)}
        >
          {childOptions.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  function recordList(rows: Item[], empty = "Belum ada catatan.") {
    return rows.length ? (
      <div className="op-timeline">
        {rows.map((r) => (
          <article key={r.id}>
            <time>{time(r.data.occurredAt || r.created_at)}</time>
            <div>
              <div className="op-row">
                <strong>
                  {activities.find((a) => a[0] === r.data.type)?.[1] ||
                    kinds[r.kind] ||
                    r.data.title ||
                    "Catatan"}
                  {r.data.result ? " · " + r.data.result : ""}
                </strong>
                <Badge state={r.state} />
              </div>
              <p>{r.data.note || r.data.name || r.data.title}</p>
              <small>
                {r.actor_name || "Petugas daycare"} ·{" "}
                {new Date(r.created_at).toLocaleDateString("id-ID")}
              </small>
            </div>
          </article>
        ))}
      </div>
    ) : (
      <Empty>{empty}</Empty>
    );
  }
  function reviewBatches() {
    return batches.length ? (
      batches.map((group) => (
        <article
          className="op-list-item"
          key={group[0].data.batchId || group[0].id}
        >
          <div className="op-row between">
            <strong>
              {activities.find((a) => a[0] === group[0].data.type)?.[1]} ·{" "}
              {group.length} anak
            </strong>
            <Badge state="draft" />
          </div>
          <p>{group[0].data.note}</p>
          <small>{group.map((r) => nameFor(r.child_id)).join(", ")}</small>
          <div className="op-row op-space">
            <button
              className="op-btn"
              onClick={() =>
                setModal({
                  title: "Tinjau catatan kelompok",
                  body: (
                    <>
                      {group.map((r) => (
                        <div className="op-list-item" key={r.id}>
                          <strong>
                            {nameFor(r.child_id)} · {r.data.result || "Catatan"}
                          </strong>
                          <p>{r.data.note}</p>
                          {r.created_by === user.userId || management ? (
                            <SmartForm
                              busy={busy}
                              button="Simpan koreksi sebagai draf"
                              fields={[
                                {
                                  name: "note",
                                  label: "Catatan anak",
                                  type: "textarea",
                                  value: r.data.note,
                                },
                                {
                                  name: "result",
                                  label: "Hasil",
                                  value: r.data.result || "Tercatat",
                                },
                              ]}
                              onSubmit={(v) =>
                                mutate(() =>
                                  req(`activities/${r.id}`, "PATCH", {
                                    data: {
                                      type: r.data.type,
                                      note: v.note,
                                      result: v.result,
                                      occurredAt: r.data.occurredAt,
                                    },
                                  }),
                                )
                              }
                            />
                          ) : null}
                        </div>
                      ))}
                    </>
                  ),
                })
              }
            >
              Tinjau
            </button>
            {management ||
            (data?.policy.routinePublishing === "caregiver" &&
              !group.some((r) => r.data.reviewRequired)) ? (
              <button
                className="op-btn teal"
                disabled={busy}
                onClick={() =>
                  confirm(
                    `Terbitkan untuk ${group.length} anak?`,
                    <>
                      {group.map((r) => (
                        <p key={r.id}>
                          <strong>{nameFor(r.child_id)}</strong>:{" "}
                          {r.data.result} — {r.data.note}
                        </p>
                      ))}
                      <p>
                        Wali hanya menerima catatan anak yang terhubung
                        dengannya.
                      </p>
                    </>,
                    () =>
                      req(
                        group[0].data.batchId
                          ? `activities/batches/${group[0].data.batchId}/publish`
                          : `activities/${group[0].id}/publish`,
                        "POST",
                        group[0].data.batchId ? { confirmed: true } : {},
                      ),
                  )
                }
              >
                Terbitkan
                <ArrowRight size={14} />
              </button>
            ) : (
              <span className="op-muted">Menunggu review pengelola</span>
            )}
          </div>
        </article>
      ))
    ) : (
      <Empty>
        Semua catatan sudah ditinjau. Catatan baru akan muncul di sini.
      </Empty>
    );
  }
  function exceptionAction(item: Item) {
    if (["activity", "daily-story", "missing-story"].includes(item.kind))
      return (
        <button
          className="op-btn"
          onClick={() => {
            if (item.childId) setChild(item.childId);
            go("story");
          }}
        >
          Review catatan
          <ArrowRight size={14} />
        </button>
      );
    if (["pickup-authorization", "still-present"].includes(item.kind))
      return (
        <button
          className="op-btn"
          onClick={() => {
            if (item.childId) setChild(item.childId);
            go("pickup");
          }}
        >
          Periksa izin
        </button>
      );
    if (item.kind === "passport-change")
      return (
        <button
          className="op-btn"
          onClick={() => {
            setChild(item.childId);
            go("children");
          }}
        >
          Tinjau perubahan
        </button>
      );
    if (item.kind === "observation")
      return (
        <button
          className="op-btn"
          onClick={() => {
            setChild(item.childId);
            go("reports");
          }}
        >
          Tinjau observasi
        </button>
      );
    if (item.kind === "morning-note")
      return (
        <button
          className="op-btn teal"
          disabled={busy}
          onClick={() =>
            void mutate(
              () => req(`morning-notes/${item.id}/acknowledge`, "POST", {}),
              "Pesan pagi diterima.",
            ).catch(() => {})
          }
        >
          Sudah dibaca
          <Check size={14} />
        </button>
      );
    if (item.kind === "incident")
      return (
        <button
          className="op-btn"
          onClick={() =>
            setModal({
              title: "Tindak lanjut insiden",
              body: (
                <SmartForm
                  busy={busy}
                  fields={[
                    {
                      name: "note",
                      label: "Tindakan yang benar-benar dilakukan",
                      type: "textarea",
                    },
                    {
                      name: "action",
                      label: "Tindakan",
                      options: [
                        { value: "acknowledge", label: "Akui & tangani" },
                        {
                          value: "resolve",
                          label: "Selesaikan setelah ditangani",
                        },
                      ],
                    },
                  ]}
                  button="Catat tindakan"
                  onSubmit={(v) =>
                    mutate(() =>
                      req(`incidents/${item.id}/${v.action}`, "POST", {
                        note: v.note,
                      }),
                    )
                  }
                />
              ),
            })
          }
        >
          Tindak lanjuti
        </button>
      );
    return (
      <button className="op-btn" onClick={onTools}>
        Buka rincian
      </button>
    );
  }
  function queue(items: Item[] = []) {
    return items.length ? (
      items.map((item) => (
        <article className="op-exception" key={`${item.kind}-${item.id}`}>
          <span
            className={`op-symbol ${item.kind === "incident" ? "coral" : "teal"}`}
          >
            {item.kind === "incident" ? <WarningCircle /> : <ClipboardText />}
          </span>
          <div className="op-grow">
            <strong>{kinds[item.kind] || item.kind}</strong>
            <p>
              {nameFor(item.childId)} ·{" "}
              {item.data.note ||
                item.data.name ||
                item.data.result ||
                "Perlu ditinjau"}
            </p>
            <small>{item.createdAt ? time(item.createdAt) + " WIB" : ""}</small>
          </div>
          {exceptionAction(item)}
        </article>
      ))
    ) : (
      <Empty>Tidak ada pengecualian yang menunggu tindakan.</Empty>
    );
  }
  function care() {
    return (
      <>
        <div className="op-banner">
          <div>
            <span className="op-kicker">QUICK CARE</span>
            <h2>Catat sekali, untuk satu kelas.</h2>
            <p>
              Anak yang sedang hadir otomatis dipilih. Sesuaikan hasil setiap
              anak bila diperlukan.
            </p>
          </div>
          <NotePencil size={52} weight="duotone" />
        </div>
        <div className="op-columns">
          <div className="op-stack">
            <Card
              title="Kelas hari ini"
              sub={`${present.length} hadir · ${children.filter((c) => c.classroom_id === classId).length} anak dalam kelas`}
            >
              <div className="op-tabs">
                {classes.map((c) => (
                  <button
                    key={c.id}
                    className={classId === c.id ? "active" : ""}
                    onClick={() => setClass(c.id)}
                  >
                    {c.name}
                    <span>
                      {
                        children.filter(
                          (k) => k.classroom_id === c.id && k.present,
                        ).length
                      }
                    </span>
                  </button>
                ))}
              </div>
              {!classes.length && (
                <Empty>
                  Belum ada kelas yang ditugaskan. Hubungi pengelola.
                </Empty>
              )}
              <div className="op-activity-types">
                {activities.map(([value, label, Icon]) => (
                  <button
                    key={value}
                    className={activity === value ? "active" : ""}
                    onClick={() => {
                      setActivity(value);
                      setResult(
                        value === "meal"
                          ? "Habis"
                          : value === "sleep"
                            ? "Selesai"
                            : "Tercatat",
                      );
                    }}
                  >
                    <Icon size={24} />
                    {label}
                  </button>
                ))}
              </div>
              <div className="op-section-head">
                <h3>Pilih anak yang hadir</h3>
                <button
                  className="op-link"
                  onClick={() =>
                    setSelected(
                      selected.length === present.length
                        ? []
                        : present.map((c) => c.id),
                    )
                  }
                >
                  {selected.length === present.length
                    ? "Batal pilih semua"
                    : "Pilih semua"}
                </button>
              </div>
              <div className="op-children-grid">
                {present.map((c) => (
                  <button
                    key={c.id}
                    className={`op-child ${selected.includes(c.id) ? "selected" : ""}`}
                    aria-pressed={selected.includes(c.id)}
                    onClick={() =>
                      setSelected((ids) =>
                        ids.includes(c.id)
                          ? ids.filter((i) => i !== c.id)
                          : [...ids, c.id],
                      )
                    }
                  >
                    <span className="op-avatar">
                      {c.name.substring(0, 2).toUpperCase()}
                    </span>
                    <strong>{c.name}</strong>
                    <small>Hadir · {time(c.attendance.created_at)}</small>
                    <span className="op-check">
                      <Check size={12} />
                    </span>
                  </button>
                ))}
              </div>
              {!present.length && (
                <Empty>
                  Belum ada anak hadir di kelas ini. Catat kedatangan terlebih
                  dahulu.
                </Empty>
              )}
              <form
                className="op-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void mutate(async () => {
                    const payload = {
                      childIds: selected,
                      classroomId: classId,
                      data: {
                        type: activity,
                        result,
                        note,
                      },
                      exceptions: Object.fromEntries(
                        Object.entries(exceptions)
                          .filter(
                            ([id, v]) =>
                              selected.includes(id) && (v.note || v.result),
                          )
                          .map(([id, v]) => [
                            id,
                            Object.fromEntries(
                              Object.entries(v).filter(([, value]) =>
                                String(value).trim(),
                              ),
                            ),
                          ]),
                      ),
                    };
                    const signature = JSON.stringify(payload);
                    if (careSubmission.current?.signature !== signature)
                      careSubmission.current = {
                        signature,
                        payload: {
                          ...payload,
                          data: {
                            ...payload.data,
                            occurredAt: new Date().toISOString(),
                          },
                        },
                      };
                    await req(
                      "activities/batch",
                      "POST",
                      careSubmission.current.payload,
                    );
                    careSubmission.current = null;
                    setNote("");
                    setExceptions({});
                  }, `Draf tersimpan untuk ${selected.length} anak.`).catch(
                    () => {},
                  );
                }}
              >
                <label>
                  Hasil kelompok
                  <select
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                  >
                    {(activity === "meal"
                      ? ["Habis", "Sebagian", "Belum mau makan"]
                      : activity === "sleep"
                        ? ["Selesai", "Sedang tidur", "Belum tidur"]
                        : ["Tercatat", "Selesai", "Perlu perhatian"]
                    ).map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Catatan bersama
                  <textarea
                    required
                    maxLength={2000}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Tuliskan yang benar-benar diamati…"
                    rows={3}
                  />
                </label>
                <details>
                  <summary>Hasil berbeda untuk anak tertentu</summary>
                  {selected.map((id) => (
                    <div className="op-exception-form" key={id}>
                      <strong>{nameFor(id)}</strong>
                      <label>
                        Hasil khusus
                        <input
                          value={exceptions[id]?.result || ""}
                          onChange={(e) =>
                            setExceptions((old) => ({
                              ...old,
                              [id]: { ...old[id], result: e.target.value },
                            }))
                          }
                        />
                      </label>
                      <label>
                        Catatan khusus
                        <textarea
                          value={exceptions[id]?.note || ""}
                          onChange={(e) =>
                            setExceptions((old) => ({
                              ...old,
                              [id]: { ...old[id], note: e.target.value },
                            }))
                          }
                          maxLength={2000}
                        />
                      </label>
                    </div>
                  ))}
                </details>
                <button
                  type="submit"
                  className="op-btn primary wide"
                  disabled={busy || !selected.length}
                >
                  Simpan draf untuk {selected.length} anak
                  <ArrowRight size={16} />
                </button>
              </form>
            </Card>
            <Card
              title="Kedatangan anak"
              sub="Hanya kedatangan yang Anda saksikan secara langsung."
            >
              <div className="op-attendance">
                {children
                  .filter((c) => c.classroom_id === classId && !c.present)
                  .map((c) => (
                    <div className="op-row between" key={c.id}>
                      <strong>{c.name}</strong>
                      <button
                        className="op-btn"
                        disabled={busy}
                        onClick={() =>
                          confirm(
                            "Catat kedatangan?",
                            <p>
                              Pastikan {c.name} sudah tiba dan diterima petugas.
                            </p>,
                            () =>
                              req("attendance", "POST", {
                                childId: c.id,
                                data: { type: "in" },
                              }),
                          )
                        }
                      >
                        Catat hadir
                        <Plus size={14} />
                      </button>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
          <div className="op-stack">
            <Card title="Draf & review" sub="Belum terlihat oleh wali.">
              {reviewBatches()}
            </Card>
            <Card
              title="Pesan pagi dari rumah"
              sub="Baca sebelum memulai aktivitas."
            >
              {records
                .filter(
                  (r) =>
                    r.kind === "morning-note" &&
                    r.state === "submitted" &&
                    children.find((c) => c.id === r.child_id)?.classroom_id ===
                      classId,
                )
                .map((r) => (
                  <article className="op-list-item" key={r.id}>
                    <strong>{nameFor(r.child_id)}</strong>
                    <p>{r.data.note}</p>
                    <button
                      className="op-btn teal"
                      disabled={busy}
                      onClick={() =>
                        void mutate(
                          () =>
                            req(
                              `morning-notes/${r.id}/acknowledge`,
                              "POST",
                              {},
                            ),
                          "Pesan pagi sudah diterima.",
                        ).catch(() => {})
                      }
                    >
                      Sudah dibaca
                      <Check size={14} />
                    </button>
                  </article>
                ))}
              {!records.some(
                (r) => r.kind === "morning-note" && r.state === "submitted",
              ) && <Empty>Belum ada pesan pagi yang menunggu dibaca.</Empty>}
            </Card>
            <div className="op-hint">
              <ShieldCheck size={22} />
              <p>
                Catatan tersimpan per anak. Keluarga hanya dapat melihat
                pembaruan yang telah diterbitkan.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }
  function today() {
    const c = extra.child || current;
    return (
      <>
        <div className="op-parent-hero">
          <div>
            <span className="op-kicker">CERITA HARI INI</span>
            <h2>Hari {c?.name || "si kecil"} bersama Daylio</h2>
            <p>
              {extra.attendance?.data.type === "in"
                ? "Sudah tiba di daycare. Pembaruan berikut berasal dari catatan pengasuh."
                : extra.attendance?.data.type === "out"
                  ? "Sudah pulang. Lihat cerita dan catatan hari ini."
                  : "Kedatangan hari ini belum tercatat."}
            </p>
            <button
              className="op-btn primary"
              onClick={() =>
                setModal({
                  title: "Pesan pagi dari rumah",
                  body: (
                    <SmartForm
                      busy={busy}
                      fields={[
                        {
                          name: "note",
                          label: "Hal yang perlu diketahui pengasuh",
                          type: "textarea",
                        },
                      ]}
                      button="Kirim pesan pagi"
                      onSubmit={(v) =>
                        mutate(
                          () =>
                            req("morning-notes", "POST", {
                              childId,
                              note: v.note,
                            }),
                          "Pesan pagi dikirim ke daycare.",
                        )
                      }
                    />
                  ),
                })
              }
            >
              <Sun size={16} />
              Pesan pagi
            </button>
          </div>
          <span className="op-child-monogram">
            {c?.name?.substring(0, 2).toUpperCase() || <Baby />}
          </span>
        </div>
        <div className="op-metrics three">
          {[
            [
              House,
              "Kehadiran",
              extra.attendance
                ? extra.attendance.data.type === "in"
                  ? "Di daycare"
                  : "Sudah pulang"
                : "Belum tercatat",
              extra.attendance
                ? time(extra.attendance.created_at) + " WIB"
                : "Menunggu catatan daycare",
            ],
            [
              ForkKnife,
              "Makan terakhir",
              extra.meal?.data.result || "Belum tercatat",
              extra.meal?.data.note ||
                "Informasi makan akan muncul setelah diterbitkan.",
            ],
            [
              Moon,
              "Tidur terakhir",
              extra.sleep?.data.result || "Belum tercatat",
              extra.sleep?.data.note || "Informasi tidur belum tersedia.",
            ],
          ].map(([Icon, label, value, detail]: any) => (
            <div className="op-metric" key={label}>
              <span className="op-symbol teal">
                <Icon />
              </span>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{detail}</small>
            </div>
          ))}
        </div>
        <div className="op-columns">
          <Card
            title="Daily Story"
            sub="Cerita yang sudah ditinjau oleh daycare."
          >
            {extra.story ? (
              <>
                <Badge state={extra.story.state} />
                <p className="op-story-text">{extra.story.data.note}</p>
                <small>
                  {extra.story.data.sourceIds.length} sumber catatan ·{" "}
                  {time(extra.story.data.publishedAt)} WIB
                </small>
              </>
            ) : (
              <Empty>
                Daily Story hari ini belum diterbitkan. Catatan yang tersedia
                tetap bisa dilihat di bawah.
              </Empty>
            )}
            <PrivatePhotos
              key={childId}
              rows={extra.photos || []}
              request={req}
            />
            {recordList(
              extra.activities || [],
              "Belum ada aktivitas yang diterbitkan hari ini.",
            )}
          </Card>
          <div className="op-stack">
            <Card title="Pesan pagi Anda">
              {extra.morning?.length ? (
                extra.morning.map((r: Item) => (
                  <article className="op-list-item" key={r.id}>
                    <p>{r.data.note}</p>
                    <Badge state={r.state} />
                    {r.data.acknowledgedAt && (
                      <small>
                        {" "}
                        · Diterima {time(r.data.acknowledgedAt)} WIB
                      </small>
                    )}
                  </article>
                ))
              ) : (
                <Empty>
                  Bagikan kondisi tidur, makan, atau kebutuhan anak dari rumah.
                </Empty>
              )}
            </Card>
            <Card title="Penjemputan hari ini">
              <p>
                Kelola penjemput rutin atau berikan izin pengganti yang memiliki
                batas waktu.
              </p>
              <button className="op-btn" onClick={() => go("pickup")}>
                Kelola penjemput
                <ArrowRight size={14} />
              </button>
            </Card>
            <Card title="Tumbuh bersama">
              <p>
                {extra.reports?.length
                  ? `${extra.reports.length} rapor sudah dibagikan daycare.`
                  : "Rapor akan tersedia setelah observasi guru ditinjau."}
              </p>
              <button className="op-link" onClick={() => go("reports")}>
                Lihat perkembangan
                <CaretRight size={14} />
              </button>
            </Card>
          </div>
        </div>
      </>
    );
  }
  function stories() {
    const rows = selectedRecords.filter((r) => r.kind === "daily-story");
    const sources = selectedRecords.filter(
      (r) =>
        r.kind === "activity" &&
        r.state === "published" &&
        r.data.occurredAt &&
        new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
          new Date(r.data.occurredAt),
        ) === localDate(),
    );
    return (
      <div className="op-columns">
        <div className="op-stack">
          {!isParent && (
            <Card title="Draf kegiatan kelompok">{reviewBatches()}</Card>
          )}
          <Card title="Cerita harian">
            {rows.length ? (
              rows.map((r) => (
                <article className="op-list-item" key={r.id}>
                  <div className="op-row between">
                    <strong>{r.data.date}</strong>
                    <Badge state={r.state} />
                  </div>
                  <p>{r.data.note}</p>
                  <small>{r.data.sourceIds.length} catatan sumber</small>
                  {r.state === "draft" &&
                    !isParent &&
                    (management ||
                      data?.policy.routinePublishing === "caregiver") && (
                      <button
                        className="op-btn teal"
                        disabled={busy}
                        onClick={() =>
                          confirm(
                            "Terbitkan Daily Story?",
                            <p>{r.data.note}</p>,
                            () =>
                              req(`daily-stories/${r.id}/publish`, "POST", {
                                confirmed: true,
                              }),
                          )
                        }
                      >
                        Terbitkan cerita
                      </button>
                    )}
                </article>
              ))
            ) : (
              <Empty>Belum ada Daily Story untuk anak ini.</Empty>
            )}
          </Card>
        </div>
        <Card
          title={isParent ? "Catatan terbit" : "Susun Daily Story"}
          sub="Gunakan catatan nyata yang telah diterbitkan."
        >
          {!isParent && sources.length ? (
            <SmartForm
              busy={busy}
              fields={[
                {
                  name: "note",
                  label: "Cerita yang ditinjau manusia",
                  type: "textarea",
                },
              ]}
              button="Simpan draf cerita"
              onSubmit={(v) =>
                mutate(() =>
                  req("daily-stories", "POST", {
                    childId,
                    date: localDate(),
                    note: v.note,
                    sourceIds: sources.map((r) => r.id),
                  }),
                )
              }
            >
              <p className="op-hint-text">
                {sources.length} aktivitas hari ini menjadi sumber cerita.
              </p>
            </SmartForm>
          ) : !isParent ? (
            <Empty>Terbitkan catatan aktivitas terlebih dahulu.</Empty>
          ) : null}
          {recordList(
            selectedRecords.filter(
              (r) => r.kind === "activity" && r.state === "published",
            ),
          )}
        </Card>
      </div>
    );
  }
  function pickup() {
    const auths = selectedRecords.filter(
        (r) => r.kind === "pickup-authorization",
      ),
      evidence = selectedRecords.filter((r) => r.kind === "pickup");
    return (
      <>
        <div className="op-metrics three">
          {[
            [
              ShieldCheck,
              "Penjemput rutin",
              "Izin wali yang berlaku",
              "Petugas tetap memverifikasi orang yang menjemput.",
            ],
            [
              UsersThree,
              "Penjemput pengganti",
              "Izin terbatas waktu",
              "Mengikuti review pengelola dan pemeriksaan identitas.",
            ],
            [
              ClipboardText,
              "Bukti serah terima",
              `${evidence.length} tercatat`,
              "Waktu, petugas, izin, dan metode verifikasi.",
            ],
          ].map(([Icon, title, value, description]: any) => (
            <div className="op-metric" key={title}>
              <span className="op-symbol teal">
                <Icon />
              </span>
              <h3>{title}</h3>
              <strong>{value}</strong>
              <small>{description}</small>
            </div>
          ))}
        </div>
        <div className="op-columns">
          <Card
            title="Daftar izin penjemputan"
            sub={current?.name || "Pilih anak"}
          >
            {auths.length ? (
              auths.map((r) => (
                <article className="op-list-item" key={r.id}>
                  <div className="op-row between">
                    <strong>{r.data.name}</strong>
                    <Badge state={r.state} />
                  </div>
                  <p>
                    {r.data.relationship} ·{" "}
                    {r.data.kind === "routine"
                      ? "Penjemput rutin"
                      : "Pengganti"}
                  </p>
                  <small>
                    Berlaku sampai{" "}
                    {new Date(r.data.expiresAt).toLocaleString("id-ID")}
                  </small>
                  <div className="op-row op-space wrap">
                    {r.state === "requested" && management && (
                      <button
                        className="op-btn teal"
                        disabled={busy}
                        onClick={() =>
                          confirm(
                            "Setujui izin pengganti?",
                            <p>
                              Periksa identitas {r.data.name}, hubungan, dan
                              masa berlaku izin dari wali.
                            </p>,
                            () =>
                              req(
                                `pickup-authorizations/${r.id}/approve`,
                                "POST",
                                {},
                              ),
                          )
                        }
                      >
                        Setujui izin
                      </button>
                    )}
                    {r.state === "approved" && !isParent && (
                      <button
                        className="op-btn primary"
                        onClick={() =>
                          setModal({
                            title: "Verifikasi & serah terima",
                            body: (
                              <SmartForm
                                busy={busy}
                                fields={[
                                  {
                                    name: "verifiedPersonName",
                                    label:
                                      "Nama orang yang hadir (sesuai izin)",
                                  },
                                  {
                                    name: "verificationMethod",
                                    label: "Metode pemeriksaan",
                                    options:
                                      r.data.kind === "routine"
                                        ? [
                                            {
                                              value: "physical-id",
                                              label:
                                                "Identitas fisik diperiksa",
                                            },
                                            {
                                              value: "known-authorized-person",
                                              label:
                                                "Penjemput rutin dikenal petugas",
                                            },
                                          ]
                                        : [
                                            {
                                              value: "physical-id",
                                              label:
                                                "Identitas fisik diperiksa",
                                            },
                                          ],
                                  },
                                  {
                                    name: "identityNote",
                                    label:
                                      "Catatan pemeriksaan (minimal 8 karakter)",
                                    type: "textarea",
                                  },
                                ]}
                                button="Catat anak diserahkan & pulang"
                                onSubmit={(v) =>
                                  mutate(
                                    () =>
                                      req(
                                        `pickups/${r.id}/verify-handover`,
                                        "POST",
                                        { ...v, handoverConfirmed: true },
                                      ),
                                    "Serah terima dan kepulangan anak tercatat.",
                                  )
                                }
                              >
                                <label className="op-checkbox">
                                  <input type="checkbox" required />
                                  Saya memeriksa orang yang hadir dan
                                  benar-benar menyerahkan anak kepadanya.
                                </label>
                                <p className="op-hint-text">
                                  Tidak perlu menyimpan nomor identitas lengkap
                                  atau foto kartu identitas.
                                </p>
                              </SmartForm>
                            ),
                          })
                        }
                      >
                        Verifikasi & serahkan
                      </button>
                    )}
                    {["approved", "requested"].includes(r.state) &&
                      (management || r.created_by === user.userId) && (
                        <button
                          className="op-btn"
                          disabled={busy}
                          onClick={() =>
                            confirm(
                              "Cabut izin penjemputan?",
                              <p>
                                Izin {r.data.name} tidak dapat digunakan lagi.
                              </p>,
                              () =>
                                req(
                                  `pickup-authorizations/${r.id}/revoke`,
                                  "POST",
                                  {},
                                ),
                            )
                          }
                        >
                          Cabut izin
                        </button>
                      )}
                  </div>
                </article>
              ))
            ) : (
              <Empty>Belum ada izin penjemputan.</Empty>
            )}
          </Card>
          <div className="op-stack">
            {isParent && (
              <Card
                title="Berikan izin penjemput"
                sub="Hanya wali anak yang dapat memberi izin."
              >
                <SmartForm
                  busy={busy}
                  button="Konfirmasi izin wali"
                  fields={[
                    {
                      name: "kind",
                      label: "Jenis izin",
                      options: [
                        { value: "routine", label: "Penjemput rutin" },
                        { value: "substitute", label: "Penjemput pengganti" },
                      ],
                    },
                    { name: "name", label: "Nama lengkap penjemput" },
                    { name: "relationship", label: "Hubungan dengan anak" },
                    {
                      name: "expiresAt",
                      label: "Berlaku hingga",
                      type: "datetime-local",
                    },
                  ]}
                  onSubmit={(v) =>
                    mutate(() =>
                      req("pickup-authorizations", "POST", {
                        childId,
                        data: {
                          ...v,
                          expiresAt: new Date(v.expiresAt).toISOString(),
                        },
                      }),
                    )
                  }
                >
                  <label className="op-checkbox">
                    <input required type="checkbox" />
                    Saya sebagai wali memberi izin kepada orang tersebut.
                  </label>
                </SmartForm>
              </Card>
            )}
            <Card
              title="Audit serah terima"
              sub="Bukti tindakan petugas, tanpa rekaman CCTV."
            >
              {evidence.length ? (
                evidence.map((r) => (
                  <article key={r.id} className="op-list-item">
                    <strong>{r.data.name}</strong>
                    <p>
                      {time(r.data.handedOverAt)} WIB ·{" "}
                      {r.data.verificationMethod === "physical-id"
                        ? "Identitas fisik diperiksa"
                        : "Penjemput rutin dikenal"}
                    </p>
                    <p>{r.data.identityNote}</p>
                    <small>
                      Dicatat {r.actor_name || "petugas daycare"} ·{" "}
                      {new Date(r.created_at).toLocaleDateString("id-ID")}
                    </small>
                    <Badge state={r.state} />
                  </article>
                ))
              ) : (
                <Empty>Belum ada serah terima tercatat untuk anak ini.</Empty>
              )}
            </Card>
          </div>
        </div>
      </>
    );
  }
  function passports() {
    const passport = extra.current,
      changes = extra.changes || [];
    return (
      <div className="op-columns">
        <Card
          title={`Care Passport · ${current?.name || "Anak"}`}
          sub="Informasi yang sudah dikonfirmasi pengelola."
        >
          <p className="op-muted">
            Tanggal lahir:{" "}
            {current?.birth_date
              ? String(current.birth_date).slice(0, 10)
              : "Belum dilengkapi"}
          </p>
          {management && current && (
            <details>
              <summary>Perbarui tanggal lahir</summary>
              <SmartForm
                busy={busy}
                fields={[
                  {
                    name: "birthDate",
                    label: "Tanggal lahir anak",
                    type: "date",
                    value: current.birth_date
                      ? String(current.birth_date).slice(0, 10)
                      : undefined,
                  },
                ]}
                onSubmit={(v) =>
                  mutate(() =>
                    req(`children/${current.id}`, "PATCH", {
                      name: current.name,
                      birthDate: v.birthDate,
                    }),
                  )
                }
              />
            </details>
          )}
          {passport ? (
            <>
              <Badge state="approved" />
              <dl className="op-facts">
                {[
                  ["Alergi", passport.data.allergies],
                  ["Instruksi perawatan", passport.data.careInstructions],
                  [
                    "Kontak darurat",
                    `${passport.data.emergencyName} · ${passport.data.emergencyPhone}`,
                  ],
                  ["Versi", passport.data.version],
                  [
                    "Kontak keluarga",
                    passport.data.authorizedContacts
                      ?.map(
                        (c: Item) => `${c.name} (${c.relationship}) ${c.phone}`,
                      )
                      .join("; ") || "Belum dilengkapi",
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              {passport.data.onboardingIncomplete && (
                <p className="op-alert">
                  Profil awal pendaftaran. Informasi kesehatan masih perlu
                  dikonfirmasi wali.
                </p>
              )}
            </>
          ) : (
            <Empty>Wali belum mengajukan Care Passport yang disetujui.</Empty>
          )}
        </Card>
        <div className="op-stack">
          {isParent && (
            <Card title="Ajukan perubahan informasi">
              <SmartForm
                busy={busy}
                button="Ajukan untuk dikonfirmasi"
                fields={[
                  {
                    name: "allergies",
                    label: "Alergi yang diketahui",
                    value: passport?.data.allergies,
                  },
                  {
                    name: "careInstructions",
                    label: "Instruksi perawatan",
                    type: "textarea",
                    value: passport?.data.careInstructions,
                  },
                  {
                    name: "emergencyName",
                    label: "Nama kontak darurat",
                    value: passport?.data.emergencyName,
                  },
                  {
                    name: "emergencyPhone",
                    label: "Telepon darurat",
                    type: "tel",
                    value: passport?.data.emergencyPhone,
                  },
                ]}
                onSubmit={(v) =>
                  mutate(() =>
                    req("passport-changes", "POST", {
                      childId,
                      data: {
                        ...v,
                        authorizedContacts:
                          passport?.data.authorizedContacts || [],
                      },
                    }),
                  )
                }
              />
            </Card>
          )}
          <Card title="Riwayat perubahan">
            {changes.length ? (
              changes.map((r: Item) => (
                <article className="op-list-item" key={r.id}>
                  <Badge state={r.state} />
                  <p>
                    {r.data.allergies} · {r.data.careInstructions}
                  </p>
                  <p>
                    Darurat: {r.data.emergencyName} · {r.data.emergencyPhone}
                  </p>
                  {r.state === "submitted" && management && (
                    <SmartForm
                      busy={busy}
                      fields={[
                        {
                          name: "note",
                          label: "Catatan konfirmasi",
                          type: "textarea",
                        },
                        {
                          name: "action",
                          label: "Keputusan",
                          options: [
                            {
                              value: "approve",
                              label: "Setujui & perbarui passport",
                            },
                            {
                              value: "reject",
                              label: "Kembalikan untuk perbaikan",
                            },
                          ],
                        },
                      ]}
                      button="Catat keputusan"
                      onSubmit={(v) =>
                        mutate(() =>
                          req(`passport-changes/${r.id}/${v.action}`, "POST", {
                            note: v.note,
                            confirmed: true,
                          }),
                        )
                      }
                    />
                  )}
                </article>
              ))
            ) : (
              <Empty>Belum ada pengajuan perubahan.</Empty>
            )}
          </Card>
        </div>
      </div>
    );
  }
  async function download(path: string) {
    try {
      const pdf = await req(path);
      const bytes = Uint8Array.from(atob(pdf.content), (c: string) =>
        c.charCodeAt(0),
      );
      const url = URL.createObjectURL(
        new Blob([bytes], { type: "application/pdf" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = pdf.filename || "rapor.pdf";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e: any) {
      setError(e.message);
    }
  }
  function reports() {
    const observations = selectedRecords.filter(
        (r) => r.kind === "observation",
      ),
      approved = observations.filter((r) => r.state === "approved"),
      reports = (extra.reports || []).filter(
        (r: Item) => r.child_id === childId,
      ),
      rubrics = extra.rubrics || [];
    return (
      <div className="op-columns">
        <div className="op-stack">
          <Card
            title="Rapor perkembangan"
            sub="Berbasis observasi guru; bukan diagnosis."
          >
            {reports.length ? (
              reports.map((r: Item) => (
                <article className="op-list-item" key={r.id}>
                  <div className="op-row between">
                    <h3>{r.data.title}</h3>
                    <Badge state={r.state} />
                  </div>
                  <small>
                    {r.data.from} – {r.data.to}
                  </small>
                  <p>{r.data.note}</p>
                  <details>
                    <summary>{r.data.sources.length} sumber observasi</summary>
                    {r.data.sources.map((s: Item) => (
                      <p key={s.id}>
                        {s.observedOn} · {s.domain}: {s.note}
                      </p>
                    ))}
                  </details>
                  <div className="op-row op-space">
                    {r.state === "draft" && management && (
                      <button
                        className="op-btn teal"
                        disabled={busy}
                        onClick={() =>
                          confirm(
                            "Sahkan & terbitkan rapor?",
                            <p>
                              Pastikan narasi sesuai sumber dan sudah diperiksa
                              manusia.
                            </p>,
                            () =>
                              req(
                                `development-reports/${r.id}/publish`,
                                "POST",
                                { confirmed: true },
                              ),
                          )
                        }
                      >
                        Sahkan & terbitkan
                      </button>
                    )}
                    <button
                      className="op-btn"
                      onClick={() =>
                        void download(`development-reports/${r.id}/pdf`)
                      }
                    >
                      <DownloadSimple size={16} />
                      Unduh PDF
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <Empty>Rapor belum tersedia untuk anak ini.</Empty>
            )}
          </Card>
          {!isParent && (
            <Card
              title="Observasi guru"
              sub="Pisahkan pengamatan perkembangan dari catatan makan dan tidur."
            >
              {observations.map((r) => (
                <article className="op-list-item" key={r.id}>
                  <div className="op-row between">
                    <strong>
                      {r.data.domain} · {r.data.observedOn}
                    </strong>
                    <Badge state={r.state} />
                  </div>
                  <p>{r.data.note}</p>
                  {r.state === "draft" &&
                    (management || r.created_by === user.userId) && (
                      <button
                        className="op-btn"
                        disabled={busy}
                        onClick={() =>
                          void mutate(() =>
                            req(`observations/${r.id}/submit`, "POST", {}),
                          ).catch(() => {})
                        }
                      >
                        Ajukan review
                      </button>
                    )}
                  {r.state === "submitted" && management && (
                    <SmartForm
                      busy={busy}
                      fields={[
                        {
                          name: "note",
                          label: "Catatan reviewer",
                          type: "textarea",
                        },
                        {
                          name: "decision",
                          label: "Keputusan",
                          options: [
                            {
                              value: "approve",
                              label: "Setujui sumber observasi",
                            },
                            { value: "reject", label: "Kembalikan" },
                          ],
                        },
                      ]}
                      button="Catat review"
                      onSubmit={(v) =>
                        mutate(() =>
                          req(`observations/${r.id}/${v.decision}`, "POST", {
                            note: v.note,
                            confirmed: true,
                          }),
                        )
                      }
                    />
                  )}
                </article>
              ))}
              {!observations.length && <Empty>Belum ada observasi guru.</Empty>}
            </Card>
          )}
        </div>
        {!isParent && (
          <div className="op-stack">
            <Card title="Tambah observasi">
              {rubrics.length ? (
                <SmartForm
                  busy={busy}
                  fields={[
                    {
                      name: "rubricId",
                      label: "Rubrik & versi",
                      options: rubrics.map((r: Item) => ({
                        value: r.id,
                        label: r.data.name + " · " + r.data.version,
                      })),
                    },
                    { name: "domain", label: "Domain sesuai rubrik" },
                    {
                      name: "observedOn",
                      label: "Tanggal observasi",
                      type: "date",
                      value: localDate(),
                    },
                    {
                      name: "note",
                      label: "Perilaku yang benar-benar diamati",
                      type: "textarea",
                    },
                  ]}
                  button="Simpan draf observasi"
                  onSubmit={(v) =>
                    mutate(() => req("observations", "POST", { childId, ...v }))
                  }
                />
              ) : (
                <Empty>
                  Pengelola perlu menetapkan rubrik terlebih dahulu.
                </Empty>
              )}
            </Card>
            {management && (
              <Card title="Susun rapor">
                {approved.length ? (
                  <SmartForm
                    busy={busy}
                    fields={[
                      { name: "title", label: "Judul rapor" },
                      {
                        name: "from",
                        label: "Dari tanggal",
                        type: "date",
                        value: localDate(),
                      },
                      {
                        name: "to",
                        label: "Sampai tanggal",
                        type: "date",
                        value: localDate(),
                      },
                      {
                        name: "note",
                        label: "Narasi yang ditinjau manusia",
                        type: "textarea",
                      },
                    ]}
                    button="Simpan draf rapor"
                    onSubmit={(v) =>
                      mutate(() =>
                        req("development-reports", "POST", {
                          childId,
                          ...v,
                          sourceIds: approved
                            .filter(
                              (r) =>
                                r.data.observedOn >= v.from &&
                                r.data.observedOn <= v.to,
                            )
                            .map((r) => r.id),
                        }),
                      )
                    }
                  />
                ) : (
                  <Empty>Setujui observasi guru sebelum menyusun rapor.</Empty>
                )}
              </Card>
            )}
            {management && (
              <Card title="Rubrik usia & kurikulum">
                <SmartForm
                  busy={busy}
                  fields={[
                    { name: "name", label: "Nama rubrik" },
                    { name: "version", label: "Versi" },
                    {
                      name: "ageMinMonths",
                      label: "Usia minimum (bulan)",
                      type: "number",
                    },
                    {
                      name: "ageMaxMonths",
                      label: "Usia maksimum (bulan)",
                      type: "number",
                    },
                    { name: "domains", label: "Domain, pisahkan dengan koma" },
                  ]}
                  button="Tetapkan rubrik"
                  onSubmit={(v) =>
                    mutate(() =>
                      req("development-rubrics", "POST", {
                        ...v,
                        ageMinMonths: Number(v.ageMinMonths),
                        ageMaxMonths: Number(v.ageMaxMonths),
                        domains: v.domains
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      }),
                    )
                  }
                />
              </Card>
            )}
          </div>
        )}
      </div>
    );
  }
  function business() {
    return (
      <>
        <div className="op-banner">
          <div>
            <span className="op-kicker">BUSINESS PULSE</span>
            <h2>Yang penting untuk daycare Anda hari ini.</h2>
            <p>
              {extra.exceptions?.length
                ? `${extra.exceptions.length} hal memerlukan perhatian tim. Mulai dari antrean operasional.`
                : "Pantau kapasitas, pembaruan keluarga, dan tindak lanjut dari catatan tim."}
            </p>
            <button className="op-btn primary" onClick={() => go("control")}>
              Lihat prioritas hari ini
              <ArrowRight size={16} />
            </button>
          </div>
          <ChartBar size={64} weight="duotone" />
        </div>
        <div className="op-row wrap op-filters">
          <label>
            Tanggal
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label>
            Cabang
            <select value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="">Semua cabang</option>
              {Array.from(new Set(classes.map((c) => c.branch_id))).map(
                (id) => (
                  <option key={id} value={id}>
                    {classes.find((c) => c.branch_id === id)?.branch_name ||
                      "Cabang " +
                        (Array.from(
                          new Set(classes.map((c) => c.branch_id)),
                        ).indexOf(id) +
                          1)}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
        <div className="op-metrics">
          {[
            ["Anak aktif", extra.children, UsersThree, "Terdaftar di kelas"],
            ["Hadir sekarang", extra.present, House, "Berdasarkan kehadiran"],
            [
              "Prospek aktif",
              extra.leads,
              ChatCircleText,
              "Belum terdaftar / ditutup",
            ],
            [
              "Daily Story",
              extra.storyCoverage
                ? `${extra.storyCoverage.completed}/${extra.storyCoverage.total}`
                : "—",
              BookOpen,
              "Cakupan anak hadir",
            ],
          ].map(([label, value, Icon, detail]: any) => (
            <div className="op-metric" key={label}>
              <span className="op-symbol teal">
                <Icon />
              </span>
              <span>{label}</span>
              <strong>{value ?? "—"}</strong>
              <small>{detail}</small>
            </div>
          ))}
        </div>
        <div className="op-columns">
          <Card
            title="Prioritas operasional"
            sub="Tindak lanjut yang masih terbuka."
            action={
              <button className="op-link" onClick={() => go("control")}>
                Lihat semua
                <CaretRight size={14} />
              </button>
            }
          >
            {queue(extra.exceptions?.slice(0, 5))}
          </Card>
          <div className="op-stack">
            <Card
              title="Kapasitas kelas"
              sub="Kapasitas yang ditetapkan daycare."
            >
              {extra.classes?.map((c: Item) => (
                <div className="op-capacity" key={c.id}>
                  <div className="op-row between">
                    <strong>{c.name}</strong>
                    <span>
                      {c.enrolled} / {c.capacity || "Belum diatur"}
                    </span>
                  </div>
                  <progress
                    max={c.capacity || Math.max(c.enrolled, 1)}
                    value={c.enrolled}
                  />
                  <small>
                    {c.occupancy === null
                      ? "Atur kapasitas untuk melihat keterisian"
                      : `${c.occupancy}% terisi`}
                  </small>
                </div>
              ))}
            </Card>
            <Card title="Funnel keluarga baru">
              {Object.entries(extra.funnel || {}).map(([stage, count]) => (
                <div className="op-row between op-list-item" key={stage}>
                  <span>{status[stage] || stage}</span>
                  <strong>{String(count)}</strong>
                </div>
              ))}
              {!Object.keys(extra.funnel || {}).length && (
                <Empty>Belum ada prospek tercatat.</Empty>
              )}
            </Card>
            <div className="op-leo-card">
              <Sparkle size={25} />
              <h3>LEO Copilot</h3>
              <p>
                Ringkas angka dan fakta yang tersedia untuk keputusan
                berikutnya.
              </p>
              <button className="op-btn" onClick={() => go("leo")}>
                Buka LEO
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }
  function control() {
    return (
      <>
        <div className="op-metrics">
          {[
            ["Perlu perhatian", extra.items?.length || 0, WarningCircle],
            ["Anak hadir", children.filter((c) => c.present).length, House],
            ["Draf perawatan", drafts.length, ClipboardText],
            [
              "Izin menunggu",
              records.filter(
                (r) =>
                  r.kind === "pickup-authorization" && r.state === "requested",
              ).length,
              ShieldCheck,
            ],
          ].map(([label, value, Icon]: any) => (
            <div className="op-metric" key={label}>
              <span className="op-symbol teal">
                <Icon />
              </span>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>Catatan yang tersedia saat ini</small>
            </div>
          ))}
        </div>
        <div className="op-columns">
          <Card
            title={
              view === "closing"
                ? "Pemeriksaan akhir hari"
                : "Antrean pengecualian"
            }
            sub="Selesaikan berdasarkan tindakan yang benar-benar dilakukan."
          >
            {queue(extra.items)}
          </Card>
          <div className="op-stack">
            <Card title="Kelas & kehadiran">
              {classes.map((c) => (
                <div className="op-row between op-list-item" key={c.id}>
                  <div>
                    <strong>{c.name}</strong>
                    <p>
                      {
                        children.filter(
                          (k) => k.classroom_id === c.id && k.present,
                        ).length
                      }{" "}
                      anak hadir
                    </p>
                  </div>
                  <button
                    className="op-btn"
                    onClick={() => {
                      setClass(c.id);
                      go("care");
                    }}
                  >
                    Buka kelas
                  </button>
                </div>
              ))}
            </Card>
            <Card
              title="Daily Closing"
              sub="Masalah terbuka tetap masuk tindak lanjut."
            >
              <p>
                Closing menyimpan ringkasan pemeriksaan. Anak yang belum pulang
                dan insiden terbuka tidak otomatis ditutup.
              </p>
              {view === "closing" ? (
                <SmartForm
                  busy={busy}
                  fields={[
                    {
                      name: "note",
                      label: "Catatan tindak lanjut / shift berikutnya",
                      type: "textarea",
                    },
                  ]}
                  button="Catat closing hari ini"
                  onSubmit={(v) =>
                    mutate(
                      () =>
                        req("manager/closing", "POST", {
                          note: v.note,
                          confirmed: true,
                        }),
                      "Closing dicatat. Masalah yang belum selesai tetap terbuka.",
                    )
                  }
                >
                  <label className="op-checkbox">
                    <input type="checkbox" required />
                    Saya telah meninjau daftar dan mencatat tindak lanjut.
                  </label>
                </SmartForm>
              ) : (
                <button className="op-btn" onClick={() => go("closing")}>
                  Periksa akhir hari
                  <ArrowRight size={14} />
                </button>
              )}
            </Card>
            {view === "closing" && (
              <Card title="Riwayat closing">
                {extra.closings?.map((r: Item) => (
                  <article className="op-list-item" key={r.id}>
                    <strong>{r.data.date}</strong>
                    <p>{r.data.note}</p>
                    <small>{r.data.unresolved.length} masalah diteruskan</small>
                  </article>
                ))}
              </Card>
            )}
          </div>
        </div>
      </>
    );
  }
  function crm() {
    const leads = extra.leads || [];
    return (
      <div className="op-columns">
        <Card
          title="Prospek & percakapan"
          sub="Pesan disusun tim dan dikirim manual oleh petugas."
        >
          {leads.map((lead: Item) => (
            <article className="op-list-item" key={lead.id}>
              <div className="op-row between">
                <strong>{lead.data.name}</strong>
                <Badge state={lead.state} />
              </div>
              <p>
                {lead.data.contact} · {lead.data.source}
              </p>
              <p>{lead.data.notes}</p>
              {lead.data.desiredSchedule && (
                <p className="op-hint-text">
                  Usia {lead.data.childAgeMonths} bulan ·{" "}
                  {lead.data.desiredSchedule} · Mulai {lead.data.desiredStart}
                  <br />
                  Kelas:{" "}
                  {classes.find((c) => c.id === lead.data.classroomId)?.name} ·
                  Minat paket: {lead.data.packageInterest}
                </p>
              )}
              <div className="op-row wrap">
                {!["enrolled", "lost"].includes(lead.state) && (
                  <button
                    className="op-btn"
                    onClick={() =>
                      setModal({
                        title: "Kualifikasi & kecocokan kelas",
                        body: (
                          <SmartForm
                            busy={busy}
                            button="Simpan kualifikasi"
                            fields={[
                              {
                                name: "childAgeMonths",
                                label: "Usia anak (bulan)",
                                type: "number",
                                value: lead.data.childAgeMonths?.toString(),
                              },
                              {
                                name: "desiredSchedule",
                                label: "Jadwal yang dibutuhkan",
                                value: lead.data.desiredSchedule,
                              },
                              {
                                name: "desiredStart",
                                label: "Rencana mulai",
                                type: "date",
                                value: lead.data.desiredStart,
                              },
                              {
                                name: "classroomId",
                                label: "Kelas yang sesuai",
                                value: lead.data.classroomId,
                                options: classes.map((c) => ({
                                  value: c.id,
                                  label: c.name,
                                })),
                              },
                              {
                                name: "packageInterest",
                                label: "Paket yang diminati",
                                value: lead.data.packageInterest,
                              },
                            ]}
                            onSubmit={(v) =>
                              mutate(() =>
                                req(`crm/leads/${lead.id}/qualify`, "POST", {
                                  ...v,
                                  childAgeMonths: Number(v.childAgeMonths),
                                }),
                              )
                            }
                          />
                        ),
                      })
                    }
                  >
                    Kualifikasi
                  </button>
                )}
                <button
                  className="op-btn"
                  onClick={() =>
                    setModal({
                      title: "Draf balasan WhatsApp",
                      body: (
                        <SmartForm
                          busy={busy}
                          fields={[
                            {
                              name: "purpose",
                              label: "Tujuan",
                              options: [
                                { value: "reply", label: "Balasan pertanyaan" },
                                { value: "follow-up", label: "Tindak lanjut" },
                                { value: "tour", label: "Undangan survei" },
                                { value: "enrollment", label: "Pendaftaran" },
                              ],
                            },
                            {
                              name: "text",
                              label: "Draf yang sudah diperiksa petugas",
                              type: "textarea",
                            },
                          ]}
                          button="Simpan draf"
                          onSubmit={(v) =>
                            mutate(
                              () =>
                                req(
                                  `crm/leads/${lead.id}/whatsapp-draft`,
                                  "POST",
                                  v,
                                ),
                              "Draf disimpan. Belum dikirim.",
                            )
                          }
                        />
                      ),
                    })
                  }
                >
                  Draf WhatsApp
                </button>
                <button
                  className="op-btn"
                  onClick={() =>
                    setModal({
                      title: "Tindak lanjut prospek",
                      body: (
                        <SmartForm
                          busy={busy}
                          fields={[
                            {
                              name: "dueAt",
                              label: "Waktu tindak lanjut",
                              type: "datetime-local",
                            },
                            {
                              name: "note",
                              label: "Tindakan berikutnya",
                              type: "textarea",
                            },
                          ]}
                          onSubmit={(v) =>
                            mutate(() =>
                              req("follow-up-tasks", "POST", {
                                data: {
                                  leadId: lead.id,
                                  note: v.note,
                                  dueAt: new Date(v.dueAt).toISOString(),
                                },
                              }),
                            )
                          }
                        />
                      ),
                    })
                  }
                >
                  Follow-up
                </button>
                {lead.state !== "enrolled" && (
                  <button
                    className="op-btn teal"
                    onClick={() =>
                      setModal({
                        title: "Konfirmasi slot & pendaftaran",
                        body: (
                          <SmartForm
                            busy={busy}
                            fields={[
                              { name: "name", label: "Nama anak" },
                              {
                                name: "classroomId",
                                label: "Kelas",
                                options: classes.map((c) => ({
                                  value: c.id,
                                  label: c.name,
                                })),
                              },
                              {
                                name: "email",
                                label: "Email wali",
                                type: "email",
                              },
                              {
                                name: "packageName",
                                label: "Paket yang disepakati",
                              },
                              {
                                name: "packagePrice",
                                label: "Harga paket yang disepakati (Rp)",
                                type: "number",
                              },
                              {
                                name: "emergencyName",
                                label: "Nama kontak darurat",
                              },
                              {
                                name: "emergencyPhone",
                                label: "Telepon darurat",
                                type: "tel",
                              },
                            ]}
                            button="Konfirmasi & buat undangan wali"
                            onSubmit={(v) =>
                              mutate(async () => {
                                const enrollment = await req(
                                  `crm/leads/${lead.id}/confirm-enrollment`,
                                  "POST",
                                  {
                                    ...v,
                                    packagePrice: Number(v.packagePrice),
                                    confirmed: true,
                                  },
                                );
                                if (enrollment.invitation?.acceptUrl)
                                  setNotice(
                                    "Pendaftaran tersimpan. Salin tautan undangan melalui pengaturan anggota.",
                                  );
                                return enrollment;
                              }, "Slot dan paket tercatat. Undangan wali tersedia di administrasi.")
                            }
                          >
                            <p className="op-hint-text">
                              Kapasitas diperiksa di server. Survei dan trial
                              bersifat opsional.
                            </p>
                            <label className="op-checkbox">
                              <input type="checkbox" required />
                              Slot, paket, dan kontak darurat telah dikonfirmasi
                              dengan wali.
                            </label>
                          </SmartForm>
                        ),
                      })
                    }
                  >
                    Daftarkan
                  </button>
                )}
              </div>
            </article>
          ))}
          {!leads.length && (
            <Empty>
              Belum ada prospek. Catat pertanyaan keluarga yang diterima.
            </Empty>
          )}
        </Card>
        <div className="op-stack">
          <Card title="Catat prospek baru">
            <SmartForm
              busy={busy}
              fields={[
                { name: "name", label: "Nama wali" },
                {
                  name: "contact",
                  label: "Nomor WhatsApp, format 62…",
                  type: "tel",
                },
                {
                  name: "source",
                  label: "Sumber pertanyaan",
                  options: [
                    { value: "WhatsApp", label: "WhatsApp" },
                    { value: "Website", label: "Website" },
                    { value: "Referral", label: "Rekomendasi" },
                  ],
                },
                {
                  name: "notes",
                  label: "Kebutuhan keluarga",
                  type: "textarea",
                },
              ]}
              button="Simpan prospek"
              onSubmit={(v) => mutate(() => req("leads", "POST", { data: v }))}
            />
          </Card>
          <Card
            title="Draf WhatsApp"
            sub="Menyalin atau membuka WhatsApp bukan bukti pesan terkirim."
          >
            {extra.drafts?.map((r: Item) => (
              <article className="op-list-item" key={r.id}>
                <strong>
                  {leads.find((l: Item) => l.id === r.data.leadId)?.data.name ||
                    "Prospek"}
                </strong>
                <p>{r.data.text}</p>
                <small>Belum dikirim otomatis</small>
                <div className="op-row op-space">
                  <button
                    className="op-btn"
                    onClick={() =>
                      void mutate(async () => {
                        await navigator.clipboard.writeText(r.data.text);
                        return req(
                          `crm/whatsapp-drafts/${r.id}/copy`,
                          "POST",
                          {},
                        );
                      }, "Draf disalin.").catch(() => {})
                    }
                  >
                    Salin
                  </button>
                  <a
                    className="op-btn teal"
                    href={`https://wa.me/${r.data.phone}?text=${encodeURIComponent(r.data.text)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      void mutate(
                        () =>
                          req(`crm/whatsapp-drafts/${r.id}/open`, "POST", {}),
                        "WhatsApp dibuka untuk pengiriman manual.",
                      ).catch(() => {})
                    }
                  >
                    Buka WhatsApp
                  </a>
                </div>
              </article>
            ))}
          </Card>
          <Card title="Jadwal & tindak lanjut">
            {extra.followups?.map((r: Item) => (
              <div className="op-list-item" key={r.id}>
                <strong>
                  {leads.find((l: Item) => l.id === r.data.leadId)?.data.name}
                </strong>
                <p>{r.data.note}</p>
                <small>{new Date(r.data.dueAt).toLocaleString("id-ID")}</small>
                <Badge state={r.state} />
              </div>
            ))}
            <button className="op-btn" onClick={onTools}>
              Kelola survei, trial & jadwal
              <CalendarBlank size={16} />
            </button>
          </Card>
        </div>
      </div>
    );
  }
  function leo() {
    return (
      <div className="op-columns">
        <Card
          title="Tanya LEO"
          sub="Jawaban dari catatan yang dapat diakses oleh peran Anda."
        >
          <SmartForm
            busy={busy}
            fields={[
              { name: "question", label: "Pertanyaan", type: "textarea" },
            ]}
            button="Cari catatan"
            onSubmit={async (v) => {
              setBusy(true);
              setError("");
              try {
                setAnswer(
                  await req(
                    `leo/${isParent ? "parent" : role === "caregiver" ? "caregiver" : "owner"}/query`,
                    "POST",
                    {
                      question: v.question,
                      ...(!management ? { childId } : {}),
                    },
                  ),
                );
              } catch (e: any) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          />
          {answer && (
            <div className="op-answer">
              <span className="op-badge good">Berdasarkan catatan</span>
              <p>
                {answer.answer ||
                  "Ringkasan operasional dari data yang tersedia."}
              </p>
              {answer.metrics && (
                <dl className="op-facts">
                  {Object.entries(answer.metrics).map(([key, value]) => (
                    <div key={key}>
                      <dt>
                        {(
                          {
                            children: "Anak aktif",
                            present: "Hadir",
                            activities: "Aktivitas",
                            openIncidents: "Insiden terbuka",
                            leads: "Prospek",
                            enrolled: "Pendaftaran",
                            tours: "Survei",
                          } as Item
                        )[key] || key}
                      </dt>
                      <dd>{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {answer.sources?.map((s: Item) => (
                <div className="op-source" key={s.id}>
                  <BookOpen size={16} />
                  <span>
                    {activities.find((a) => a[0] === s.type)?.[1] ||
                      "Catatan sumber"}{" "}
                    ·{" "}
                    {s.time
                      ? new Date(s.time).toLocaleString("id-ID")
                      : "Waktu tercatat"}
                  </span>
                </div>
              ))}
              <small>
                Mode catatan terverifikasi · Penyedia AI eksternal belum
                dihubungkan.
              </small>
            </div>
          )}
        </Card>
        <div className="op-leo-card">
          <Sparkle size={36} />
          <h2>Fakta yang bisa ditelusuri.</h2>
          <p>
            LEO tidak mengisi catatan yang kosong atau menyimpulkan kondisi
            medis anak. Hasil tanpa sumber akan ditampilkan sebagai belum
            tercatat.
          </p>
          <p>
            Publikasi cerita dan rapor tetap memerlukan pemeriksaan manusia.
          </p>
        </div>
      </div>
    );
  }
  function messages() {
    return (
      <div className="op-columns">
        <Card title="Percakapan daycare">
          {recordList(extra.messages || [])}
          {childId && (
            <SmartForm
              busy={busy}
              fields={[
                {
                  name: "note",
                  label: isParent
                    ? "Pesan untuk daycare"
                    : "Pesan untuk wali anak",
                  type: "textarea",
                },
              ]}
              button="Kirim pesan"
              onSubmit={(v) =>
                mutate(
                  () =>
                    req("messages", "POST", {
                      childId,
                      data: { note: v.note },
                    }),
                  "Pesan tercatat.",
                )
              }
            />
          )}
        </Card>
        <Card title="Pengumuman">
          {recordList(
            (extra.announcements || []).filter(
              (r: Item) => r.state === "published",
            ),
          )}
        </Card>
      </div>
    );
  }
  function settingsView() {
    const setting = extra.settings?.[0];
    return (
      <div className="op-columns">
        <Card title="Kebijakan perawatan">
          <SmartForm
            key={setting?.id || "new"}
            busy={busy}
            fields={[
              {
                name: "hours",
                label: "Jam operasional",
                value: setting?.data.hours || "07:00–18:00",
              },
              {
                name: "routinePublishing",
                label: "Publikasi aktivitas rutin",
                value: data?.policy.routinePublishing,
                options: [
                  {
                    value: "caregiver",
                    label: "Pengasuh boleh menerbitkan catatan sendiri",
                  },
                  {
                    value: "manager-review",
                    label: "Pengelola meninjau sebelum terbit",
                  },
                ],
              },
              {
                name: "substituteReview",
                label: "Review penjemput pengganti",
                value: String(data?.policy.substituteReview),
                options: [
                  { value: "true", label: "Wajib review pengelola" },
                  {
                    value: "false",
                    label: "Izin wali cukup, identitas tetap diperiksa",
                  },
                ],
              },
              {
                name: "managerCrm",
                label: "Akses CRM pengelola",
                value: String(setting?.data.managerCrm || false),
                options: [
                  { value: "false", label: "Tidak diberikan" },
                  { value: "true", label: "Diberikan pemilik" },
                ],
              },
              {
                name: "managerFinance",
                label: "Akses keuangan pengelola",
                value: String(setting?.data.managerFinance || false),
                options: [
                  { value: "false", label: "Tidak diberikan" },
                  { value: "true", label: "Diberikan pemilik" },
                ],
              },
            ]}
            onSubmit={(v) =>
              mutate(() =>
                req(
                  setting ? `settings/${setting.id}` : "settings",
                  setting ? "PATCH" : "POST",
                  {
                    data: {
                      hours: v.hours,
                      timezone: "Asia/Jakarta",
                      routinePublishing: v.routinePublishing,
                      substituteReview: v.substituteReview === "true",
                      managerCrm: v.managerCrm === "true",
                      managerFinance: v.managerFinance === "true",
                    },
                  },
                ),
              )
            }
          />
        </Card>
        <div className="op-stack">
          <Card title="Kapasitas kelas">
            {classes.map((c) => (
              <div className="op-list-item" key={c.id}>
                <h3>{c.name}</h3>
                <SmartForm
                  busy={busy}
                  fields={[
                    {
                      name: "capacity",
                      label: "Kapasitas maksimum",
                      type: "number",
                      value: c.capacity?.toString(),
                    },
                    {
                      name: "caregiverRatio",
                      label: "Maksimum anak per pengasuh",
                      type: "number",
                      value: c.caregiver_ratio?.toString(),
                      required: false,
                    },
                  ]}
                  onSubmit={(v) =>
                    mutate(() =>
                      req(`classrooms/${c.id}`, "PATCH", {
                        name: c.name,
                        capacity: Number(v.capacity),
                        ...(v.caregiverRatio
                          ? { caregiverRatio: Number(v.caregiverRatio) }
                          : {}),
                      }),
                    )
                  }
                />
              </div>
            ))}
          </Card>
          <Card title="Administrasi lanjutan">
            <p>
              Kelola undangan anggota, penugasan pengasuh, persetujuan data,
              tagihan, serta audit melalui administrasi yang sudah tersedia.
            </p>
            <button className="op-btn" onClick={onTools}>
              Buka administrasi
              <GearSix size={16} />
            </button>
          </Card>
        </div>
      </div>
    );
  }
  const heading = titles[view] || titles.home;
  return (
    <div className="daylio-ops">
      <div
        className={`op-overlay ${menu ? "open" : ""}`}
        onClick={() => setMenu(false)}
      />
      <aside className={`op-sidebar ${menu ? "open" : ""}`}>
        <a className="op-brand" href="/">
          <span>
            <Heart size={25} weight="duotone" />
          </span>
          <div>
            <strong>Daylio</strong>
            <small>Care. Connect. Grow.</small>
          </div>
        </a>
        <div className="op-org">
          <span className="op-org-letter">
            {data?.organization.name?.[0] || "D"}
          </span>
          <div>
            <strong>{data?.organization.name || "Daycare"}</strong>
            <small>Workspace daycare</small>
          </div>
        </div>
        {memberships.length > 1 && (
          <select
            aria-label="Daycare aktif"
            value={organizationId}
            onChange={(e) => void onOrganization(e.target.value)}
          >
            {memberships.map((m) => (
              <option key={m.organization_id} value={m.organization_id}>
                {m.organization_name || m.organization_id}
              </option>
            ))}
          </select>
        )}
        <nav aria-label="Navigasi utama">
          <span className="op-nav-label">
            WORKSPACE {roles[role]?.toUpperCase()}
          </span>
          {nav.map(([key, label, Icon]) => (
            <button
              key={key}
              aria-current={view === key ? "page" : undefined}
              onClick={() => go(key)}
            >
              <Icon size={18} />
              {label}
              {key === "control" && extra.items?.length > 0 && (
                <span className="op-nav-count">{extra.items.length}</span>
              )}
            </button>
          ))}
          {!isParent && (
            <>
              <span className="op-nav-label">PENGELOLAAN</span>
              <button onClick={onTools}>
                <GearSix size={18} />
                Administrasi lanjutan
              </button>
            </>
          )}
        </nav>
        <footer>
          <button className="op-aside-leo" onClick={() => go("leo")}>
            <Sparkle size={24} />
            <span>
              <strong>LEO siap membantu</strong>
              <small>Temukan catatan yang relevan</small>
            </span>
          </button>
          <div className="op-row between">
            <a
              href="https://elenio.id"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Elenio"
            >
              <img
                src="/marketing/assets/elenio-official.png"
                width="94"
                height="32"
                alt="Elenio"
              />
            </a>
            <button
              className="op-icon"
              aria-label="Keluar"
              onClick={() => void onLogout()}
            >
              <SignOut size={19} />
            </button>
          </div>
        </footer>
      </aside>
      <div className="op-main">
        <header className="op-topbar">
          <div className="op-row">
            <button
              className="op-icon op-hamburger"
              onClick={() => setMenu(!menu)}
              aria-label="Buka navigasi"
            >
              {menu ? <X /> : <List />}
            </button>
            <span className="op-crumb">
              <span>Workspace</span>
              <CaretRight size={12} />
              <strong>{nav.find((n) => n[0] === view)?.[1]}</strong>
            </span>
          </div>
          <div className="op-row">
            <span className="op-role">{roles[role]}</span>
            <button
              className="op-icon"
              aria-label="Buka notifikasi"
              onClick={() =>
                setModal({
                  title: "Notifikasi Anda",
                  body: <Notifications request={req} />,
                })
              }
            >
              <Bell size={18} />
            </button>
            <span className="op-avatar small">
              {roles[role]?.substring(0, 2).toUpperCase()}
            </span>
          </div>
        </header>
        <main className="op-content">
          <div className="op-titlebar">
            <div>
              <span className="op-kicker">
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <h1>{heading[0]}</h1>
              <p className="op-muted">{heading[1]}</p>
            </div>
            <div className="op-row wrap">
              {[
                "today",
                "story",
                "pickup",
                "children",
                "reports",
                "messages",
                "leo",
              ].includes(view) &&
                (!management || view !== "leo") &&
                selector()}
              <button
                className="op-btn"
                disabled={loading || busy}
                onClick={() => void reload()}
              >
                <Clock size={15} />
                {loading ? "Memuat…" : "Perbarui"}
              </button>
            </div>
          </div>
          {data?.organization.name.startsWith("SANDBOX") && (
            <div className="op-sandbox">
              SANDBOX · Data sintetis untuk pengujian. Tidak terhubung ke
              layanan produksi.
            </div>
          )}
          {error && (
            <div className="op-alert" role="alert">
              <WarningCircle size={18} />
              {error}
              <button
                className="op-link"
                onClick={() => setError("")}
                aria-label="Tutup pesan kesalahan"
              >
                <X />
              </button>
            </div>
          )}
          {notice && (
            <div className="op-notice" role="status">
              <CheckCircle size={18} />
              {notice}
            </div>
          )}
          {!data ? (
            <Card
              title={loading ? "Memuat workspace…" : "Workspace belum tersedia"}
            >
              <p>
                {loading
                  ? "Mengambil catatan sesuai izin akun Anda."
                  : "Periksa koneksi lalu tekan Perbarui untuk mencoba lagi."}
              </p>
            </Card>
          ) : (
            <div aria-busy={busy || (needsExtra && !extraReady && !error)}>
              {needsExtra && !extraReady ? (
                <Card
                  title={error ? "Catatan belum tersedia" : "Memuat catatan…"}
                >
                  <p>
                    {error
                      ? "Tekan Perbarui untuk mencoba lagi."
                      : "Mengambil informasi terbaru sesuai izin akun Anda."}
                  </p>
                </Card>
              ) : view === "care" ? (
                care()
              ) : view === "today" ? (
                today()
              ) : view === "home" ? (
                business()
              ) : view === "control" || view === "closing" ? (
                control()
              ) : view === "pickup" ? (
                pickup()
              ) : view === "story" ? (
                stories()
              ) : view === "children" ? (
                passports()
              ) : view === "reports" ? (
                reports()
              ) : view === "crm" ? (
                crm()
              ) : view === "leo" ? (
                leo()
              ) : view === "messages" ? (
                messages()
              ) : view === "settings" ? (
                settingsView()
              ) : null}
            </div>
          )}
          <footer className="op-footer">
            Daylio by Elenio · Care. Connect. Grow.
          </footer>
        </main>
      </div>
      {modal && (
        <div
          className="op-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setModal(null);
          }}
        >
          <section
            className="op-modal"
            role="dialog"
            aria-modal="true"
            aria-label={modal.title}
          >
            <div className="op-section-head">
              <h2>{modal.title}</h2>
              <button
                className="op-icon"
                disabled={busy}
                onClick={() => setModal(null)}
                aria-label="Tutup dialog"
              >
                <X size={20} />
              </button>
            </div>
            {error && (
              <div role="alert" className="op-alert">
                {error}
              </div>
            )}
            {modal.body}
          </section>
        </div>
      )}
    </div>
  );
}
function PrivatePhotos({ rows, request }: { rows: Item[]; request: Request }) {
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]),
    [unavailable, setUnavailable] = useState(false);
  const ids = rows.map((r) => r.id).join(",");
  useEffect(() => {
    let active = true;
    setPhotos([]);
    setUnavailable(false);
    void Promise.all(
      rows.map(async (r) => {
        try {
          const grant = await request(`media/${r.id}/access`);
          return { id: r.id, url: grant.url };
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (active) {
        setPhotos(
          results.filter((r): r is { id: string; url: string } => r !== null),
        );
        setUnavailable(results.some((r) => r === null));
      }
    });
    return () => {
      active = false;
    };
  }, [ids]);
  if (!rows.length) return null;
  return (
    <div className="op-private-photos">
      {photos.map((photo) => (
        <img
          key={photo.id}
          src={photo.url}
          alt="Foto aktivitas yang dibagikan daycare"
          loading="lazy"
          onError={() => {
            setPhotos((old) => old.filter((p) => p.id !== photo.id));
            setUnavailable(true);
          }}
        />
      ))}
      {unavailable && (
        <small>
          Foto belum dapat ditampilkan. Periksa persetujuan foto atau perbarui
          halaman.
        </small>
      )}
    </div>
  );
}
function Notifications({ request }: { request: Request }) {
  const [rows, setRows] = useState<Item[] | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    request("notifications")
      .then(setRows)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <div>
      {error ? (
        <p role="alert">{error}</p>
      ) : rows === null ? (
        <p>Memuat notifikasi…</p>
      ) : rows.length ? (
        rows.map((r) => (
          <article className="op-list-item" key={r.id}>
            <strong>
              {(
                {
                  "daily-update": "Pembaruan harian anak",
                  pickup: "Serah terima tercatat",
                  "morning-note": "Pesan pagi baru",
                  "development-report": "Rapor baru",
                  message: "Pesan baru",
                } as Item
              )[r.kind] || "Pembaruan daycare"}
            </strong>
            <p>{new Date(r.created_at).toLocaleString("id-ID")}</p>
          </article>
        ))
      ) : (
        <Empty>Belum ada notifikasi.</Empty>
      )}
    </div>
  );
}
