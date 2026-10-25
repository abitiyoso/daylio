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
