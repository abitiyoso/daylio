"use client";
import { useEffect, useId, useRef, useState } from "react";
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
    [error, setError] = useState(""),
    [expanded, setExpanded] = useState(false);
  const version = useRef(0),
    root = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null),
    toggle = useRef<HTMLButtonElement>(null),
    formId = useId(),
    resultsId = useId();
  function dismiss() {
    version.current++;
    setResults(null);
    setError("");
    setBusy(false);
    setExpanded(false);
  }
  useEffect(() => {
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) dismiss();
    }
    document.addEventListener("pointerdown", outside);
    return () => {
      version.current++;
      document.removeEventListener("pointerdown", outside);
    };
  }, []);
  useEffect(() => {
    if (expanded) input.current?.focus();
  }, [expanded]);
  return (
    <div
      ref={root}
      className={`v10-live-search ${expanded ? "expanded" : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          dismiss();
          if (expanded) toggle.current?.focus();
        }
      }}
    >
      <button
        ref={toggle}
        className="op-icon v10-search-toggle"
        type="button"
        aria-label={expanded ? "Tutup pencarian" : "Buka pencarian"}
        aria-expanded={expanded}
        aria-controls={formId}
        onClick={() => (expanded ? dismiss() : setExpanded(true))}
      >
        <MagnifyingGlass size={18} aria-hidden="true" />
      </button>
      <form
        id={formId}
        role="search"
        aria-label="Pencarian data daycare"
        onSubmit={(e) => {
          e.preventDefault();
          if (busy) return;
          if (query.trim().length < 2) {
            setError("Masukkan sedikitnya 2 karakter untuk mencari.");
            return;
          }
          const n = ++version.current;
          setBusy(true);
          setResults(null);
          setError("");
          void request(
            "workspace/search?" + new URLSearchParams({ q: query.trim() }),
          )
            .then((rows) => {
              if (n === version.current) setResults(rows);
            })
            .catch((e) => {
              if (n === version.current) setError(e.message);
            })
            .finally(() => {
              if (n === version.current) setBusy(false);
            });
        }}
      >
        <input
          ref={input}
          aria-label="Cari data"
          placeholder="Cari nama…"
          aria-controls={resultsId}
          enterKeyHint="search"
          autoComplete="off"
          minLength={2}
          maxLength={80}
          required
          value={query}
          onChange={(e) => {
            version.current++;
            setQuery(e.target.value);
            setResults(null);
            setError("");
            setBusy(false);
          }}
        />
        <button
          type="submit"
          className="v10-search-submit"
          aria-label="Cari"
          disabled={busy}
        >
          <MagnifyingGlass size={18} aria-hidden="true" />
        </button>
      </form>
      {(results || error) && (
        <div
          id={resultsId}
          className="v10-search-results"
          aria-label="Hasil pencarian"
        >
          {error ? (
            <p role="alert">{error}</p>
          ) : results?.length ? (
            results.map((r) => (
              <button
                key={r.type + r.id}
                onClick={() => {
                  onChoose(r);
                  dismiss();
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
            <p role="status">Tidak ada data yang cocok dalam hak akses Anda.</p>
          )}
        </div>
      )}
      {busy && (
        <span className="v10-search-loading" role="status">
          Mencari…
        </span>
      )}
    </div>
  );
}
