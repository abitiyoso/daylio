"use client";
import { useEffect, useState, useRef } from "react";
import "./workspace.css";
import OperationsWorkspace from "./operations";
import AccessPanel from "./access-panel";
type Row = {
  id: string;
  name?: string;
  user_id?: string;
  role?: string;
  kind?: string;
  state?: string;
  child_id?: string;
  data?: Record<string, any>;
  created_at?: string;
};
type Field = {
  key: string;
  label: string;
  type?: string;
  options?: string[];
  required?: boolean;
};
type Config = {
  title: string;
  endpoint: string;
  fields?: Field[];
  child?: boolean;
  roles: string[];
  actions?: [string, string][];
};
const managers = ["owner", "manager"],
  staff = ["owner", "manager", "caregiver"],
  all = [...staff, "parent"];
const labels: Record<string, string> = {
  children: "Anak aktif",
  present: "Hadir sekarang",
  activities: "Aktivitas tercatat",
  openIncidents: "Insiden terbuka",
  leads: "Prospek",
  enrolled: "Pendaftaran",
  tours: "Survei terkonfirmasi",
  meal: "Makan",
  sleep: "Tidur",
  play: "Bermain",
  learning: "Belajar",
  hygiene: "Kebersihan",
  note: "Catatan",
  in: "Datang",
  out: "Pulang",
  owner: "Pemilik",
  manager: "Pengelola",
  caregiver: "Pengasuh",
  parent: "Wali",
  low: "Rendah",
  medium: "Sedang",
  critical: "Kritis",
  name: "Nama",
  contact: "Kontak",
  source: "Sumber",
  type: "Jenis",
  occurredAt: "Waktu kegiatan",
  expiresAt: "Berlaku hingga",
  relationship: "Hubungan",
  severity: "Urgensi",
  title: "Judul",
  version: "Versi kebijakan",
  scope: "Cakupan",
  granted: "Disetujui",
  hours: "Jam operasional",
  timezone: "Zona waktu",
  dueAt: "Jatuh tempo",
  startsAt: "Mulai",
  endsAt: "Selesai",
  onDuty: "Bertugas",
  amount: "Jumlah",
  currency: "Mata uang",
  lines: "Rincian biaya",
  care: "Perawatan",
  media: "Foto",
  cctv: "CCTV",
  ai: "Bantuan LEO",
  export: "Ekspor",
  delete: "Penghapusan",
  draft: "Draf",
  published: "Terbit",
  requested: "Menunggu konfirmasi",
  approved: "Disetujui",
  revoked: "Dicabut",
  resolved: "Selesai",
  acknowledged: "Diterima",
  paid: "Lunas",
  confirmed: "Terkonfirmasi",
};
function displayValue(value: any): string {
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (Array.isArray(value))
    return value
      .map((v) =>
        v.description
          ? `${v.description}: Rp ${Number(v.amount).toLocaleString("id-ID")}`
          : String(v),
      )
      .join("; ");
  return labels[String(value)] || String(value);
}
const configs: Record<string, Config> = {
  children: {
    title: "Anak",
    endpoint: "children",
    roles: all,
    fields: [
      { key: "name", label: "Nama anak" },
      { key: "classroomId", label: "ID kelas" },
    ],
    actions: [
      ["edit", "Ubah nama"],
      ["archive", "Arsipkan"],
      ["guardian", "Hubungkan wali"],
      ["revokeGuardian", "Cabut akses wali"],
    ],
  },
  activities: {
    title: "Catat aktivitas",
    endpoint: "activities",
    roles: all,
    child: true,
    fields: [
      {
        key: "type",
        label: "Kegiatan",
        options: ["meal", "sleep", "play", "learning", "hygiene", "note"],
      },
      { key: "note", label: "Catatan" },
      { key: "occurredAt", label: "Waktu kegiatan", type: "datetime-local" },
    ],
    actions: [
      ["publish", "Publikasikan"],
      ["photo", "Tambah foto"],
      ["editActivity", "Ubah catatan"],
      ["history", "Riwayat perubahan"],
    ],
  },
  attendance: {
    title: "Kehadiran",
    endpoint: "attendance",
    roles: all,
    child: true,
    fields: [{ key: "type", label: "Kehadiran", options: ["in", "out"] }],
    actions: [["correct", "Koreksi kehadiran"]],
  },
  pickups: {
    title: "Penjemputan",
    endpoint: "pickup-authorizations",
    roles: all,
    child: true,
    fields: [
      { key: "name", label: "Nama penjemput" },
      { key: "relationship", label: "Hubungan" },
      { key: "expiresAt", label: "Berlaku sampai", type: "datetime-local" },
    ],
    actions: [
      ["approve", "Setujui"],
      ["handover", "Verifikasi identitas & serahkan"],
    ],
  },
  incidents: {
    title: "Insiden",
    endpoint: "incidents",
    roles: staff,
    child: true,
    fields: [
      {
        key: "severity",
        label: "Urgensi",
        options: ["low", "medium", "critical"],
      },
      { key: "note", label: "Catatan kejadian" },
    ],
    actions: [
      ["acknowledge", "Tanggapi"],
      ["resolve", "Selesaikan"],
    ],
  },
  leads: {
    title: "Prospek",
    endpoint: "leads",
    roles: managers,
    fields: [
      { key: "name", label: "Nama wali" },
      { key: "contact", label: "Kontak" },
      { key: "source", label: "Sumber" },
    ],
    actions: [
      ["status", "Tandai dihubungi"],
      ["enroll", "Daftarkan anak"],
    ],
  },
  tours: {
    title: "Survei",
    endpoint: "tours",
    roles: managers,
    fields: [
      { key: "leadId", label: "ID prospek" },
      { key: "startsAt", label: "Mulai", type: "datetime-local" },
      { key: "endsAt", label: "Selesai", type: "datetime-local" },
    ],
    actions: [["confirm", "Konfirmasi"]],
  },
  trials: {
    title: "Trial",
    endpoint: "trials",
    roles: managers,
    fields: [
      { key: "leadId", label: "ID prospek" },
      { key: "startsAt", label: "Mulai", type: "datetime-local" },
      { key: "note", label: "Catatan" },
    ],
  },
  followups: {
    title: "Tindak lanjut",
    endpoint: "follow-up-tasks",
    roles: managers,
    fields: [
      { key: "leadId", label: "ID prospek" },
      { key: "dueAt", label: "Jadwal", type: "datetime-local" },
      { key: "note", label: "Tugas" },
    ],
  },
  invitations: {
    title: "Undang anggota",
    endpoint: "invitations",
    roles: managers,
    fields: [
      { key: "email", label: "Email", type: "email" },
      {
        key: "role",
        label: "Peran",
        options: ["caregiver", "parent", "manager"],
      },
      { key: "childId", label: "ID anak (untuk wali)", required: false },
    ],
    actions: [["revoke", "Cabut undangan"]],
  },
  assignments: {
    title: "Penugasan",
    endpoint: "staff-assignments",
    roles: managers,
    fields: [
      { key: "userId", label: "ID pengasuh" },
      { key: "childId", label: "ID anak" },
    ],
    actions: [["delete", "Cabut tugas"]],
  },
  shifts: {
    title: "Jadwal pengasuh",
    endpoint: "shifts",
    roles: staff,
    fields: [
      { key: "userId", label: "ID pengasuh" },
      { key: "startsAt", label: "Mulai", type: "datetime-local" },
      { key: "endsAt", label: "Selesai", type: "datetime-local" },
    ],
  },
  handoffs: {
    title: "Serah terima shift",
    endpoint: "handoffs",
    roles: staff,
    fields: [
      { key: "recipientId", label: "ID penerima" },
      { key: "note", label: "Catatan" },
    ],
    actions: [["acknowledge", "Terima handover"]],
  },
  messages: {
    title: "Pesan",
    endpoint: "messages",
    roles: all,
    child: true,
    fields: [{ key: "note", label: "Pesan" }],
  },
  announcements: {
    title: "Pengumuman",
    endpoint: "announcements",
    roles: all,
    fields: [
      { key: "title", label: "Judul" },
      { key: "note", label: "Isi" },
    ],
    actions: [["publish", "Publikasikan"]],
  },
  consents: {
    title: "Persetujuan",
    endpoint: "consents",
    roles: all,
    child: true,
    fields: [
      {
        key: "scope",
        label: "Cakupan",
        options: ["care", "media", "cctv", "ai"],
      },
      { key: "version", label: "Versi kebijakan" },
    ],
    actions: [["revoke", "Tarik persetujuan"]],
  },
  requests: {
    title: "Permintaan data",
    endpoint: "data-requests",
    roles: all,
    child: true,
    fields: [
      { key: "type", label: "Permintaan", options: ["export", "delete"] },
      { key: "note", label: "Alasan" },
    ],
    actions: [
      ["approve-export", "Setujui ekspor"],
      ["download", "Unduh data"],
    ],
  },
  settings: {
    title: "Pengaturan",
    endpoint: "settings",
    roles: managers,
    fields: [{ key: "hours", label: "Jam operasional" }],
  },
  branches: {
    title: "Cabang",
    endpoint: "branches",
    roles: managers,
    fields: [{ key: "name", label: "Nama cabang" }],
  },
  classrooms: {
    title: "Kelas",
    endpoint: "classrooms",
    roles: managers,
    fields: [
      { key: "name", label: "Nama kelas" },
      { key: "branchId", label: "ID cabang" },
    ],
  },
  instructions: {
    title: "Instruksi perawatan",
    endpoint: "care-instructions",
    roles: staff,
    child: true,
    fields: [{ key: "note", label: "Instruksi" }],
  },
  plans: {
    title: "Biaya daycare",
    endpoint: "fee-plans",
    roles: managers,
    fields: [
      { key: "name", label: "Nama paket" },
      { key: "amount", label: "Biaya IDR", type: "number" },
    ],
  },
  invoices: {
    title: "Tagihan",
    endpoint: "invoices",
    roles: [...managers, "parent"],
    child: true,
    fields: [
      { key: "dueAt", label: "Jatuh tempo", type: "datetime-local" },
      { key: "description", label: "Deskripsi" },
      { key: "amount", label: "Jumlah IDR", type: "number" },
    ],
    actions: [
      ["remind", "Kirim pengingat"],
      ["payment", "Konfirmasi transfer manual"],
    ],
  },
  media: {
    title: "Galeri foto",
    endpoint: "media",
    roles: all,
    actions: [["access", "Lihat foto"]],
  },
  support: {
    title: "Persetujuan dukungan",
    endpoint: "support-access",
    roles: ["owner"],
    actions: [
      ["approve", "Setujui 30 menit"],
      ["revoke", "Cabut akses"],
    ],
  },
  retention: {
    title: "Retensi metadata",
    endpoint: "retention-jobs",
    roles: ["owner"],
    fields: [
      {
        key: "before",
        label: "Hapus sebelum (minimal 30 hari)",
        type: "datetime-local",
      },
      {
        key: "kind",
        label: "Jenis metadata",
        options: ["ai-query", "integration-status"],
      },
    ],
  },
  notifications: {
    title: "Notifikasi",
    endpoint: "notifications",
    roles: all,
    actions: [["read", "Tandai dibaca"]],
  },
  audit: { title: "Jejak audit", endpoint: "audit", roles: managers },
  members: {
    title: "Anggota",
    endpoint: "staff",
    roles: managers,
    actions: [["deactivate", "Nonaktifkan anggota"]],
  },
};
export default function Workspace({
  initialMode = "login",
}: {
  initialMode?: string;
}) {
  const [user, setUser] = useState<any>(null),
    [legacyTools, setLegacyTools] = useState(false),
    [org, setOrg] = useState(""),
    [memberships, setMemberships] = useState<any[]>([]),
    [view, setView] = useState("home"),
    [rows, setRows] = useState<Row[]>([]),
    [children, setChildren] = useState<Row[]>([]),
    [childId, setChild] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(true),
    [overview, setOverview] = useState<any>(null),
    [references, setReferences] = useState<Record<string, any[]>>({}),
    [answer, setAnswer] = useState<any>(null),
    [resetMode, setResetMode] = useState(false),
    [authMode, setAuthMode] = useState(initialMode);
  const [accessOpen, setAccessOpen] = useState(false);
  const config = configs[view];
  const role = user?.role;
  async function api(
    path: string,
    method = "GET",
    body?: any,
    tenant = org,
    key?: string,
  ) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(tenant ? { "x-organization-id": tenant } : {}),
      ...(method === "POST"
        ? { "idempotency-key": key || crypto.randomUUID() }
        : {}),
    };
    const options = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    };
    let res = await fetch("/api/v1/" + path, options);
    if (res.status === 401 && !path.startsWith("auth/")) {
      const refreshed = await fetch("/api/v1/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (refreshed.ok) res = await fetch("/api/v1/" + path, options);
      else setUser(null);
    }
    const json = await res.json();
    if (!res.ok)
      throw Object.assign(
        new Error(json.error?.message || "Permintaan gagal"),
        { status: res.status, code: json.error?.code },
      );
    return json.data ?? json;
  }
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e: any) {
      setMessage(
        navigator.onLine
          ? e.message
          : "Anda sedang offline. Sambungkan internet, lalu coba lagi.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function load(tenant = org) {
    const me = await api("me", "GET", undefined, tenant);
    setUser(me);
    if (managers.includes(me.role)) {
      const [classrooms, branches, members, leads] = await Promise.all(
        ["classrooms", "branches", "staff", "leads"].map((endpoint) =>
          endpoint === "leads" && !me.capabilities.crm
            ? Promise.resolve([])
            : api(endpoint, "GET", undefined, tenant),
        ),
      );
      setReferences({
        classroomId: classrooms,
        branchId: branches,
        userId: members.filter((m: any) => m.role === "caregiver"),
        recipientId: members.filter((m: any) => m.role !== "parent"),
        leadId: leads,
      });
    } else if (me.role === "caregiver") {
      const directory = await api("staff/directory", "GET", undefined, tenant);
      setReferences({ recipientId: directory });
    }
    const list = await api("children", "GET", undefined, tenant);
    setChildren(list);
    if (!list.some((r: Row) => r.id === childId)) setChild(list[0]?.id || "");
  }
  async function session() {
    try {
      const invitation = new URLSearchParams(location.search).get("invitation");
      if (invitation) {
        await api(`invitations/${invitation}/accept`, "POST", {});
        history.replaceState({}, "", "/workspace");
      }
      const list = await api("me/memberships");
      setMemberships(list);
      if (list[0]) {
        setOrg(list[0].organization_id);
        await load(list[0].organization_id);
      } else setUser({ role: "unconfigured" });
    } catch (error: any) {
      setUser(null);
      if (error.status !== 401) setMessage(error.message);
    }
  }
  const initialSession = useRef(false);
  useEffect(() => {
    if (initialSession.current) return;
    initialSession.current = true;
    setResetMode(new URLSearchParams(location.search).get("reset") === "1");
    setLegacyTools(new URLSearchParams(location.search).get("tools") === "1");
    if (new URLSearchParams(location.search).has("authError"))
      setMessage("Tautan verifikasi tidak berlaku. Minta tautan baru.");
    void session().finally(() => setBusy(false));
  }, []);
  async function refresh() {
    setRows([]);
    setAnswer(null);
    if (view === "home") {
      if (managers.includes(role)) setOverview(await api("owner/overview"));
      else if (role === "parent")
        setOverview(
          await api("parent/home" + (childId ? "?childId=" + childId : "")),
        );
      else setRows(await api("children"));
    } else if (config)
      setRows(
        await api(
          config.endpoint +
            (config.child && childId ? "?childId=" + childId : ""),
        ),
      );
  }
  useEffect(() => {
    if (org && user) void run(refresh);
  }, [org, view, childId]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fd = new FormData(form);
    const data: any = Object.fromEntries(fd);
    for (const field of config.fields || []) {
      if (field.type === "datetime-local")
        data[field.key] = new Date(data[field.key]).toISOString();
      if (field.type === "number") data[field.key] = Number(data[field.key]);
      if (data[field.key] === "") delete data[field.key];
    }
    if (["tours", "settings"].includes(view)) data.timezone = "Asia/Jakarta";
    if (view === "shifts") data.onDuty = true;
    if (view === "consents") data.granted = true;
    if (view === "plans") data.currency = "IDR";
    if (view === "invoices") {
      data.lines = [{ description: data.description, amount: data.amount }];
      delete data.description;
      delete data.amount;
    }
    const direct = [
      "children",
      "branches",
      "classrooms",
      "invitations",
      "assignments",
    ].includes(view);
    await run(async () => {
      const result = await api(
        config.endpoint,
        "POST",
        direct ? data : { data, ...(config.child ? { childId } : {}) },
      );
      setMessage(
        result.acceptUrl
          ? "Undangan dibuat. Bagikan tautan: " +
              location.origin +
              result.acceptUrl
          : "Tersimpan.",
      );
      form.reset();
      await load();
      await refresh();
    });
  }
  async function act(row: Row, action: string) {
    await run(async () => {
      let endpoint = `${config.endpoint}/${row.id}/${action}`,
        method = "POST",
        body: any = {};
      if (action === "history") {
        const result = await api(`activities/${row.id}/history`);
        setMessage(
          result.length
            ? result
                .map(
                  (h: any) =>
                    `${h.created_at}: ${h.before_data.data.note} → ${h.after_data.data.note}`,
                )
                .join(" | ")
            : "Belum ada perubahan.",
        );
        return;
      }
      if (action === "correct") {
        const type = prompt("Jenis koreksi: in atau out"),
          reason = prompt("Alasan koreksi");
        if (!type || !reason) return;
        body = { type, reason };
      }
      if (action === "download") {
        const result = await api(`data-requests/${row.id}/download`);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(
          new Blob([result.content], { type: "application/json" }),
        );
        a.download = "daylio-data.json";
        a.click();
        URL.revokeObjectURL(a.href);
        return;
      }
      if (action === "access") {
        const grant = await api(`media/${row.id}/access`);
        window.open(grant.url, "_blank", "noopener,noreferrer");
        return;
      }
      if (action === "photo") {
        const file = await new Promise<File | null>((resolve) => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/jpeg,image/png,image/webp";
          input.onchange = () => resolve(input.files?.[0] || null);
          input.oncancel = () => resolve(null);
          input.click();
        });
        if (!file) return;
        const intent = await api("media/upload-intent", "POST", {
          childId: row.child_id,
          data: { activityId: row.id, mime: file.type, size: file.size },
        });
        const result = await fetch(`/api/v1/media/${intent.id}/content`, {
          method: "PUT",
          headers: { "x-organization-id": org, "Content-Type": file.type },
          body: file,
        });
        if (!result.ok) throw Error("Unggahan foto gagal");
        await api(`media/${intent.id}/attach`, "POST", {});
        setMessage("Foto tersimpan.");
        return;
      }
      if (action === "edit") {
        const name = prompt("Nama anak", row.name);
        if (!name) return;
        endpoint = `children/${row.id}`;
        method = "PATCH";
        body = { name };
      }
      if (action === "editActivity") {
        const note = prompt("Catatan kegiatan", row.data?.note);
        if (!note) return;
        endpoint = `activities/${row.id}`;
        method = "PATCH";
        body = {
          data: {
            type: row.data?.type,
            occurredAt: row.data?.occurredAt,
            ...(row.data?.result ? { result: row.data.result } : {}),
            note,
          },
        };
      }
      if (action === "guardian") {
        const userId = prompt("ID pengguna wali yang telah menerima undangan");
        if (!userId) return;
        endpoint = `children/${row.id}/guardians`;
        body = { userId };
      }
      if (action === "revokeGuardian") {
        const links = await api(`children/${row.id}/guardians`);
        const linkId = prompt(
          "ID tautan wali yang akan dicabut:\n" +
            links.map((l: any) => `${l.id} — ${l.user_id}`).join("\n"),
        );
        if (!linkId) return;
        endpoint = `guardians/${linkId}`;
        method = "DELETE";
      }
      if (action === "delete") {
        endpoint = `${config.endpoint}/${row.id}`;
        method = "DELETE";
      }
      if (action === "status") body = { status: "contacted" };
      if (["acknowledge", "resolve"].includes(action) && view === "incidents") {
        const note = prompt("Catatan tanggapan");
        if (!note) return;
        body = { note };
      }
      if (action === "handover") {
        const verifiedPersonName = prompt(
            "Nama orang yang hadir (harus sesuai izin penjemput)",
          ),
          identityNote = prompt(
            "Catatan pemeriksaan identitas fisik (minimal 8 karakter)",
          );
        if (!verifiedPersonName || !identityNote) return;
        if (
          !confirm(
            "Identitas penjemput telah diperiksa secara langsung dan cocok dengan izin?",
          )
        )
          return;
        endpoint = `pickups/${row.id}/verify-handover`;
        body = {
          verifiedPersonName,
          identityNote,
          verificationMethod: "physical-id",
          handoverConfirmed: true,
        };
      }
      if (action === "payment") {
        const reference = prompt("Referensi transfer yang sudah diverifikasi");
        if (!reference || !confirm("Konfirmasi dana sudah diterima?")) return;
        endpoint = `invoices/${row.id}/record-manual-payment`;
        body = { reference, confirmed: true };
      }
      if (action === "enroll") {
        const name = prompt("Nama anak"),
          classroomId = prompt("ID kelas"),
          email = prompt("Email wali");
        if (!name || !classroomId || !email) return;
        const packageName = prompt("Paket yang disepakati"),
          packagePrice = Number(prompt("Harga paket disepakati (Rp)")),
          emergencyName = prompt("Nama kontak darurat"),
          emergencyPhone = prompt("Telepon darurat");
        if (
          !packageName ||
          !packagePrice ||
          !emergencyName ||
          !emergencyPhone ||
          !confirm(
            "Slot, harga paket dan kontak darurat sudah dikonfirmasi wali?",
          )
        )
          return;
        body = {
          name,
          classroomId,
          email,
          packageName,
          packagePrice,
          emergencyName,
          emergencyPhone,
          confirmed: true,
        };
      }
      if (action === "read") method = "PATCH";
      if (action === "deactivate") {
        endpoint = `staff/${row.user_id}`;
        method = "PATCH";
        body = { role: row.role, active: false };
      }
      const result = await api(endpoint, method, body);
      setMessage(
        result.invitation
          ? "Anak terdaftar. Undangan: " +
              location.origin +
              result.invitation.acceptUrl
          : "Perubahan tersimpan.",
      );
      await refresh();
    });
  }
  if (user && resetMode)
    return (
      <main className="workspace auth">
        <h1>Atur kata sandi baru</h1>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const fd = new FormData(event.currentTarget);
            void run(async () => {
              if (fd.get("password") !== fd.get("confirmation"))
                throw Error("Kedua kata sandi harus sama.");
              await api("auth/password", "POST", {
                password: fd.get("password"),
              });
              history.replaceState({}, "", "/workspace");
              setResetMode(false);
              setMessage("Kata sandi diperbarui.");
            });
          }}
        >
          <label>
            Kata sandi baru
            <input
              type="password"
              name="password"
              minLength={12}
              required
              autoComplete="new-password"
            />
          </label>
          <label>
            Ulangi kata sandi
            <input
              type="password"
              name="confirmation"
              minLength={12}
              required
              autoComplete="new-password"
            />
          </label>
          <button disabled={busy}>Simpan kata sandi</button>
        </form>
        <p role="status">{message}</p>
      </main>
    );
  if (!user)
    return (
      <main className="workspace auth">
        <a href="/" className="wordmark">
          Daylio <small>by Elenio</small>
        </a>
        <h1>
          {authMode === "recover"
            ? "Pulihkan kata sandi"
            : authMode === "signup"
              ? "Daftarkan daycare Anda"
              : "Selamat datang"}
        </h1>
        <p>
          {authMode === "signup"
            ? "Buat akun pemilik, verifikasi email, lalu siapkan organisasi dan cabang Anda."
            : "Masuk ke akun Daylio Anda untuk membuka dashboard sesuai hak akses."}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const d = Object.fromEntries(new FormData(e.currentTarget));
            void run(async () => {
              const result = await api("auth/" + authMode, "POST", d);
              setMessage(
                result.verificationRequired
                  ? "Periksa email untuk verifikasi akun."
                  : "Permintaan diterima.",
              );
              await session();
            });
          }}
        >
          <label>
            Email
            <input name="email" type="email" required />
          </label>
          {authMode !== "recover" && (
            <label>
              Kata sandi
              <input
                name="password"
                type="password"
                minLength={12}
                required
                autoComplete={
                  authMode === "signup" ? "new-password" : "current-password"
                }
              />
            </label>
          )}
          <button disabled={busy}>
            {busy
              ? "Memproses…"
              : authMode === "recover"
                ? "Kirim pemulihan"
                : authMode === "signup"
                  ? "Daftar & verifikasi email"
                  : "Masuk"}
          </button>
        </form>
        <div className="actions">
          {(authMode === "login" ? ["recover"] : ["login"]).map((mode) => (
            <button
              className="secondary"
              key={mode}
              onClick={() => setAuthMode(mode)}
            >
              {
                { login: "Masuk", signup: "Buat akun", recover: "Lupa sandi" }[
                  mode
                ]
              }
            </button>
          ))}
        </div>
        <aside className="auth-invitation">
          <strong>Belum memiliki akses?</strong>
          <p>
            Admin daycare mengundang Anda melalui email dan menentukan peran.
            Buka tautan pada email tersebut untuk verifikasi, lalu buat kata
            sandi pribadi.
          </p>
        </aside>
        {authMode === "login" && (
          <p>
            Pemilik daycare baru? <a href="/register">Daftarkan daycare</a>
          </p>
        )}
        <a href="/">← Kembali ke beranda</a>
        <p role="status">{message}</p>
      </main>
    );
  if (user.role === "unconfigured")
    return (
      <main className="workspace auth">
        <h1>Siapkan daycare Anda</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = new FormData(e.currentTarget).get("name");
            void run(async () => {
              await api("organizations", "POST", { name });
              await session();
            });
          }}
        >
          <label>
            Nama daycare
            <input name="name" required />
          </label>
          <button disabled={busy}>Buat daycare & cabang</button>
        </form>
        <button
          className="secondary"
          onClick={() =>
            void run(async () => {
              const token = new URLSearchParams(location.search).get(
                "invitation",
              );
              if (!token) throw Error("Buka tautan undangan dari pengelola.");
              await api(`invitations/${token}/accept`, "POST", {});
              await session();
            })
          }
        >
          Terima undangan
        </button>
        <a href="/platform">Administrasi platform</a>
        <button
          onClick={() =>
            void run(async () => {
              await api("auth/logout", "POST", {});
              setUser(null);
            })
          }
        >
          Keluar
        </button>
        <p role="status">{message}</p>
      </main>
    );
  if (accessOpen && managers.includes(role))
    return (
      <AccessPanel
        role={role}
        request={(path, method, body) => api(path, method, body)}
        onBack={() => setAccessOpen(false)}
      />
    );
  if (!legacyTools)
    return (
      <OperationsWorkspace
        user={user}
        organizationId={org}
        memberships={memberships}
        request={(path, method, body, key) => api(path, method, body, org, key)}
        onAccess={() => setAccessOpen(true)}
        onTools={() => setLegacyTools(true)}
        onLogout={async () => {
          await api("auth/logout", "POST", {});
          setUser(null);
        }}
        onOrganization={async (tenant) => {
          setOrg(tenant);
          await load(tenant);
        }}
      />
    );
  const readOnly =
    (view === "consents" && role !== "parent") ||
    (role === "parent" &&
      !["messages", "pickups", "consents", "requests"].includes(view)) ||
    (role === "caregiver" &&
      ["children", "shifts", "announcements"].includes(view));
  return (
    <div className="workspace">
      <header>
        <button onClick={() => setLegacyTools(false)}>
          Kembali ke dashboard
        </button>
        <a href="/" className="wordmark">
          Daylio <small>by Elenio</small>
        </a>
        <select
          aria-label="Daycare aktif"
          value={org}
          onChange={(e) => {
            const id = e.target.value;
            setOrg(id);
            setView("home");
            void run(() => load(id));
          }}
        >
          {memberships.map((m) => (
            <option key={m.organization_id} value={m.organization_id}>
              {m.name}
            </option>
          ))}
        </select>
        <span>{role}</span>
        <button
          className="secondary"
          onClick={() =>
            void run(async () => {
              await api("auth/logout", "POST", {});
              setUser(null);
            })
          }
        >
          Keluar
        </button>
      </header>
      {process.env.NEXT_PUBLIC_SANDBOX === "true" && (
        <p
          style={{
            margin: 0,
            padding: 12,
            background: "#fff0bd",
            textAlign: "center",
          }}
        >
          SANDBOX · Hanya data sintetis. Kamera dan provider LEO tidak
          terhubung.
        </p>
      )}
      <div className="workspace-layout">
        <nav aria-label="Menu aplikasi">
          <button onClick={() => setView("home")}>
            {role === "parent"
              ? "Beranda"
              : role === "caregiver"
                ? "Anak"
                : "Ringkasan"}
          </button>
          {(role === "parent"
            ? ["activities", "leo"]
            : role === "caregiver"
              ? ["activities", "messages"]
              : ["children", "leads"]
          ).map((key) => (
            <button
              key={key}
              aria-current={view === key ? "page" : undefined}
              onClick={() => setView(key)}
            >
              {key === "activities" && role === "parent"
                ? "Aktivitas"
                : configs[key]?.title || "Tanya LEO"}
            </button>
          ))}
          <button onClick={() => setView("more")}>Lainnya</button>
        </nav>
        <main>
          <div className="page-title">
            <div>
              <small>
                {new Date().toLocaleDateString("id-ID", {
                  dateStyle: "full",
                  timeZone: "Asia/Jakarta",
                })}
              </small>
              <h1>
                {config?.title ||
                  {
                    home: "Kabar daycare hari ini",
                    leo: "Tanya LEO",
                    cctv: "CCTV area bersama",
                  }[view]}
              </h1>
            </div>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => void run(refresh)}
            >
              Muat ulang
            </button>
          </div>
          <p role="status" aria-live="polite">
            {busy ? "Memuat…" : message}
          </p>
          {children.length > 0 && (
            <label>
              Anak aktif
              <select
                value={childId}
                onChange={(e) => setChild(e.target.value)}
              >
                {children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {view === "more" && (
            <section>
              <h2>Layanan daycare</h2>
              <div className="actions">
                {Object.entries(configs)
                  .filter(([, c]) => c.roles.includes(role))
                  .map(([key, c]) => (
                    <button key={key} onClick={() => setView(key)}>
                      {c.title}
                    </button>
                  ))}
                <button onClick={() => setView("cctv")}>CCTV</button>
                <button onClick={() => setView("leo")}>Tanya LEO</button>
                <a href="/platform">Administrasi platform</a>
                <button
                  onClick={() =>
                    void run(async () => {
                      const password = prompt(
                        "Kata sandi baru (minimal 12 karakter)",
                      );
                      if (!password) return;
                      await api("auth/password", "POST", { password });
                      setMessage("Kata sandi diperbarui.");
                    })
                  }
                >
                  Ubah kata sandi
                </button>
                <button
                  onClick={() =>
                    void run(async () => {
                      const token = new URLSearchParams(location.search).get(
                        "invitation",
                      );
                      if (!token)
                        throw Error("Buka tautan undangan pengelola.");
                      await api(`invitations/${token}/accept`, "POST", {});
                      await session();
                    })
                  }
                >
                  Terima undangan
                </button>
              </div>
            </section>
          )}
          {view === "home" && (
            <>
              <div className="cards">
                {overview &&
                  managers.includes(role) &&
                  Object.entries(overview)
                    .filter(([key]) => key !== "date")
                    .map(([key, value]) => (
                      <article key={key}>
                        <small>{labels[key] || key}</small>
                        <strong>{String(value)}</strong>
                      </article>
                    ))}
              </div>
              {role === "owner" && (
                <section>
                  <h2>Langkah awal</h2>
                  <p>
                    Buat kelas, daftarkan anak, undang wali dan pengasuh, lalu
                    atur penugasan.
                  </p>
                  <button onClick={() => setView("classrooms")}>
                    Siapkan kelas
                  </button>
                  <button
                    className="secondary"
                    onClick={() =>
                      void run(async () => {
                        const r = await api("reports/operations");
                        const a = document.createElement("a");
                        a.href = URL.createObjectURL(
                          new Blob([r.content], { type: "text/csv" }),
                        );
                        a.download = "daylio-operations.csv";
                        a.click();
                        URL.revokeObjectURL(a.href);
                      })
                    }
                  >
                    Unduh laporan CSV
                  </button>
                </section>
              )}
              {role === "parent" && (
                <section>
                  <h2>Aktivitas anak</h2>
                  {overview?.timeline?.length ? (
                    overview.timeline.map((r: Row) => (
                      <article key={r.id}>
                        <b>
                          {r.kind === "media"
                            ? "Foto kegiatan"
                            : r.kind === "incident-update"
                              ? "Kabar dari pengelola"
                              : (
                                  {
                                    meal: "Makan",
                                    sleep: "Tidur",
                                    play: "Bermain",
                                    in: "Datang",
                                    out: "Pulang",
                                  } as Record<string, string>
                                )[r.data?.type] || r.data?.type}
                        </b>
                        <p>{r.data?.note}</p>
                        {r.kind === "media" && (
                          <button
                            onClick={() =>
                              void run(async () => {
                                const grant = await api(`media/${r.id}/access`);
                                window.open(
                                  grant.url,
                                  "_blank",
                                  "noopener,noreferrer",
                                );
                              })
                            }
                          >
                            Lihat foto
                          </button>
                        )}
                        <small>
                          {r.created_at &&
                            new Date(r.created_at).toLocaleString("id-ID", {
                              timeZone: "Asia/Jakarta",
                            })}
                        </small>
                      </article>
                    ))
                  ) : (
                    <p>Belum ada catatan yang dipublikasikan.</p>
                  )}
                </section>
              )}
            </>
          )}
          {view === "home" && managers.includes(role) && (
            <section>
              <h2>Laporan operasional</h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const format =
                    (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
                      "value",
                    ) || "csv";
                  const params = new URLSearchParams();
                  for (const key of ["from", "to", "branchId"]) {
                    const value = String(fd.get(key) || "");
                    if (value) params.set(key, value);
                  }
                  params.set("format", format);
                  void run(async () => {
                    const r = await api("reports/operations?" + params);
                    const content =
                      r.encoding === "base64"
                        ? Uint8Array.from(atob(r.content), (c) =>
                            c.charCodeAt(0),
                          )
                        : r.content;
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(
                      new Blob([content], {
                        type: format === "pdf" ? "application/pdf" : "text/csv",
                      }),
                    );
                    a.download = "daylio-operations." + format;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  });
                }}
              >
                <label>
                  Dari tanggal
                  <input name="from" type="date" required />
                </label>
                <label>
                  Sampai tanggal
                  <input name="to" type="date" required />
                </label>
                <label>
                  ID cabang (opsional)
                  <input name="branchId" />
                </label>
                <div className="actions">
                  <button name="format" value="csv" disabled={busy}>
                    Unduh CSV
                  </button>
                  <button name="format" value="pdf" disabled={busy}>
                    Unduh PDF
                  </button>
                </div>
              </form>
              <p>
                <a href={"/enroll/" + org}>
                  Tautan minat pendaftaran untuk calon wali →
                </a>
              </p>
            </section>
          )}
          {view === "leo" && (
            <section>
              <p>
                Jawaban bersumber dari catatan yang diizinkan. Informasi yang
                belum dicatat akan dinyatakan belum tersedia.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const question = new FormData(e.currentTarget).get(
                    "question",
                  );
                  void run(async () =>
                    setAnswer(
                      await api(
                        `leo/${role === "parent" ? "parent" : "owner"}/query`,
                        "POST",
                        { question, childId },
                      ),
                    ),
                  );
                }}
              >
                <label>
                  Pertanyaan
                  <input
                    name="question"
                    required
                    placeholder="Sudah makan hari ini?"
                  />
                </label>
                <button disabled={busy || role === "caregiver"}>Tanya</button>
              </form>
              {answer && (
                <article>
                  <pre>
                    {answer.answer || JSON.stringify(answer.metrics, null, 2)}
                  </pre>
                  {answer.sources?.map((s: any) => (
                    <p key={s.id}>
                      <time>{s.time}</time> · {s.type}
                      <small>{s.id}</small>
                    </p>
                  ))}
                </article>
              )}
            </section>
          )}
          {view === "cctv" && (
            <section>
              <h2>Akses kamera</h2>
              <p>
                Tayangan tidak tersedia sampai layanan kamera dan izin area
                bersama terverifikasi.
              </p>
              <button
                disabled={busy || !childId}
                onClick={() =>
                  void run(async () => {
                    await api("cameras/authorized?childId=" + childId);
                  })
                }
              >
                Periksa ketersediaan
              </button>
            </section>
          )}
          {view === "activities" && staff.includes(role) && (
            <section>
              <details>
                <summary>Catat untuk beberapa anak</summary>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget,
                      fd = new FormData(form);
                    const ids = fd.getAll("batchChild") as string[];
                    const exceptions = Object.fromEntries(
                      ids
                        .filter((id) => fd.get("exception-" + id))
                        .map((id) => [id, { note: fd.get("exception-" + id) }]),
                    );
                    void run(async () => {
                      await api("activities/batch", "POST", {
                        childIds: ids,
                        data: {
                          type: fd.get("batchType"),
                          note: fd.get("batchNote"),
                          occurredAt: new Date().toISOString(),
                        },
                        exceptions,
                      });
                      setMessage(
                        "Catatan kelompok tersimpan sebagai draf per anak.",
                      );
                      form.reset();
                      await refresh();
                    });
                  }}
                >
                  <label>
                    Jenis kegiatan kelompok
                    <select name="batchType">
                      <option value="meal">Makan</option>
                      <option value="sleep">Tidur</option>
                      <option value="play">Bermain</option>
                      <option value="hygiene">Kebersihan</option>
                    </select>
                  </label>
                  <label>
                    Catatan kelompok
                    <input name="batchNote" required />
                  </label>
                  {children.map((c) => (
                    <div key={c.id}>
                      <label>
                        <input
                          type="checkbox"
                          name="batchChild"
                          value={c.id}
                          style={{ width: "auto", display: "inline" }}
                        />{" "}
                        {c.name}
                      </label>
                      <label>
                        Catatan khusus {c.name}
                        <input name={"exception-" + c.id} />
                      </label>
                    </div>
                  ))}
                  <button disabled={busy}>Simpan catatan kelompok</button>
                </form>
              </details>
            </section>
          )}
          {config?.fields && !readOnly && (
            <section>
              <h2>Tambah {config.title.toLowerCase()}</h2>
              {view === "incidents" && (
                <p>
                  Insiden kritis: segera hubungi penanggung jawab sesuai SOP
                  daycare.
                </p>
              )}
              <form onSubmit={submit}>
                {config.fields.map((f) => (
                  <label key={f.key}>
                    {f.label}
                    {references[f.key] ? (
                      <select name={f.key} required={f.required !== false}>
                        <option value="">Pilih {f.label.toLowerCase()}</option>
                        {references[f.key].map((r: any) => (
                          <option key={r.id} value={r.user_id || r.id}>
                            {r.name ||
                              r.display_name ||
                              r.data?.name ||
                              r.role + " " + (r.user_id || r.id).slice(0, 8)}
                          </option>
                        ))}
                      </select>
                    ) : f.options ? (
                      <select name={f.key}>
                        {f.options.map((v) => (
                          <option key={v} value={v}>
                            {labels[v] || v}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        name={f.key}
                        type={f.type || "text"}
                        required={f.required !== false}
                      />
                    )}
                  </label>
                ))}
                <button disabled={busy || (!!config.child && !childId)}>
                  Simpan
                </button>
              </form>
            </section>
          )}
          {config && (
            <section>
              <h2>Data tersimpan</h2>
              {rows.length === 0 && !busy ? (
                <p>Belum ada data. Catatan akan muncul setelah tersimpan.</p>
              ) : (
                rows.map((row) => (
                  <article key={row.id}>
                    <h3>{row.name || config.title}</h3>
                    {managers.includes(role) && (
                      <details>
                        <summary>ID catatan</summary>
                        <small className="identifier">{row.id}</small>
                      </details>
                    )}
                    <p>{labels[row.state || ""] || row.state}</p>
                    {row.data &&
                      Object.entries(row.data)
                        .filter(
                          ([key]) =>
                            ![
                              "prospectTokenHash",
                              "fingerprint",
                              "website",
                              "audience",
                              "uploaded",
                            ].includes(key),
                        )
                        .map(([key, value]) => (
                          <p key={key}>
                            <b>{labels[key] || key}: </b>
                            {displayValue(value)}
                          </p>
                        ))}
                    {row.user_id && <p>ID pengguna: {row.user_id}</p>}
                    <div className="actions">
                      {config.actions
                        ?.filter(
                          ([a]) =>
                            !(
                              role === "parent" &&
                              ![
                                "revoke",
                                "read",
                                "access",
                                "download",
                              ].includes(a)
                            ) &&
                            !(
                              role === "caregiver" &&
                              [
                                "approve",
                                "resolve",
                                "edit",
                                "archive",
                                "guardian",
                                "revokeGuardian",
                                "history",
                                "correct",
                              ].includes(a)
                            ),
                        )
                        .map(([a, label]) => (
                          <button
                            className="secondary"
                            disabled={busy}
                            key={a}
                            onClick={() => void act(row, a)}
                          >
                            {label}
                          </button>
                        ))}
                    </div>
                  </article>
                ))
              )}
            </section>
          )}
        </main>
      </div>
      <footer>
        Daylio by{" "}
        <img src="/marketing/assets/elenio-official.png" alt="ELENIO" />
      </footer>
    </div>
  );
}
