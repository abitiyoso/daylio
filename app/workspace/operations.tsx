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
  ArrowClockwise,
  WarningCircle,
  House,
  CalendarBlank,
  Baby,
  DownloadSimple,
} from "@phosphor-icons/react";
import "./operations.css";
import Planner from "./planner";
import Commercial from "./commercial";
import OwnerSummary from "./owner-summary";
import Finance from "./finance";
import VideoIntegration from "./video-integration";
import LeoTasks from "./leo-tasks";
import WorkspaceSearch from "./workspace-search";
import AccessPanel from "./access-panel";
import {
  displayDate,
  displayValue,
  emergencyContact,
  familyContacts,
} from "../../lib/workspace-presentation.mjs";
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
  administration?: ReactNode;
  onNavigate?: () => void;
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
  offered: "Penawaran",
  waitlisted: "Daftar tunggu",
  lost: "Tidak berlanjut",
  "tour-booked": "Survei terjadwal",
  tour: "Survei",
  trial: "Trial",
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
  access: ["Akun & hak akses", "Kelola undangan dan akses tim serta keluarga."],
  staffToday: [
    "Hari Ini",
    "Mulai dari anak, kelas, dan catatan yang membutuhkan perhatian.",
  ],
  handoff: [
    "Serah Terima Shift",
    "Catatan untuk rekan yang menerima tugas berikutnya.",
  ],
  finance: [
    "Tagihan Orang Tua",
    "Verifikasi transaksi sebelum memperbarui status pembayaran.",
  ],
  businessReports: [
    "Laporan Bisnis",
    "Ringkasan dari catatan operasional yang tersimpan.",
  ],
  integrations: [
    "CCTV & Video AI",
    "Integrasi layanan Elenio dan review sesuai kewenangan.",
  ],
  subscription: [
    "Langganan Daylio",
    "Paket, kuota, dan tagihan SaaS. Terpisah dari tagihan keluarga.",
  ],
  planner: [
    "Jadwal & Kapasitas",
    "Kelas, booking, dan cakupan pengasuh dalam satu kalender.",
  ],
  home: [
    "Business Pulse",
    "Keputusan hari ini, berangkat dari catatan yang nyata.",
  ],
  control: ["Control Tower", "Fokus pada hal yang membutuhkan perhatian Anda."],
  care: [
    "Catat Aktivitas",
    "Lebih sedikit administrasi, lebih banyak waktu bersama anak.",
  ],
  today: ["Anakku Hari Ini", "Cerita kecil hari ini, terhubung dengan Anda."],
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
function Metric({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: any;
}) {
  return (
    <div className="op-metric">
      <div className="op-row between">
        <span>{label}</span>
        <Icon size={20} />
      </div>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
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
  administration,
  onNavigate,
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
            ? "staffToday"
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
    onNavigate?.();
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
  const navGroups: { title: string; items: [string, string, any][] }[] =
    isParent
      ? [
          {
            title: "Keluarga",
            items: [
              ["today", "Anakku Hari Ini", House],
              ["story", "Cerita Harian", BookOpen],
              ["reports", "Tumbuh Kembang", ChartBar],
              ["children", "Care Passport", Baby],
            ],
          },
          {
            title: "Layanan",
            items: [
              ["planner", "Paket & Jadwal", CalendarBlank],
              ["pickup", "Izin Penjemputan", ShieldCheck],
              ["messages", "Pesan Daycare", ChatCircleText],
              ["integrations", "CCTV Area Anak", SquaresFour],
              ["leo", "Tanya LEO", Sparkle],
            ],
          },
        ]
      : role === "caregiver"
        ? [
            {
              title: "Tugas harian",
              items: [
                ["staffToday", "Hari Ini", House],
                ["care", "Catat Aktivitas", NotePencil],
                ["children", "Anak Asuhan", Baby],
                ["planner", "Jadwal Saya", CalendarBlank],
              ],
            },
            {
              title: "Tindak lanjut",
              items: [
                ["pickup", "Penjemputan", ShieldCheck],
                ["handoff", "Serah Terima Shift", ClipboardText],
                ["story", "Review Catatan", BookOpen],
                ["reports", "Observasi & Rapor", BookOpen],
                ["messages", "Pesan", ChatCircleText],
                ["leo", "Tanya LEO", Sparkle],
              ],
            },
          ]
        : role === "manager"
          ? [
              {
                title: "Hari ini",
                items: [
                  ["control", "Control Tower", SquaresFour],
                  ["planner", "Jadwal & Kapasitas", CalendarBlank],
                ],
              },
              {
                title: "Pengasuhan",
                items: [
                  ["children", "Data Anak", UsersThree],
                  ["story", "Aktivitas & Review", ClipboardText],
                  ["care", "Catat Aktivitas", NotePencil],
                  ["pickup", "Penjemputan & Insiden", ShieldCheck],
                  ["reports", "Perkembangan Anak", BookOpen],
                  ["closing", "Daily Closing", CheckCircle],
                ],
              },
              {
                title: "Komunikasi & teknologi",
                items: [
                  ["messages", "Pesan Keluarga", ChatCircleText],
                  ["integrations", "CCTV & Video AI", SquaresFour],
                  ["leo", "LEO AI Workspace", Sparkle],
                  ...(user.capabilities?.crm
                    ? [
                        ["crm", "Prospek & Pendaftaran", ChatCircleText] as [
                          string,
                          string,
                          any,
                        ],
                      ]
                    : []),
                  ...(user.capabilities?.finance
                    ? [
                        ["finance", "Tagihan Orang Tua", NotePencil] as [
                          string,
                          string,
                          any,
                        ],
                      ]
                    : []),
                ],
              },
            ]
          : [
              { title: "Hari ini", items: [["home", "Ringkasan", House]] },
              {
                title: "Pengasuhan",
                items: [
                  ["children", "Anak & Keluarga", UsersThree],
                  ["planner", "Jadwal & Booking", CalendarBlank],
                  ["control", "Care & Safety", ShieldCheck],
                  ["care", "Catat Aktivitas", NotePencil],
                  ["pickup", "Penjemputan", ShieldCheck],
                  ["reports", "Perkembangan Anak", BookOpen],
                  ["integrations", "CCTV & Video AI", SquaresFour],
                ],
              },
              {
                title: "Bisnis daycare",
                items: [
                  ...(user.capabilities?.crm
                    ? [
                        ["crm", "Prospek & Pendaftaran", ChatCircleText] as [
                          string,
                          string,
                          any,
                        ],
                      ]
                    : []),
                  ...(user.capabilities?.finance
                    ? [
                        ["finance", "Tagihan Orang Tua", NotePencil] as [
                          string,
                          string,
                          any,
                        ],
                      ]
                    : []),
                  ["businessReports", "Laporan", ChartBar],
                  ["messages", "Pesan Keluarga", ChatCircleText],
                  ["closing", "Daily Closing", CheckCircle],
                ],
              },
              {
                title: "Intelligence",
                items: [["leo", "LEO AI Workspace", Sparkle]],
              },
              {
                title: "Pengaturan",
                items: [
                  ["subscription", "Langganan Daylio", CalendarBlank],
                  ["settings", "Pengaturan", GearSix],
                ],
              },
            ];
  const nav = navGroups.flatMap((g) => g.items);
  const additionalNav = new Set(
    role === "owner"
      ? ["care", "pickup", "reports", "messages", "closing"]
      : role === "caregiver"
        ? ["story", "reports"]
        : role === "manager"
          ? ["care", "closing"]
          : [],
  );
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
    const groups = new Map<string, Item[]>();
    for (const item of items) {
      const key =
        item.kind === "activity" && item.data.batchId
          ? "batch:" + item.data.batchId
          : item.id + ":" + item.kind;
      groups.set(key, [...(groups.get(key) || []), item]);
    }
    const grouped: Item[] = [...groups.values()].map((rows) => ({
      ...rows[0],
      groupCount: rows.length,
    }));
    return grouped.length ? (
      grouped.map((item) => (
        <article className="op-exception" key={`${item.kind}-${item.id}`}>
          <span
            className={`op-symbol ${item.kind === "incident" ? "coral" : "teal"}`}
          >
            {item.kind === "incident" ? <WarningCircle /> : <ClipboardText />}
          </span>
          <div className="op-grow">
            <strong>
              {kinds[item.kind] || item.kind}
              {item.groupCount > 1 ? ` · ${item.groupCount} anak` : ""}
            </strong>
            <p>
              {item.groupCount > 1
                ? "Satu catatan kelompok"
                : item.kind === "staff-coverage"
                  ? classes.find((c) => c.id === item.id)?.name || "Kelas"
                  : nameFor(item.childId)}{" "}
              ·{" "}
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
  const [storyPage, setStoryPage] = useState(0);
  useEffect(() => setStoryPage(0), [childId]);
  function morningAction() {
    return (
      <button
        className="op-btn primary"
        disabled={!childId || !extraReady || loading || busy}
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
    );
  }
  function today() {
    const c = extra.child || current;
    const age = c?.birth_date
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - Date.parse(c.birth_date)) /
              ((365.25 / 12) * 86400000),
          ),
        )
      : null;
    const routine = extra.pickups?.find(
      (r: Item) =>
        r.kind === "pickup-authorization" &&
        r.state === "approved" &&
        Date.parse(r.data.expiresAt) > Date.now(),
    );
    return (
      <>
        <div className="v6-parent-head">
          <div className="v6-parent-greeting">
            <span className="v6-overline">
              ANAKKU HARI INI · {data?.organization.name}
            </span>
            <h1>
              Halo, {user.displayName?.split(" ")[0] || "Keluarga"}{" "}
              <Sun size={24} />
            </h1>
            <p>
              Cerita kecil {c?.name?.split(" ")[0] || "si kecil"} yang membuat
              hari ini berarti.
            </p>
            <div className="v6-child-status">
              <span>
                {extra.attendance ? (
                  <Check size={14} />
                ) : (
                  <CalendarBlank size={14} />
                )}
                {extra.attendance?.data.type === "in"
                  ? "Hadir hari ini"
                  : extra.attendance?.data.type === "out"
                    ? "Sudah pulang"
                    : "Kedatangan belum tercatat"}
              </span>
              <span>
                <ShieldCheck size={14} />
                {
                  (extra.pickups || []).filter(
                    (p: Item) =>
                      p.state === "approved" &&
                      Date.parse(p.data.expiresAt) > Date.now(),
                  ).length
                }{" "}
                penjemput terdaftar
              </span>
            </div>
            <div className="v6-parent-cta">
              <button
                className="op-btn primary"
                onClick={() =>
                  setModal({
                    title: "Pesan pengasuh",
                    body: (
                      <SmartForm
                        busy={busy}
                        button="Kirim pesan"
                        fields={[
                          {
                            name: "note",
                            label: "Pesan untuk daycare",
                            type: "textarea",
                          },
                        ]}
                        onSubmit={(v) =>
                          mutate(() =>
                            req("messages", "POST", {
                              childId,
                              data: { note: v.note },
                            }),
                          )
                        }
                      />
                    ),
                  })
                }
              >
                <ChatCircleText size={16} /> Pesan pengasuh
              </button>
              <button className="op-btn" onClick={() => go("pickup")}>
                Atur izin jemput
              </button>
            </div>
            {process.env.NEXT_PUBLIC_SANDBOX === "true" && (
              <span className="op-environment">Sandbox · Data contoh</span>
            )}
          </div>
          <div className="v10-parent-identity">
            <span className="op-avatar">
              {c?.name
                ?.split(" ")
                .map((v: string) => v[0])
                .slice(0, 2)
                .join("") || <Baby />}
            </span>
            <strong>{c?.name || "Anak Anda"}</strong>
            <small>
              {classes.find((room) => room.id === c?.classroom_id)?.name ||
                "Daycare"}
              {age != null && (
                <span className="v10-child-age">
                  {Math.floor(age / 12)} th {age % 12} bl
                </span>
              )}
            </small>
          </div>
        </div>
        <div className="v6-parent-day-strip">
          {[
            [
              extra.attendance ? Check : CalendarBlank,
              extra.attendance
                ? time(extra.attendance.created_at)
                : "Belum tercatat",
              extra.attendance?.data.type === "out" ? "Check-out" : "Check-in",
            ],
            [
              ForkKnife,
              extra.meal?.data.result || "Belum dicatat",
              "Makan siang",
            ],
            [Moon, extra.sleep?.data.result || "Belum dicatat", "Istirahat"],
            [Sun, (extra.activityCount || 0) + " update", "Aktivitas terbit"],
          ].map(([Icon, value, title]: any) => (
            <div key={title}>
              <i>
                <Icon size={18} />
              </i>
              <strong>{value}</strong>
              <span>{title}</span>
            </div>
          ))}
        </div>
        <div className="op-columns op-parent-grid">
          <Card
            title="Daily Story"
            sub="Cerita kecil yang sudah ditinjau daycare."
            action={
              <button className="op-link" onClick={() => go("story")}>
                Lihat semua <CaretRight size={16} />
              </button>
            }
          >
            <PrivatePhotos
              key={childId}
              rows={extra.photos || []}
              request={req}
            />
            {extra.story ? (
              <>
                <div className="op-story-byline">
                  <CheckCircle size={16} />
                  Ditinjau daycare ·{" "}
                  {new Date(
                    extra.story.data.publishedAt || extra.story.created_at,
                  ).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                  })}{" "}
                  ·{" "}
                  {time(extra.story.data.publishedAt || extra.story.created_at)}{" "}
                  WIB
                </div>
                <p className="op-story-text preview">{extra.story.data.note}</p>
              </>
            ) : (
              <div className="op-story-empty">
                <Empty>
                  Belum ada cerita yang dibagikan untuk hari ini. Lihat cerita
                  sebelumnya untuk kabar terakhir dari daycare.
                </Empty>
                <button className="op-btn" onClick={() => go("story")}>
                  Lihat cerita sebelumnya <ArrowRight size={16} />
                </button>
              </div>
            )}
            <button className="op-btn teal" onClick={() => go("leo")}>
              <Sparkle size={17} />
              Tanya LEO tentang hari ini
            </button>
            <details className="op-space">
              <summary>
                Catatan aktivitas hari ini ({extra.activityCount || 0})
              </summary>
              {recordList(
                extra.activities || [],
                "Belum ada aktivitas yang dibagikan hari ini.",
              )}
              <button className="op-link" onClick={() => go("story")}>
                Lihat semua catatan
              </button>
            </details>
          </Card>
          <>
            <Card title="Informasi untuk keluarga" sub="YANG PENTING">
              <div className="v6-family-links">
                {[
                  [
                    "pickup",
                    ShieldCheck,
                    "Penjemputan hari ini",
                    routine ? routine.data.name : "Periksa izin penjemput",
                  ],
                  [
                    "reports",
                    BookOpen,
                    "Perkembangan " + (c?.name?.split(" ")[0] || "anak"),
                    "Observasi pendidik dan rapor",
                  ],
                  [
                    "planner",
                    CalendarBlank,
                    "Paket & jadwal",
                    selectedRecords.find((r) => r.kind === "enrollment")?.data
                      .packageName || "Informasi layanan keluarga",
                  ],
                  [
                    "integrations",
                    SquaresFour,
                    "CCTV area anak",
                    "Menunggu integrasi dan pengaturan akses",
                  ],
                ].map(([key, Icon, title, note]: any) => (
                  <button key={key} onClick={() => go(key)}>
                    <Icon size={19} />
                    <span>
                      <b>{title}</b>
                      <small>{note}</small>
                    </span>
                    <ArrowRight size={15} />
                  </button>
                ))}
              </div>
            </Card>

            <Card
              title="Pesan pagi Anda"
              sub="Kabar dari rumah, diterima dengan perhatian."
              action={morningAction()}
            >
              {extra.morning?.length ? (
                <div className="op-parent-note">
                  <div className="op-row">
                    <Sun size={18} />
                    <Badge state={extra.morning[0].state} />
                  </div>
                  <p>{extra.morning[0].data.note}</p>
                  <small>
                    {extra.morning[0].data.acknowledgedAt
                      ? `Diterima pengasuh pukul ${time(extra.morning[0].data.acknowledgedAt)} WIB`
                      : "Menunggu pengasuh membaca pesan Anda."}
                  </small>
                  {extra.morningHistory?.length > 0 && (
                    <details>
                      <summary>
                        Pesan sebelumnya hari ini ({extra.morningCount - 1})
                      </summary>
                      {extra.morningHistory.map((r: Item) => (
                        <article key={r.id}>
                          <p>{r.data.note}</p>
                          <small>
                            {time(r.created_at)} WIB · <Badge state={r.state} />
                          </small>
                        </article>
                      ))}
                    </details>
                  )}
                </div>
              ) : (
                <Empty>
                  Bagikan kabar tidur, sarapan, atau kebutuhan si kecil melalui
                  tombol Pesan pagi.
                </Empty>
              )}
            </Card>
            <Card title="Penjemputan hari ini">
              {routine ? (
                <div className="op-pickup-person">
                  <div className="op-row">
                    <span className="op-symbol teal">
                      <ShieldCheck />
                    </span>
                    <div>
                      <strong>{routine.data.name}</strong>
                      <small style={{ display: "block" }}>
                        {routine.data.relationship} ·{" "}
                        {routine.data.kind === "routine"
                          ? "Penjemput rutin"
                          : "Penjemput pengganti"}
                      </small>
                    </div>
                  </div>
                  <p>
                    Otorisasi aktif. Petugas tetap memeriksa identitas saat
                    penjemputan.
                  </p>
                </div>
              ) : (
                <p>
                  Belum ada izin penjemputan aktif. Atur penjemput rutin atau
                  berikan izin pengganti.
                </p>
              )}
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
          </>
        </div>
      </>
    );
  }
  function stories() {
    const allStories = selectedRecords
      .filter((r) => r.kind === "daily-story")
      .sort((a, b) => String(b.data.date).localeCompare(String(a.data.date)));
    const rows = allStories.slice(storyPage * 5, storyPage * 5 + 5);
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
          {management && (
            <button className="op-btn" onClick={() => go("access")}>
              <UsersThree size={18} />
              Akun & hak akses
            </button>
          )}
          {!isParent && (
            <Card title="Draf kegiatan kelompok">{reviewBatches()}</Card>
          )}
          <Card title="Cerita harian">
            {rows.length ? (
              rows.map((r) => (
                <article className="op-list-item" key={r.id}>
                  <div className="op-row between">
                    <strong>
                      {new Date(
                        r.data.date + "T12:00:00+07:00",
                      ).toLocaleDateString("id-ID", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </strong>
                    <Badge state={r.state} />
                  </div>
                  <PrivatePhotos
                    rows={selectedRecords
                      .filter(
                        (photo) =>
                          photo.kind === "media" &&
                          photo.state === "published" &&
                          photo.data.uploaded &&
                          (photo.data.date ||
                            localDateFrom(photo.created_at)) === r.data.date,
                      )
                      .slice(0, 3)}
                    request={req}
                  />
                  <p className="op-story-text">{r.data.note}</p>
                  <small>
                    Ditinjau daycare ·{" "}
                    {time(r.data.publishedAt || r.created_at)} WIB
                  </small>
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
            {allStories.length > 5 && (
              <div className="op-history-controls">
                <button
                  className="op-btn"
                  disabled={storyPage === 0}
                  onClick={() => setStoryPage((p) => p - 1)}
                >
                  Lebih baru
                </button>
                <small>
                  Halaman {storyPage + 1} dari{" "}
                  {Math.ceil(allStories.length / 5)}
                </small>
                <button
                  className="op-btn"
                  disabled={(storyPage + 1) * 5 >= allStories.length}
                  onClick={() => setStoryPage((p) => p + 1)}
                >
                  Lebih lama
                </button>
              </div>
            )}
          </Card>
        </div>
        <Card
          title={isParent ? "Catatan terbit" : "Susun Daily Story"}
          sub={
            isParent
              ? "Catatan perawatan yang sudah dibagikan daycare."
              : "Gunakan catatan nyata yang telah diterbitkan."
          }
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
          <ActivityHistory
            rows={selectedRecords.filter(
              (r) => r.kind === "activity" && r.state === "published",
            )}
            render={recordList}
          />
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
      changes = extra.changes || [],
      emergency = emergencyContact(passport?.data || {});
    return (
      <div className="op-columns">
        <Card
          title={`Care Passport · ${current?.name || "Anak"}`}
          sub="Versi yang telah ditinjau pengelola. Periksa kelengkapan sebelum digunakan."
        >
          <p className="op-muted">
            Tanggal lahir:{" "}
            {current?.birth_date
              ? displayDate(String(current.birth_date).slice(0, 10))
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
              {!emergency.complete && (
                <p className="op-passport-incomplete">
                  Kontak darurat belum lengkap.{" "}
                  {isParent
                    ? "Lengkapi melalui pengajuan perubahan di halaman ini."
                    : "Minta wali melengkapi informasi dan tinjau pengajuannya."}
                </p>
              )}
              <dl className="op-facts op-passport-facts">
                {[
                  ["Alergi", passport.data.allergies],
                  ["Instruksi perawatan", passport.data.careInstructions],
                  ["Kontak darurat", emergency.label],
                  ["Versi", passport.data.version],
                  [
                    "Kontak keluarga",
                    familyContacts(passport.data.authorizedContacts),
                  ],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{displayValue(value)}</dd>
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
                    {[r.data.allergies, r.data.careInstructions]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p>Darurat: {emergencyContact(r.data).label}</p>
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
          {management && (
            <button className="op-btn" onClick={() => go("access")}>
              <UsersThree size={18} />
              Akun & hak akses
            </button>
          )}
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
  function businessFilters() {
    return (
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
            {Array.from(new Set(classes.map((c) => c.branch_id))).map((id) => (
              <option key={id} value={id}>
                {classes.find((c) => c.branch_id === id)?.branch_name ||
                  "Cabang " +
                    (Array.from(
                      new Set(classes.map((c) => c.branch_id)),
                    ).indexOf(id) +
                      1)}
              </option>
            ))}
          </select>
        </label>
      </div>
    );
  }
  function business() {
    const capacityClasses = (extra.classes || []).filter(
      (room: Item) => room.capacity,
    );
    const capacity = capacityClasses.reduce(
      (sum: number, room: Item) => sum + room.capacity,
      0,
    );
    const enrolled = capacityClasses.reduce(
      (sum: number, room: Item) => sum + room.enrolled,
      0,
    );
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
          </div>
          <ChartBar size={64} weight="duotone" />
        </div>
        <div className="op-metrics">
          {[
            [
              "Keterisian kelas",
              capacity
                ? `${Math.round((enrolled / capacity) * 100)}%`
                : "Belum diatur",
              UsersThree,
              capacity
                ? `${enrolled} dari ${capacity} slot kelas`
                : "Lengkapi kapasitas kelas",
            ],
            [
              "Hadir hari ini",
              extra.present,
              House,
              `${extra.children || 0} anak terdaftar`,
            ],
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
            [
              "Perlu perhatian",
              extra.items?.length || 0,
              WarningCircle,
              "Perlu ditinjau",
            ],
            [
              "Anak hadir",
              children.filter((c) => c.present).length,
              House,
              "Sesuai absensi",
            ],
            ["Draf perawatan", drafts.length, ClipboardText, "Review kelompok"],
            [
              "Izin menunggu",
              records.filter(
                (r) =>
                  r.kind === "pickup-authorization" &&
                  r.state === "requested" &&
                  Date.parse(r.data.expiresAt) > Date.now(),
              ).length,
              ShieldCheck,
              "Otorisasi aktif",
            ],
          ].map(([label, value, Icon, detail]: any) => (
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
            <article className="op-list-item op-lead-card" key={lead.id}>
              <div className="op-row between">
                <strong>{lead.data.name}</strong>
                <Badge state={lead.state} />
              </div>
              <p>
                {lead.data.contact} · {lead.data.source}
              </p>
              {lead.data.notes && <p>{lead.data.notes}</p>}
              {lead.data.duplicateIds?.length > 0 && (
                <p className="op-hint-text">
                  Kontak ini juga tercatat pada prospek lain. Periksa apakah
                  keluarga yang sama sebelum mendaftarkan anak.
                </p>
              )}
              {lead.data.ownerId && (
                <p className="op-hint-text">
                  PIC:{" "}
                  {extra.staff?.find(
                    (s: Item) => s.user_id === lead.data.ownerId,
                  )?.display_name || "Petugas daycare"}
                </p>
              )}
              {lead.data.desiredSchedule && (
                <p className="op-hint-text">
                  Usia {lead.data.childAgeMonths} bulan ·{" "}
                  {lead.data.desiredSchedule} · Mulai{" "}
                  {displayDate(lead.data.desiredStart)}
                  <br />
                  Kelas:{" "}
                  {classes.find((c) => c.id === lead.data.classroomId)?.name} ·
                  Minat paket: {lead.data.packageInterest}
                </p>
              )}
              <div className="op-lead-actions">
                <button
                  className="op-btn"
                  onClick={() =>
                    setModal({
                      title: "Edit prospek",
                      body: (
                        <SmartForm
                          busy={busy}
                          fields={[
                            {
                              name: "name",
                              label: "Nama wali",
                              value: lead.data.name,
                            },
                            {
                              name: "contact",
                              label: "Kontak wali",
                              value: lead.data.contact,
                            },
                            {
                              name: "source",
                              label: "Sumber pertanyaan",
                              value: lead.data.source,
                            },
                            {
                              name: "notes",
                              label: "Catatan",
                              type: "textarea",
                              value: lead.data.notes,
                              required: false,
                            },
                          ]}
                          onSubmit={(v) =>
                            mutate(() => req(`leads/${lead.id}`, "PATCH", v))
                          }
                        />
                      ),
                    })
                  }
                >
                  Edit prospek
                </button>
                {lead.state !== "enrolled" && (
                  <button
                    className="op-btn"
                    onClick={() =>
                      setModal({
                        title: "Tahap & penanggung jawab",
                        body: (
                          <SmartForm
                            busy={busy}
                            fields={[
                              {
                                name: "status",
                                label: "Tahap prospek",
                                value: lead.state,
                                options: [
                                  "new",
                                  "contacted",
                                  "tour-booked",
                                  "trial",
                                  "qualified",
                                  "offered",
                                  "waitlisted",
                                  "lost",
                                ].map((value) => ({
                                  value,
                                  label: status[value],
                                })),
                              },
                              {
                                name: "ownerId",
                                label: "Penanggung jawab",
                                value: lead.data.ownerId || "",
                                required: false,
                                options: [
                                  { value: "", label: "Belum ditetapkan" },
                                  ...(extra.staff || []).map((s: Item) => ({
                                    value: s.user_id,
                                    label: s.display_name || roles[s.role],
                                  })),
                                ],
                              },
                              {
                                name: "note",
                                label: "Alasan / langkah berikutnya",
                                type: "textarea",
                              },
                            ]}
                            onSubmit={(v) =>
                              mutate(() =>
                                req(`leads/${lead.id}/status`, "POST", {
                                  ...v,
                                  ownerId: v.ownerId || null,
                                }),
                              )
                            }
                          />
                        ),
                      })
                    }
                  >
                    Tahap & PIC
                  </button>
                )}
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
        <div className="op-stack">
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
          <LeoTasks
            request={req}
            role={role}
            children={children}
            records={records}
            canCrm={!!user.capabilities?.crm}
          />
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
  const heading =
    isParent && view === "story"
      ? ["Daily Story", "Cerita yang sudah ditinjau dan dibagikan daycare."]
      : titles[view] || titles.home;
  function staffToday() {
    const assigned = children.filter(
        (c) => !classId || c.classroom_id === classId,
      ),
      ids = new Set(assigned.map((c) => c.id));
    const careNotes = records.filter(
      (r) => r.kind === "passport" && ids.has(r.child_id),
    );
    const notes = careNotes
      .filter((r) => r.data.allergies || r.data.careInstructions)
      .slice(0, 3);
    const hour = Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        hourCycle: "h23",
      }).format(new Date()),
    );
    const greeting =
      hour < 11 ? "pagi" : hour < 15 ? "siang" : hour < 18 ? "sore" : "malam";
    return (
      <>
        <div className="v6-intro v6-care-intro">
          <div>
            <span className="v6-overline">
              {classes.find((c) => c.id === classId)?.name || "Kelas"} ·
              PENGASUHAN HARI INI
            </span>
            <h1>
              Selamat {greeting}, Kak{" "}
              {user.displayName?.split(" ")[0] || "Pengasuh"}
            </h1>
            <p>
              {assigned.filter((c) => c.present).length} anak hadir. Mulai catat
              kegiatan tanpa membuka profil satu-satu.
            </p>
            {process.env.NEXT_PUBLIC_SANDBOX === "true" && (
              <span className="op-environment">Sandbox · Data contoh</span>
            )}
          </div>
          <div className="v6-intro-actions">
            {assigned.length > 0 && !assigned.some((c) => c.present) && (
              <button
                className="op-btn"
                onClick={() => {
                  const el = document.getElementById(
                    "v10-attendance",
                  ) as HTMLDetailsElement;
                  if (el) {
                    el.open = true;
                    el.scrollIntoView({ block: "center" });
                  }
                }}
              >
                Buka kehadiran kelas
              </button>
            )}
            <button className="op-btn primary" onClick={() => go("care")}>
              <Plus size={16} /> Catat aktivitas kelas
            </button>
          </div>
        </div>
        <div className="v6-care-strip">
          {[
            [assigned.filter((c) => c.present).length, "Anak hadir"],
            [
              records.filter(
                (r) =>
                  r.kind === "activity" &&
                  ids.has(r.child_id) &&
                  localDateFrom(r.data.occurredAt || r.created_at) ===
                    localDate(),
              ).length,
              "Aktivitas tercatat",
            ],
            [drafts.length, "Menunggu review"],
            [careNotes.length, "Profil terkonfirmasi"],
          ].map(([value, title]) => (
            <div key={title}>
              <strong>{value}</strong>
              <span>{title}</span>
            </div>
          ))}
        </div>
        <div className="v6-dash-charts v6-care-grid">
          <section className="v6-surface">
            <div className="v6-surface-head">
              <div>
                <span className="v6-surface-kicker">
                  SATU KELAS, SATU INPUT
                </span>
                <h2>Catat aktivitas cepat</h2>
                <p>
                  Pilih aktivitas lalu konfirmasi anak; ubah hanya pengecualian.
                </p>
              </div>
            </div>
            <div className="v6-quick-grid">
              {activities.map(([type, label, Icon]) => (
                <button
                  key={type}
                  onClick={() => {
                    setActivity(type);
                    setResult(type === "meal" ? "Habis" : "Tercatat");
                    go("care");
                  }}
                >
                  <span>
                    <Icon size={24} />
                  </span>
                  <strong>{type === "hygiene" ? "Toilet" : label}</strong>
                </button>
              ))}
            </div>
          </section>
          <section className="v6-surface">
            <div className="v6-surface-head">
              <div>
                <span className="v6-surface-kicker">CARE PASSPORT</span>
                <h2>Brief perawatan anak</h2>
                <p>Periksa sebelum makan, tidur atau serah-terima.</p>
              </div>
              <button className="v6-text-action" onClick={() => go("children")}>
                Semua anak <ArrowRight size={15} />
              </button>
            </div>
            <div className="v10-passport-brief">
              {notes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setChild(r.child_id);
                    go("children");
                  }}
                >
                  <span className="op-avatar">
                    {String(nameFor(r.child_id))
                      .split(" ")
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join("")}
                  </span>
                  <span>
                    <strong>{nameFor(r.child_id)}</strong>
                    <small>
                      {[r.data.allergies, r.data.careInstructions]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </span>
                  <ArrowRight size={15} />
                </button>
              ))}
              {!notes.length && (
                <p>
                  Belum ada instruksi yang dikonfirmasi. Periksa Care Passport
                  setiap anak.
                </p>
              )}
            </div>
          </section>
        </div>
        <div className="v6-next-actions">
          <span>SELANJUTNYA</span>
          {[
            ["handoff", "Handover"],
            ["pickup", "Penjemputan"],
            ["messages", "Pesan keluarga"],
          ].map(([key, title]) => (
            <button key={key} onClick={() => go(key)}>
              {title}
              <ArrowRight size={14} />
            </button>
          ))}
        </div>
        <details className="v10-block" id="v10-attendance">
          <summary>Kehadiran kelas</summary>
          {assigned.map((c) => (
            <div className="op-list-item" key={c.id}>
              <strong>{c.name}</strong>
              <p>{c.present ? "Sudah hadir" : "Belum hadir"}</p>
              {!c.present && (
                <button
                  className="op-btn"
                  disabled={busy}
                  onClick={() =>
                    void mutate(() =>
                      req("attendance", "POST", {
                        childId: c.id,
                        data: { type: "in" },
                      }),
                    ).catch(() => {})
                  }
                >
                  Catat kedatangan
                </button>
              )}
            </div>
          ))}
        </details>
      </>
    );
  }
  function handoff() {
    const rows = records.filter((r) => r.kind === "handoff");
    return (
      <Card
        title="Serah Terima Shift"
        sub="Pengirim dan penerima yang terhubung dapat melihat catatan."
      >
        <button
          className="op-btn primary"
          onClick={() =>
            void req("care/handoff-options")
              .then((recipients) =>
                setModal({
                  title: "Buat serah terima",
                  body: (
                    <SmartForm
                      busy={busy}
                      fields={[
                        {
                          name: "recipientId",
                          label: "Penerima",
                          options: recipients.map((r: Item) => ({
                            value: r.user_id,
                            label: r.display_name || "Petugas daycare",
                          })),
                        },
                        {
                          name: "note",
                          label: "Catatan serah terima",
                          type: "textarea",
                        },
                      ]}
                      onSubmit={(v) => mutate(() => req("handoffs", "POST", v))}
                    />
                  ),
                }),
              )
              .catch((e) => setError(e.message))
          }
        >
          Buat serah terima
        </button>
        {rows.map((r) => (
          <article className="op-list-item" key={r.id}>
            <Badge state={r.state} />
            <p>{r.data.note}</p>
            <small>{new Date(r.created_at).toLocaleString("id-ID")}</small>
            {r.state !== "acknowledged" &&
              r.data.recipientId === user.userId && (
                <button
                  className="op-btn"
                  disabled={busy}
                  onClick={() =>
                    void mutate(() =>
                      req(`handoffs/${r.id}/acknowledge`, "POST", {}),
                    ).catch(() => {})
                  }
                >
                  Terima serah tugas
                </button>
              )}
          </article>
        ))}
        {!rows.length && <Empty>Belum ada catatan serah terima.</Empty>}
      </Card>
    );
  }
  function integrations() {
    return (
      <Card
        title={isParent ? "CCTV Area Anak" : "CCTV & Video AI"}
        sub="Layanan streaming dan analitik Elenio belum terhubung."
      >
        <div className="op-banner">
          <ShieldCheck size={24} />
          <div>
            <h2>Belum ada sesi kamera aktif</h2>
            <p>
              Akses hanya dapat diterbitkan setelah izin tenant, relasi anak,
              area, waktu, dan consent diperiksa oleh server. Event AI adalah
              sinyal untuk review manusia.
            </p>
          </div>
        </div>
        <button
          className="op-btn"
          onClick={() =>
            void req("cameras" + (isParent ? "?childId=" + childId : ""))
              .then(() => setNotice("Tidak ada kamera terhubung."))
              .catch((e) => setError(e.message))
          }
        >
          Periksa koneksi & izin
        </button>
        <p>
          Tidak ada rekaman atau deteksi yang disimulasikan dalam workspace ini.
          CCTV dan AI Video Analytics adalah add-on Elenio terpisah.
        </p>
      </Card>
    );
  }
  function businessReports() {
    return (
      <div className="op-stack">
        <OwnerSummary
          request={req}
          go={go}
          date={date}
          branch={branch}
          refreshVersion={version.current}
        />
        <Card
          title="Ekspor laporan operasional"
          sub="Data mengikuti izin organisasi dan periode yang dipilih."
        >
          <button
            className="op-btn"
            onClick={() =>
              void req("reports/operations?format=csv")
                .then((file) => {
                  const a = document.createElement("a");
                  const url = URL.createObjectURL(
                    new Blob([file.content || JSON.stringify(file)], {
                      type: "text/csv",
                    }),
                  );
                  a.href = url;
                  a.download = "daylio-operations.csv";
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 1000);
                })
                .catch((e) => setError(e.message))
            }
          >
            Unduh laporan
          </button>
        </Card>
      </div>
    );
  }
  return (
    <div className="daylio-ops" data-view={view}>
      <link rel="stylesheet" href="/workspace-v10.css" />
      <link rel="stylesheet" href="/fonts/daylio.css" />
      <div
        className={`op-overlay ${menu ? "open" : ""}`}
        onClick={() => setMenu(false)}
      />
      <aside
        id="workspace-navigation"
        className={`op-sidebar ${menu ? "open" : ""}`}
      >
        <a className="op-brand v10-brandwrap" href="/">
          <img
            src="/approved-assets/489b7ae542496ea355c1.png"
            alt="Daylio by Elenio — logo Sun of Care"
          />
        </a>
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
          {navGroups.map((group) => (
            <div className="v10-group" key={group.title}>
              <div className="v10-label">{group.title}</div>
              <div className="v10-nav">
                {group.items
                  .filter(([key]) => !additionalNav.has(key))
                  .map(([key, label, Icon]) => (
                    <button
                      key={key}
                      className={
                        !administration && view === key ? "active" : ""
                      }
                      aria-current={
                        !administration && view === key ? "page" : undefined
                      }
                      onClick={() => go(key)}
                    >
                      <Icon size={17} />
                      <span>{label}</span>
                      {key === "integrations" && (
                        <span className="v10-next">ADD-ON</span>
                      )}
                    </button>
                  ))}
              </div>
            </div>
          ))}
          {additionalNav.size > 0 && (
            <details className="v10-additional-nav">
              <summary>Alat pengasuhan lainnya</summary>
              <div className="v10-nav">
                {nav
                  .filter(([key]) => additionalNav.has(key))
                  .map(([key, label, Icon]) => (
                    <button
                      key={key}
                      onClick={() => go(key)}
                      aria-current={
                        !administration && view === key ? "page" : undefined
                      }
                    >
                      <Icon size={17} />
                      {label}
                    </button>
                  ))}
              </div>
            </details>
          )}
          {management && (
            <button
              onClick={() => go("access")}
              aria-current={
                !administration && view === "access" ? "page" : undefined
              }
            >
              <UsersThree size={18} />
              Akun & hak akses
            </button>
          )}
          {!isParent && (
            <>
              <span className="op-nav-label">PENGELOLAAN</span>
              <button
                onClick={onTools}
                aria-current={administration ? "page" : undefined}
              >
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
              aria-expanded={menu}
              aria-controls="workspace-navigation"
            >
              {menu ? <X /> : <List />}
            </button>
            {isParent && view === "today" && childOptions.length > 1 ? (
              selector()
            ) : (
              <span className="op-crumb">
                <span>{data?.organization.name || "Daycare"}</span>
                <CaretRight size={12} />
                <strong>
                  {administration
                    ? "Administrasi daycare"
                    : view === "access"
                      ? "Akun & hak akses"
                      : nav.find((n) => n[0] === view)?.[1]}
                </strong>
              </span>
            )}
          </div>
          <div className="op-row">
            <WorkspaceSearch
              key={organizationId}
              request={req}
              onChoose={(row) => {
                if (row.type === "child") {
                  setChild(row.id);
                  go("children");
                } else go("crm");
              }}
            />
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
            {["today", "staffToday", "home"].includes(view) && (
              <button
                className="op-btn"
                aria-label="Perbarui"
                disabled={loading || busy}
                onClick={() => void reload()}
              >
                <ArrowClockwise size={16} />
              </button>
            )}
            <span className="op-avatar small">
              {roles[role]?.substring(0, 2).toUpperCase()}
            </span>
          </div>
        </header>
        <main className="op-content">
          <div
            className="op-titlebar"
            hidden={
              Boolean(administration) ||
              ["today", "staffToday", "home"].includes(view)
            }
          >
            <div>
              <span className="op-kicker">
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <div className="op-heading-row">
                <h1>{heading[0]}</h1>
                {!["home", "staffToday", "today"].includes(view) &&
                  process.env.NEXT_PUBLIC_SANDBOX === "true" && (
                    <span className="op-environment">
                      Sandbox · Data contoh
                    </span>
                  )}
              </div>
              <p className="op-muted">{heading[1]}</p>
            </div>
            <div className="op-row wrap">
              {role === "owner" && view === "home" && (
                <>
                  <button
                    className="op-btn primary"
                    onClick={() => go("control")}
                  >
                    Buka Control Tower <ArrowRight size={16} />
                  </button>
                  {businessFilters()}
                </>
              )}
              {[
                "today",
                "story",
                "pickup",
                "children",
                "reports",
                "messages",
                "leo",
              ].includes(view) &&
                view !== "today" &&
                (!management || view !== "leo") &&
                selector()}
              <button
                className="op-btn"
                disabled={loading || busy}
                onClick={() => void reload()}
              >
                <ArrowClockwise size={15} />
                {loading ? "Memuat…" : "Perbarui"}
              </button>
            </div>
          </div>
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
              {administration ? (
                administration
              ) : needsExtra && !extraReady ? (
                <Card
                  title={error ? "Catatan belum tersedia" : "Memuat catatan…"}
                >
                  <p>
                    {error
                      ? "Tekan Perbarui untuk mencoba lagi."
                      : "Mengambil informasi terbaru sesuai izin akun Anda."}
                  </p>
                </Card>
              ) : view === "staffToday" ? (
                staffToday()
              ) : view === "access" && management ? (
                <AccessPanel
                  role={role}
                  request={req}
                  refreshVersion={version.current}
                  onBack={() => go(role === "owner" ? "home" : "control")}
                />
              ) : view === "handoff" ? (
                handoff()
              ) : view === "integrations" ? (
                <VideoIntegration
                  request={req}
                  parent={isParent}
                  childId={childId}
                  classes={classes}
                />
              ) : view === "businessReports" ? (
                businessReports()
              ) : view === "finance" ? (
                <Finance request={req} children={children} />
              ) : view === "subscription" ? (
                <Commercial request={req} />
              ) : view === "planner" ? (
                <div className="op-stack">
                  {isParent && <Finance request={req} family />}
                  <Planner request={req} role={role} />
                </div>
              ) : view === "care" ? (
                care()
              ) : view === "today" ? (
                today()
              ) : view === "home" ? (
                <OwnerSummary
                  request={req}
                  go={go}
                  date={date}
                  branch={branch}
                  refreshVersion={version.current}
                  filters={businessFilters()}
                  onAddChild={() =>
                    setModal({
                      title: "Daftarkan anak",
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
                              name: "birthDate",
                              label: "Tanggal lahir",
                              type: "date",
                              required: false,
                            },
                          ]}
                          onSubmit={(v) =>
                            mutate(() =>
                              req("children", "POST", {
                                name: v.name,
                                classroomId: v.classroomId,
                                ...(v.birthDate
                                  ? { birthDate: v.birthDate }
                                  : {}),
                              }),
                            )
                          }
                        />
                      ),
                    })
                  }
                />
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
      <nav className="v10-mobile-bottom" aria-label="Akses cepat">
        {(isParent
          ? ["today", "story", "pickup", "messages"]
          : role === "caregiver"
            ? ["staffToday", "care", "children", "pickup"]
            : role === "manager"
              ? ["control", "planner", "children", "story"]
              : ["home", "children", "planner", "control"]
        ).map((key) => {
          const item = nav.find((n) => n[0] === key);
          if (!item) return null;
          const Icon = item[2];
          return (
            <button
              key={key}
              aria-current={
                !administration && view === key ? "page" : undefined
              }
              aria-label={`Buka ${item[1]}`}
              onClick={() => go(key)}
            >
              <Icon size={18} />
              <span>
                {(
                  {
                    today: "Hari ini",
                    story: isParent ? "Cerita" : "Review",
                    pickup: "Jemput",
                    messages: "Pesan",
                    staffToday: "Hari ini",
                    care: "Catat",
                    children: "Anak",
                    control: "Prioritas",
                    planner: "Jadwal",
                    home: "Ringkasan",
                  } as Record<string, string>
                )[key] || item[1]}
              </span>
            </button>
          );
        })}
        <button
          aria-expanded={menu}
          aria-controls="workspace-navigation"
          onClick={() => setMenu(!menu)}
        >
          <List size={18} />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
}
function localDateFrom(value: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date(value),
  );
}
function ActivityHistory({
  rows,
  render,
}: {
  rows: Item[];
  render: (rows: Item[], empty?: string) => ReactNode;
}) {
  const [page, setPage] = useState(0);
  const signature = rows.map((r) => r.id).join(",");
  useEffect(() => setPage(0), [signature]);
  const ordered = [...rows].sort(
    (a, b) =>
      Date.parse(b.data.occurredAt || b.created_at) -
      Date.parse(a.data.occurredAt || a.created_at),
  );
  return (
    <>
      {render(ordered.slice(page * 10, page * 10 + 10))}
      {ordered.length > 10 && (
        <div className="op-history-controls">
          <button
            className="op-btn"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Sebelumnya
          </button>
          <small>
            {page * 10 + 1}–{Math.min((page + 1) * 10, ordered.length)} dari{" "}
            {ordered.length}
          </small>
          <button
            className="op-btn"
            disabled={(page + 1) * 10 >= ordered.length}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </button>
        </div>
      )}
    </>
  );
}
function PrivatePhotos({ rows, request }: { rows: Item[]; request: Request }) {
  const [photos, setPhotos] = useState<
      { id: string; url: string; example: boolean; caption: string }[]
    >([]),
    [unavailable, setUnavailable] = useState(false),
    [expanded, setExpanded] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const ids = rows.map((r) => r.id).join(",");
  useEffect(() => {
    let active = true;
    setPhotos([]);
    setExpanded(null);
    setUnavailable(false);
    void Promise.all(
      rows.map(async (r) => {
        try {
          const grant = await request(`media/${r.id}/access`);
          return {
            id: r.id,
            url: grant.url,
            example: r.data.exampleMedia === true,
            caption: r.data.caption || "Foto aktivitas yang dibagikan daycare",
          };
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (active) {
        setPhotos(
          results.filter((r): r is NonNullable<typeof r> => r !== null),
        );
        setUnavailable(results.some((r) => r === null));
      }
    });
    return () => {
      active = false;
    };
  }, [ids]);
  useEffect(() => {
    if (!expanded) return;
    const dialog = dialogRef.current,
      previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, [expanded]);
  if (!rows.length) return null;
  return (
    <>
      <div
        className={"op-private-photos" + (photos.length > 1 ? " gallery" : "")}
      >
        {photos.map((photo) => (
          <figure key={photo.id}>
            <button
              aria-label="Perbesar foto aktivitas"
              onClick={() =>
                void request(`media/${photo.id}/access`)
                  .then((grant) => setExpanded(grant.url))
                  .catch(() => setUnavailable(true))
              }
            >
              <img
                src={photo.url}
                alt={
                  photo.example
                    ? "Contoh fotografi kegiatan anak dari kit desain"
                    : "Foto aktivitas yang dibagikan daycare"
                }
                loading="lazy"
                onError={() => {
                  setPhotos((old) => old.filter((p) => p.id !== photo.id));
                  setUnavailable(true);
                }}
              />
            </button>
            {photo.example && (
              <figcaption>
                Contoh fotografi · bukan foto anak pelanggan
              </figcaption>
            )}
          </figure>
        ))}
        {unavailable && (
          <small>
            Foto belum dapat ditampilkan. Periksa persetujuan foto atau perbarui
            halaman.
          </small>
        )}
      </div>
      {expanded && (
        <dialog
          ref={dialogRef}
          className="op-photo-dialog"
          aria-label="Foto aktivitas"
          onCancel={(event) => {
            event.preventDefault();
            setExpanded(null);
          }}
          onClick={(event) => {
            if (event.target === event.currentTarget) setExpanded(null);
          }}
        >
          <button
            autoFocus
            className="op-btn op-photo-close"
            onClick={() => setExpanded(null)}
          >
            Tutup foto <X size={18} />
          </button>
          <img
            className="op-photo-expanded"
            src={expanded}
            alt="Foto aktivitas diperbesar"
            onError={() => {
              setExpanded(null);
              setUnavailable(true);
            }}
          />
        </dialog>
      )}
    </>
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
