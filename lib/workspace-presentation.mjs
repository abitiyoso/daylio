// Presentation only: stored workflow states and permissions remain unchanged.
export function leadStageCounts(funnel = {}) {
  return [
    { label: "Baru", states: ["new"] },
    { label: "Dihubungi", states: ["contacted"] },
    { label: "Survei", states: ["tour", "tour-booked"] },
    { label: "Trial", states: ["trial"] },
    { label: "Penawaran", states: ["qualified", "offered"] },
    { label: "Daftar tunggu", states: ["waitlisted"] },
  ].map(({ label, states }) => ({
    label,
    count: states.reduce((sum, state) => sum + Number(funnel[state] || 0), 0),
  }));
}
export function displayDate(value) {
  if (!value) return "Belum ditentukan";
  const date = new Date(
    value.length === 10 ? value + "T12:00:00+07:00" : value,
  );
  if (Number.isNaN(date.getTime())) return "Tanggal belum tersedia";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}
export function displayValue(value, fallback = "Belum dilengkapi") {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}
export function emergencyContact(data = {}) {
  const name = displayValue(data.emergencyName, ""),
    phone = displayValue(data.emergencyPhone, "");
  return {
    complete: Boolean(name && phone),
    label:
      name || phone
        ? `${name || "Nama belum dilengkapi"} · ${phone || "Telepon belum dilengkapi"}`
        : "Belum dilengkapi",
  };
}
export function familyContacts(contacts) {
  if (!Array.isArray(contacts)) return "Belum dilengkapi";
  return (
    contacts
      .map((c) =>
        [
          displayValue(c?.name, ""),
          displayValue(c?.relationship, ""),
          displayValue(c?.phone, ""),
        ]
          .filter(Boolean)
          .join(" · "),
      )
      .filter(Boolean)
      .join("; ") || "Belum dilengkapi"
  );
}
