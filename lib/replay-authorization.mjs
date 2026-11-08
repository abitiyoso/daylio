export async function authorizeReplay(
  db,
  storedContext,
  currentContext,
  response,
) {
  const deny = () => {
    throw Object.assign(
      new Error("Izin berubah. Muat ulang sebelum melanjutkan."),
      { status: 403, code: "REPLAY_AUTHORIZATION_CHANGED" },
    );
  };
  if (storedContext !== currentContext) deny();
  const ids = new Set();
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    for (const [key, item] of Object.entries(value)) {
      if (
        ["child_id", "childId"].includes(key) &&
        typeof item === "string" &&
        /^[a-f0-9-]{36}$/i.test(item)
      )
        ids.add(item);
      else if (item && typeof item === "object") visit(item);
    }
  };
  visit(response);
  for (const id of ids) {
    const result = await db.query("select can_child($1) allowed", [id]);
    if (!(result.rows ?? result)[0]?.allowed) deny();
  }
}
