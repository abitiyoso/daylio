"use client";
import { useEffect, useState } from "react";
type Request = (path: string, method?: string, body?: any) => Promise<any>;
export default function AccessPanel({
  role,
  request,
  onBack,
}: {
  role: string;
  request: Request;
  onBack: () => void;
}) {
  const [invitations, setInvitations] = useState<any[]>([]),
    [members, setMembers] = useState<any[]>([]),
    [children, setChildren] = useState<any[]>([]);
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
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
    void load().catch((error) => setMessage(error.message));
  }, []);
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await work();
      await load();
    } catch (error: any) {
      setMessage(error.message);
      await load().catch(() => {});
    } finally {
      setBusy(false);
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
    <main className="workspace access-panel">
      <button className="secondary" onClick={onBack}>
        ← Kembali ke dashboard
      </button>
      <h1>Akun & hak akses</h1>
      <p>
        Undang melalui email. Hak akses aktif setelah penerima memverifikasi
        email. Kata sandi dibuat sendiri oleh penerima.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = Object.fromEntries(new FormData(form));
          if (!data.childId) delete data.childId;
          void run(async () => {
            const invitation = await request("invitations", "POST", data);
            form.reset();
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
          <select aria-label="Hak akses" id="invite-role" name="role">
            <option value="caregiver">Pengasuh — anak yang ditugaskan</option>
            <option value="parent">Orang tua — anak yang dihubungkan</option>
            {role === "owner" && (
              <option value="manager">Pengelola — operasional daycare</option>
            )}
          </select>
        </label>
        <label htmlFor="invite-child">
          Anak untuk akses orang tua
          <select
            aria-label="Anak untuk akses orang tua"
            id="invite-child"
            name="childId"
          >
            <option value="">Pilih anak (wajib untuk orang tua)</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </select>
        </label>
        <button disabled={busy}>Kirim undangan email</button>
      </form>
      <p role="status" aria-live="polite">
        {message}
      </p>
      <h2>Undangan</h2>
      <div className="access-list">
        {invitations.map((invitation) => (
          <article key={invitation.id}>
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
            {!invitation.accepted_by &&
              !invitation.revoked_at &&
              (role === "owner" || invitation.role !== "manager") && (
                <>
                  <button
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
                    className="secondary"
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
                </>
              )}
          </article>
        ))}
        {!invitations.length && <p>Belum ada undangan.</p>}
      </div>
      <h2>Anggota aktif</h2>
      <div className="access-list">
        {members.map((member) => (
          <article key={member.user_id}>
            <strong>{member.display_name || member.user_id}</strong>
            <p>
              {roleName[member.role]} ·{" "}
              {member.active === false ? "Nonaktif" : "Aktif"}
            </p>
            {role === "owner" && member.role !== "owner" && (
              <button
                disabled={busy}
                className="secondary"
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
    </main>
  );
}
