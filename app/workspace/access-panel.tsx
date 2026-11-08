"use client";
import { useEffect, useRef, useState } from "react";
type Request = (path: string, method?: string, body?: any) => Promise<any>;
export default function AccessPanel({
  role,
  request,
  onBack,
  refreshVersion,
}: {
  role: string;
  request: Request;
  onBack: () => void;
  refreshVersion?: number;
}) {
  const [invitations, setInvitations] = useState<any[]>([]),
    [members, setMembers] = useState<any[]>([]),
    [children, setChildren] = useState<any[]>([]);
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [inviteRole, setInviteRole] = useState("caregiver");
  const pending = useRef(false);
  async function load() {
    const [invites, staff, kids] = await Promise.all([
      request("invitations"),
      request("staff"),
      request("children"),
    ]);
    setInvitations(invites);
    setMembers(staff);
    setChildren(kids);
  }
  useEffect(() => {
    setLoading(true);
    setError("");
    void load()
      .catch((error) => setError(error.message))
      .finally(() => setLoading(false));
  }, [refreshVersion]);
  async function run(work: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await work();
      await load();
    } catch (error: any) {
      setError(error.message);
      await load().catch(() => {});
    } finally {
      setBusy(false);
      pending.current = false;
    }
  }
  async function send(invitation: any) {
    const token = new URL(
      invitation.acceptUrl,
      location.origin,
    ).searchParams.get("invitation");
    await request(`invitations/${invitation.id}/email`, "POST", { token });
    setMessage(
      "Permintaan email verifikasi diterima layanan email. Penerima harus membuka tautan untuk mengaktifkan akses. Periksa inbox dan spam.",
    );
  }
  const roleName: Record<string, string> = {
    owner: "Pemilik",
    manager: "Pengelola",
    caregiver: "Pengasuh",
    parent: "Orang tua",
  };
  return (
    <div className="op-access op-stack" aria-busy={loading || busy}>
      <div className="op-row">
        <button className="op-btn" onClick={onBack}>
          ← Kembali ke dashboard
        </button>
      </div>
      <div className="op-columns">
        <section className="op-card">
          <h2>Undang anggota</h2>
          <p className="op-muted">
            Undang melalui email. Hak akses aktif setelah penerima memverifikasi
            email. Kata sandi dibuat sendiri oleh penerima.
          </p>
          <form
            className="op-form"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = Object.fromEntries(new FormData(form));
              if (data.role !== "parent" || !data.childId) delete data.childId;
              void run(async () => {
                const invitation = await request("invitations", "POST", data);
                form.reset();
                setInviteRole("caregiver");
                await send(invitation);
              });
            }}
          >
            <label>
              Email penerima
              <input required name="email" type="email" autoComplete="email" />
            </label>
            <label htmlFor="invite-role">
              Hak akses
              <select
                aria-label="Hak akses"
                id="invite-role"
                name="role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="caregiver">
                  Pengasuh — anak yang ditugaskan
                </option>
                <option value="parent">
                  Orang tua — anak yang dihubungkan
                </option>
                {role === "owner" && (
                  <option value="manager">
                    Pengelola — operasional daycare
                  </option>
                )}
              </select>
            </label>
            {inviteRole === "parent" && (
              <label htmlFor="invite-child">
                Anak untuk akses orang tua
                <select
                  aria-label="Anak untuk akses orang tua"
                  id="invite-child"
                  name="childId"
                  required
                >
                  <option value="">Pilih anak (wajib untuk orang tua)</option>
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {inviteRole === "caregiver" && (
              <p className="op-access-help">
                Penugasan anak atau kelas diatur oleh pengelola setelah pengasuh
                menerima undangan.
              </p>
            )}
            <button className="op-btn primary" disabled={busy || loading}>
              {busy ? "Memproses undangan…" : "Kirim undangan email"}
            </button>
          </form>
          {error && (
            <p role="alert" className="op-alert">
              {error}
            </p>
          )}
          {message && (
            <p role="status" aria-live="polite" className="op-notice">
              {message}
            </p>
          )}
        </section>
        <section className="op-card op-access-policy">
          <h2>Akses mengikuti peran</h2>
          <p>Setiap anggota memakai akun dan kata sandinya sendiri.</p>
          <dl className="op-facts">
            <div>
              <dt>Pengelola</dt>
              <dd>Mengelola operasional dan review daycare.</dd>
            </div>
            <div>
              <dt>Pengasuh</dt>
              <dd>Mencatat perawatan anak yang ditugaskan.</dd>
            </div>
            <div>
              <dt>Orang tua</dt>
              <dd>Melihat informasi anak yang dihubungkan saja.</dd>
            </div>
          </dl>
          <p className="op-access-help">
            Undangan belum memberikan akses. Penerima harus memverifikasi email
            dan menyelesaikan aktivasi.
          </p>
        </section>
      </div>
      {loading && <p role="status">Memuat anggota dan undangan…</p>}
      <section className="op-card">
        <div className="op-section-head">
          <h2>Undangan</h2>
          <span className="op-badge">{invitations.length}</span>
        </div>
        <div className="op-access-list">
          {invitations.map((invitation) => (
            <article
              className="op-list-item op-access-member"
              key={invitation.id}
            >
              <div className="op-grow">
                <strong>{invitation.email}</strong>
                <p>
                  {roleName[invitation.role]} ·{" "}
                  {invitation.revoked_at
                    ? "Dicabut"
                    : invitation.accepted_by
                      ? "Diterima"
                      : Date.parse(invitation.expires_at) < Date.now()
                        ? "Kedaluwarsa"
                        : "Menunggu verifikasi"}
                </p>
              </div>
              {!invitation.accepted_by &&
                !invitation.revoked_at &&
                (role === "owner" || invitation.role !== "manager") && (
                  <div className="op-row wrap">
                    <button
                      className="op-btn"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          const replacement = await request(
                            `invitations/${invitation.id}/resend`,
                            "POST",
                            {},
                          );
                          await send(replacement);
                        })
                      }
                    >
                      Kirim ulang email
                    </button>
                    <button
                      className="op-btn"
                      disabled={busy}
                      onClick={() =>
                        void run(async () => {
                          await request(
                            `invitations/${invitation.id}/revoke`,
                            "POST",
                            {},
                          );
                          setMessage("Undangan dicabut.");
                        })
                      }
                    >
                      Cabut undangan
                    </button>
                  </div>
                )}
            </article>
          ))}
          {!loading && !invitations.length && (
            <p className="op-muted">
              Belum ada undangan. Undang anggota melalui formulir di atas.
            </p>
          )}
        </div>
      </section>
      <section className="op-card">
        <div className="op-section-head">
          <h2>Anggota daycare</h2>
          <span className="op-badge">
            {members.filter((m) => m.active !== false).length} aktif
          </span>
        </div>
        <div className="op-access-list">
          {members.map((member) => (
            <article
              className="op-list-item op-access-member"
              key={member.user_id}
            >
              <span className="op-avatar small" aria-hidden="true">
                {(member.display_name || "Anggota")
                  .split(" ")
                  .map((s: string) => s[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div className="op-grow">
                <strong>{member.display_name || "Anggota daycare"}</strong>
                <p>
                  {roleName[member.role]} ·{" "}
                  {member.active === false ? "Nonaktif" : "Aktif"}
                </p>
              </div>
              {role === "owner" && member.role !== "owner" && (
                <button
                  disabled={busy}
                  className="op-btn"
                  onClick={() =>
                    void run(async () => {
                      await request(`staff/${member.user_id}`, "PATCH", {
                        role: member.role,
                        active: member.active === false,
                      });
                      setMessage("Akses anggota diperbarui.");
                    })
                  }
                >
                  {member.active === false
                    ? "Aktifkan akses"
                    : "Nonaktifkan akses"}
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
