"use client";
import { use, useState } from "react";
import "../../workspace/workspace.css";
export default function Inquiry({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = use(params);
  const [lead, setLead] = useState<any>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data: any = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setMessage("");
    try {
      const type = lead ? "tours" : "inquiries";
      if (lead) {
        data.leadId = lead.id;
        data.prospectToken = lead.prospectToken;
        data.startsAt = new Date(data.startsAt).toISOString();
        data.endsAt = new Date(data.endsAt).toISOString();
      } else data.consent = data.consent === "on";
      const r = await fetch(`/api/v1/public/${type}/${organizationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await r.json();
      if (!r.ok) throw Error(json.error?.message || "Permintaan gagal");
      if (!lead && json.data.prospectToken) {
        setLead(json.data);
        setMessage(
          "Minat pendaftaran tersimpan. Anda dapat meminta jadwal survei.",
        );
      } else
        setMessage(
          lead
            ? "Permintaan survei tersimpan. Jadwal menunggu konfirmasi daycare."
            : "Kontak sudah tercatat. Silakan tunggu tindak lanjut daycare.",
        );
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="workspace auth">
      <a className="wordmark" href="/">
        Daylio <small>by Elenio</small>
      </a>
      <h1>{lead ? "Minta jadwal survei" : "Kenali daycare lebih dekat"}</h1>
      <p>
        {lead
          ? "Waktu ditampilkan sesuai zona perangkat Anda. Daycare menerima jadwal dalam Asia/Jakarta."
          : "Kirim minat pendaftaran agar tim daycare dapat menghubungi Anda."}
      </p>
      <form onSubmit={submit}>
        {lead ? (
          <>
            <label>
              Mulai survei
              <input name="startsAt" type="datetime-local" required />
            </label>
            <label>
              Selesai survei
              <input name="endsAt" type="datetime-local" required />
            </label>
          </>
        ) : (
          <>
            <label>
              Nama wali
              <input name="name" required maxLength={160} />
            </label>
            <label>
              Email atau WhatsApp
              <input name="contact" required maxLength={160} />
            </label>
            <label>
              <input
                type="checkbox"
                name="consent"
                required
                style={{ width: "auto" }}
              />{" "}
              Saya setuju dihubungi daycare untuk pendaftaran.
            </label>
            <label hidden>
              Website
              <input name="website" tabIndex={-1} />
            </label>
          </>
        )}
        <button disabled={busy}>
          {busy ? "Menyimpan…" : lead ? "Minta survei" : "Kirim minat"}
        </button>
      </form>
      <p role="status">{message}</p>
    </main>
  );
}
