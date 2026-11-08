"use client";
import { useEffect, useRef, useState } from "react";
import "../../workspace/workspace.css";
export default function Complete() {
  const started = useRef(false);
  const [message, setMessage] = useState("Memverifikasi email Anda…");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const tokens = new URLSearchParams(location.hash.slice(1));
    const invitation = new URLSearchParams(location.search).get("invitation");
    const recovery = tokens.get("type") === "recovery";
    history.replaceState({}, "", "/auth/complete");
    async function complete() {
      const response = await fetch("/api/v1/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: tokens.get("access_token"),
          refresh_token: tokens.get("refresh_token"),
        }),
      });
      if (!response.ok)
        throw Error(
          "Tautan tidak berlaku atau sudah kedaluwarsa. Minta admin mengirim undangan baru.",
        );
      if (invitation) {
        const accepted = await fetch(
          `/api/v1/invitations/${encodeURIComponent(invitation)}/accept`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
          },
        );
        if (!accepted.ok)
          throw Error(
            "Email terverifikasi, tetapi undangan tidak berlaku untuk akun ini. Hubungi admin daycare.",
          );
      }
      location.replace(
        invitation || recovery ? "/workspace?reset=1" : "/workspace",
      );
    }
    void complete().catch((error) => setMessage(error.message));
  }, []);
  return (
    <main className="workspace auth">
      <a className="wordmark" href="/">
        Daylio <small>by Elenio</small>
      </a>
      <h1>Verifikasi email</h1>
      <p role="status">{message}</p>
      <a href="/workspace">Kembali ke login</a>
    </main>
  );
}
