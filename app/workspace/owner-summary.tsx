"use client";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Sparkle } from "@phosphor-icons/react";
import { leadStageCounts } from "../../lib/workspace-presentation.mjs";
type Item = Record<string, any>;
const money = (value: number) =>
  "Rp " + Number(value || 0).toLocaleString("id-ID");
export default function OwnerSummary({
  request,
  go,
  date,
  branch,
  onAddChild,
  filters,
  refreshVersion,
}: {
  request: (path: string) => Promise<any>;
  go: (view: string) => void;
  date: string;
  branch: string;
  onAddChild?: () => void;
  filters?: ReactNode;
  refreshVersion?: number;
}) {
  const [data, setData] = useState<Item | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    request(
      "owner/summary?" +
        new URLSearchParams({ date, ...(branch ? { branchId: branch } : {}) }),
    )
      .then((r) => {
        if (active) setData(r);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [date, branch, refreshVersion]);
  if (error || !data)
    return (
      <section className="v10-owner-summary" aria-busy={!error}>
        <h1>Ringkasan Daycare</h1>
        <p role={error ? "alert" : "status"}>
          {error || "Memuat ringkasan daycare…"}
        </p>
      </section>
    );
  const seats = data.classes.reduce(
      (s: number, c: Item) => s + (c.capacity || 0),
      0,
    ),
    enrolled = data.children,
    slots = Math.max(0, seats - enrolled),
    financial = data.finance,
    latest = data.latestLead,
    canBusiness = data.capabilities.crm;
  const tasks = [
    {
      title: `${data.exceptions.length} keputusan layanan tertunda`,
      body: "Review izin jemput dan laporan insiden sebelum ditutup.",
      page: "control",
    },
    ...(canBusiness
      ? [
          {
            title: `${financial.overdueCount} tagihan perlu diperiksa`,
            body: "Cek transaksi dan bukti sebelum tandai lunas.",
            page: "finance",
          },
          {
            title: `${data.leads} calon keluarga dalam pipeline`,
            body: "Tindak lanjuti minat pendaftaran dan jadwal survei.",
            page: "crm",
          },
        ]
      : []),
    {
      title: "Jadwal kelas & staf",
      body: "Pastikan kapasitas dan pengasuh sesuai kebijakan.",
      page: "planner",
    },
  ];
  const stages = leadStageCounts(data.funnel),
    max = Math.max(1, ...stages.map((stage) => stage.count));
  return (
    <section className="v10-owner-summary" aria-busy="false">
      <link rel="stylesheet" href="/workspace-v10.css" />
      <div className="v10-pagehead">
        <div>
          <h1>Ringkasan Daycare</h1>
          {process.env.NEXT_PUBLIC_SANDBOX === "true" && (
            <span className="op-environment">Sandbox · Data contoh</span>
          )}
          <p>
            {canBusiness
              ? "Ringkasan layanan dan bisnis hari ini."
              : "Layanan dan keselamatan hari ini."}{" "}
            Lihat yang perlu diputuskan hari ini, bukan semua data sekaligus.
          </p>
        </div>
        <div className="v10-summary-actions">
          <button
            className="v10-headcta"
            onClick={() => (onAddChild ? onAddChild() : go("children"))}
          >
            + Daftarkan Anak
          </button>
          <details className="v10-summary-filters">
            <summary>Filter ringkasan</summary>
            {filters}
            <button className="op-btn" onClick={() => go("control")}>
              Buka Control Tower →
            </button>
          </details>
        </div>
      </div>
      <div className="v10-statstrip">
        {[
          [
            "Anak terdaftar",
            enrolled,
            `Dari ${seats || "belum ada"} kapasitas kelas`,
          ],
          [
            "Kapasitas terisi",
            seats ? Math.round((enrolled / seats) * 100) + "%" : "—",
            `${slots} slot tersedia`,
          ],
          [
            "Persetujuan tertunda",
            data.exceptions.length,
            "Penjemputan / insiden",
          ],
          [
            "Tagihan jatuh tempo",
            canBusiness ? financial.overdueCount : "—",
            canBusiness
              ? financial.overdueCount
                ? money(financial.overdueAmount) + " perlu ditinjau"
                : "Tidak ada tunggakan"
              : "Memerlukan paket Growth",
          ],
        ].map(([title, value, note]) => (
          <div className="v10-stat" key={title}>
            <label>{title}</label>
            <strong>{value}</strong>
            <small>{note}</small>
          </div>
        ))}
      </div>
      <div className="v10-dashboardgrid">
        <section className="v10-block">
          <div className="v10-blockhead">
            <div>
              <h2>Kapasitas per kelas</h2>
              <p>Slot yang tersedia dan siap ditindaklanjuti</p>
            </div>
            <button className="v10-link" onClick={() => go("planner")}>
              Buka jadwal →
            </button>
          </div>
          {data.classes.map((c: Item) => (
            <div className="v10-caprow" key={c.id}>
              <div>
                <b>{c.name}</b>
                <small>
                  {c.age_min_months != null
                    ? `${c.age_min_months}–${c.age_max_months || "…"} bulan`
                    : "Kelompok usia belum diatur"}
                </small>
              </div>
              <div className="v10-track">
                <span
                  style={{ width: Math.min(100, c.occupancy || 0) + "%" }}
                />
              </div>
              <em>
                {c.enrolled}/{c.capacity || "—"}
              </em>
            </div>
          ))}
          <div className="v10-insight">
            <span className="v10-insighticon">
              <Sparkle size={17} />
            </span>
            <div>
              <b>Peluang tindak lanjut</b>
              <p>
                {latest
                  ? `${latest.name}${latest.desiredSchedule ? " mencari " + latest.desiredSchedule : ""}. Cocokkan kebutuhan dengan kapasitas dan jadwal staf.`
                  : "Tidak ada prospek aktif saat ini."}
              </p>
              <button onClick={() => go(canBusiness ? "crm" : "subscription")}>
                {canBusiness ? "Tinjau prospek →" : "Lihat fitur Growth →"}
              </button>
            </div>
          </div>
        </section>
        <section className="v10-block">
          <div className="v10-blockhead">
            <div>
              <h2>Butuh tindakan</h2>
              <p>Prioritas untuk pemilik dan pengelola</p>
            </div>
            <button className="v10-link" onClick={() => go("control")}>
              Lihat semua →
            </button>
          </div>
          {tasks.map((t, i) => (
            <button
              className="v10-workitem"
              key={t.page}
              onClick={() => go(t.page)}
            >
              <span className="v10-worknum">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="v10-workcopy">
                <b>{t.title}</b>
                <small>{t.body}</small>
              </span>
              <ArrowRight size={16} />
            </button>
          ))}
        </section>
      </div>
      {canBusiness && (
        <div className="v10-secondarygrid">
          <section className="v10-block">
            <div className="v10-blockhead">
              <div>
                <h2>Status pembayaran</h2>
                <p>Tagihan keluarga, bukan langganan SaaS</p>
              </div>
              <button className="v10-link" onClick={() => go("finance")}>
                Lihat tagihan →
              </button>
            </div>
            <div className="v10-minirow">
              <span>Sudah diterima</span>
              <b>{money(financial.paid)}</b>
            </div>
            <div className="v10-minirow">
              <span>Belum diterima</span>
              <b>{money(financial.outstanding)}</b>
            </div>
            <div className="v10-track" style={{ marginTop: 14, height: 8 }}>
              <span
                style={{
                  width:
                    (financial.paid + financial.outstanding
                      ? (financial.paid /
                          (financial.paid + financial.outstanding)) *
                        100
                      : 0) + "%",
                  background: "#478E7B",
                }}
              />
            </div>
            <p className="v10-smallprint">
              Berdasarkan invoice yang tercatat, bukan saldo bank.
            </p>
          </section>
          <section className="v10-block">
            <div className="v10-blockhead">
              <div>
                <h2>Perjalanan calon keluarga</h2>
                <p>Posisi seluruh prospek aktif saat ini</p>
              </div>
              <button className="v10-link" onClick={() => go("crm")}>
                Buka CRM →
              </button>
            </div>
            <div className="v10-funnel">
              {stages.map(({ label, count }) => (
                <div className="v10-funnel-col" key={label}>
                  <b>{count}</b>
                  <span
                    style={{
                      height: 7 + (count / max) * 52,
                    }}
                  />
                  <small>{label}</small>
                </div>
              ))}
            </div>
            <p className="v10-smallprint">
              Jumlah saat ini, bukan persentase konversi historis.
            </p>
          </section>
        </div>
      )}
      <div className="v10-quickstrip">
        <div>
          <b>Mulai dari pekerjaan yang nyata</b>
          <p>Data anak → penugasan kelas → aktivitas → komunikasi keluarga</p>
        </div>
        <div className="v10-quickactions">
          <button onClick={() => go("children")}>Anak & keluarga →</button>
          <button onClick={() => go("planner")}>Jadwal →</button>
          <button onClick={() => go("integrations")}>CCTV & AI →</button>
        </div>
      </div>
    </section>
  );
}
