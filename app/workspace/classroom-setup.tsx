"use client";
import { useEffect, useRef, useState } from "react";
import { GearSix, X } from "@phosphor-icons/react";
type Item = Record<string, any>;
type Request = (
  path: string,
  method?: string,
  body?: any,
  key?: string,
) => Promise<any>;
export default function ClassroomSetup({
  request,
  classes,
  branches,
  onSaved,
}: {
  request: Request;
  classes: Item[];
  branches: Item[];
  onSaved: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const current = classes.find((c) => c.id === selected);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    return () => {
      dialog.current?.close();
      prev?.focus();
    };
  }, [open]);
  return (
    <>
      <button className="sc-button" onClick={() => setOpen(true)}>
        <GearSix size={16} /> Atur kelas
      </button>
      {open && (
        <dialog
          className="v10-commercial-dialog"
          ref={dialog}
          onCancel={(e) => {
            if (busy) e.preventDefault();
            else setOpen(false);
          }}
        >
          <button
            className="op-icon"
            aria-label="Tutup pengaturan kelas"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
          <h2>Konfigurasi kelas</h2>
          <label>
            Kelas
            <select
              aria-label="Pilih kelas untuk konfigurasi"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">Buat kelas baru</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <form
            className="op-form"
            key={selected}
            onSubmit={(e) => {
              e.preventDefault();
              if (busy) return;
              const v = Object.fromEntries(
                new FormData(e.currentTarget),
              ) as Record<string, string>;
              const body = {
                name: v.name,
                capacity: Number(v.capacity),
                caregiverRatio: Number(v.ratio),
                ageMinMonths: v.ageMin ? Number(v.ageMin) : null,
                ageMaxMonths: v.ageMax ? Number(v.ageMax) : null,
                ...(!selected ? { branchId: v.branchId } : {}),
              };
              setBusy(true);
              setError("");
              void request(
                "classrooms" + (selected ? "/" + selected : ""),
                selected ? "PATCH" : "POST",
                body,
              )
                .then(async () => {
                  await onSaved();
                  setOpen(false);
                })
                .catch((e) => setError(e.message))
                .finally(() => setBusy(false));
            }}
          >
            {!selected && (
              <label>
                Cabang
                <select name="branchId" required>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Nama kelas
              <input
                name="name"
                defaultValue={current?.name || ""}
                required
                maxLength={160}
              />
            </label>
            <label>
              Kapasitas anak
              <input
                name="capacity"
                type="number"
                min="1"
                max="1000"
                defaultValue={current?.capacity || ""}
                required
              />
            </label>
            <label>
              Anak per pengasuh
              <input
                name="ratio"
                type="number"
                min="1"
                max="100"
                defaultValue={current?.caregiver_ratio || ""}
                required
              />
            </label>
            <p>
              Rasio mengikuti kebijakan daycare, bukan angka regulasi universal.
            </p>
            <div className="op-form-grid">
              <label>
                Usia minimum (bulan)
                <input
                  name="ageMin"
                  type="number"
                  min="0"
                  max="216"
                  defaultValue={current?.age_min_months ?? ""}
                />
              </label>
              <label>
                Usia maksimum (bulan)
                <input
                  name="ageMax"
                  type="number"
                  min="0"
                  max="216"
                  defaultValue={current?.age_max_months ?? ""}
                />
              </label>
            </div>
            {error && <p role="alert">{error}</p>}
            <button
              className="op-btn primary"
              disabled={busy || !branches.length}
            >
              {busy ? "Memeriksa…" : "Simpan kelas"}
            </button>
          </form>
        </dialog>
      )}
    </>
  );
}
