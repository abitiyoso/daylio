"use client";
import { useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
export default function WorkspaceSearch({
  request,
  onChoose,
}: {
  request: (path: string) => Promise<any>;
  onChoose: (row: Record<string, any>) => void;
}) {
  const [results, setResults] = useState<any[] | null>(null),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="v10-live-search">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (busy) return;
          setBusy(true);
          setError("");
          void request("workspace/search?" + new URLSearchParams({ q: query }))
            .then(setResults)
            .catch((e) => setError(e.message))
            .finally(() => setBusy(false));
        }}
      >
        <MagnifyingGlass size={16} />
        <input
          aria-label="Cari data"
          placeholder="Cari data ..."
          minLength={2}
          maxLength={80}
          required
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setResults(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setResults(null);
          }}
        />
      </form>
      {(results || error) && (
        <div className="v10-search-results">
          {error ? (
            <p role="alert">{error}</p>
          ) : results?.length ? (
            results.map((r) => (
              <button
                key={r.type + r.id}
                onClick={() => {
                  onChoose(r);
                  setResults(null);
                  setQuery("");
                }}
              >
                <strong>{r.name}</strong>
                <small>
                  {r.type === "child" ? "Profil anak" : "Prospek pendaftaran"}
                </small>
              </button>
            ))
          ) : (
            <p>Tidak ada data yang cocok dalam hak akses Anda.</p>
          )}
        </div>
      )}
      {busy && <span className="v10-search-loading">Mencari…</span>}
    </div>
  );
}
