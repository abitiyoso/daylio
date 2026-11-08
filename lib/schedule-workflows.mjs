import { z } from "zod";
const id = z.uuid(),
  stamp = z.iso.datetime({ offset: true });
const booking = z
  .object({
    classroomId: id,
    childId: id.nullable().default(null),
    leadId: id.nullable().default(null),
    childName: z.string().trim().min(1).max(160),
    type: z.enum(["trial", "regular", "extra-day", "drop-in"]),
    startsAt: stamp,
    endsAt: stamp,
  })
  .strict()
  .refine(
    (v) => Boolean(v.childId) !== Boolean(v.leadId),
    "Choose a child or a prospect, not both",
  );
const shift = z
  .object({ classroomId: id, userId: id, startsAt: stamp, endsAt: stamp })
  .strict();
export async function scheduleWorkflows(h, ctx, method, path, body, params) {
  if (!path.startsWith("planner/")) return { handled: false };
  const { q, one, allow, fail } = h,
    { orgId, userId, role } = ctx;
  const [_, resource, target, action] = path.split("/");
  const result = async () => {
    if (resource === "overview" && method === "GET") {
      const from = stamp.parse(params.get("from")),
        to = stamp.parse(params.get("to"));
      if (
        Date.parse(to) <= Date.parse(from) ||
        Date.parse(to) - Date.parse(from) > 31 * 86400000
      )
        fail(422, "INVALID_PLANNER_RANGE");
      const classes = await q(
        "select c.*,b.name branch_name,b.timezone from classrooms c join branches b on b.id=c.branch_id and b.organization_id=c.organization_id where c.organization_id=$1 order by c.name",
        [orgId],
      );
      const bookings = await q(
        "select * from schedule_bookings where organization_id=$1 and starts_at<$3 and ends_at>$2 order by starts_at,id limit 1000",
        [orgId, from, to],
      );
      const shifts = await q(
        "select s.*,m.display_name staff_name from schedule_shifts s join memberships m on m.organization_id=s.organization_id and m.user_id=s.user_id where s.organization_id=$1 and s.starts_at<$3 and s.ends_at>$2 order by s.starts_at,s.id limit 1000",
        [orgId, from, to],
      );
      const children = await q(
        "select id,classroom_id,name from children where organization_id=$1 and archived_at is null order by name",
        [orgId],
      );
      const staff = ["owner", "manager"].includes(role)
        ? await q(
            "select user_id,display_name,role from memberships where organization_id=$1 and active and role in ('manager','caregiver') order by display_name",
            [orgId],
          )
        : [];
      const leads = ["owner", "manager"].includes(role)
        ? await q(
            "select id,data->>'childName' child_name,data->>'name' name from records where organization_id=$1 and kind='lead' and state not in ('lost','enrolled') order by created_at desc limit 100",
            [orgId],
          )
        : [];
      return {
        branches: await q(
          "select id,name from branches where organization_id=$1 order by name",
          [orgId],
        ),
        from,
        to,
        classrooms: classes.filter(
          (c) =>
            ["owner", "manager"].includes(role) ||
            children.some((k) => k.classroom_id === c.id) ||
            shifts.some((s) => s.classroom_id === c.id),
        ),
        children,
        bookings,
        shifts,
        staff,
        leads,
        canManage: ["owner", "manager"].includes(role),
        basis:
          "Active enrollment reserves classroom seats; prospective bookings consume additional concurrent seats. Ratios are configured per class.",
      };
    }
    if (resource === "history" && method === "GET") {
      allow();
      return q(
        "select * from schedule_history where organization_id=$1 and resource_id=$2 order by created_at,id limit 100",
        [orgId, id.parse(target)],
      );
    }
    if (!["bookings", "shifts"].includes(resource)) fail(404, "NOT_FOUND");
    allow();
    const table =
      resource === "bookings" ? "schedule_bookings" : "schedule_shifts";
    await q("select pg_advisory_xact_lock(hashtext($1))", [orgId]);
    if (target) {
      const current = await one(
        `select * from ${table} where organization_id=$1 and id=$2 for update`,
        [orgId, id.parse(target)],
      );
      const revision = z.number().int().positive().parse(body.revision);
      if (revision !== current.revision)
        fail(
          409,
          "SCHEDULE_CHANGED",
          "Jadwal sudah diubah. Muat ulang sebelum menyimpan.",
        );
      if (action === "cancel" && method === "POST")
        return one(
          `update ${table} set state='cancelled' where organization_id=$1 and id=$2 returning *`,
          [orgId, current.id],
        );
      if (method !== "PATCH" || action) fail(405, "METHOD_NOT_ALLOWED");
    } else if (method !== "POST" || action) fail(405, "METHOD_NOT_ALLOWED");
    const { revision, ...values } = body;
    const data = (resource === "bookings" ? booking : shift).parse(values);
    if (
      Date.parse(data.endsAt) <= Date.parse(data.startsAt) ||
      Date.parse(data.endsAt) - Date.parse(data.startsAt) > 86400000
    )
      fail(422, "INVALID_INTERVAL");
    if (Date.parse(data.startsAt) < Date.now() - 5 * 60000)
      fail(422, "FUTURE_SCHEDULE_REQUIRED");
    await one("select id from classrooms where organization_id=$1 and id=$2", [
      orgId,
      data.classroomId,
    ]);
    if (resource === "bookings") {
      if (data.childId) {
        const child = await one(
          "select * from children where organization_id=$1 and id=$2 and archived_at is null",
          [orgId, data.childId],
        );
        data.childName = child.name;
      }
      const columns = [
        data.classroomId,
        data.childId,
        data.leadId,
        data.childName,
        data.type,
        data.startsAt,
        data.endsAt,
      ];
      return target
        ? one(
            "update schedule_bookings set classroom_id=$3,child_id=$4,lead_id=$5,child_name=$6,type=$7,starts_at=$8,ends_at=$9 where organization_id=$1 and id=$2 returning *",
            [orgId, target, ...columns],
          )
        : one(
            "insert into schedule_bookings(organization_id,created_by,classroom_id,child_id,lead_id,child_name,type,starts_at,ends_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning *",
            [orgId, userId, ...columns],
          );
    }
    const columns = [data.classroomId, data.userId, data.startsAt, data.endsAt];
    return target
      ? one(
          "update schedule_shifts set classroom_id=$3,user_id=$4,starts_at=$5,ends_at=$6 where organization_id=$1 and id=$2 returning *",
          [orgId, target, ...columns],
        )
      : one(
          "insert into schedule_shifts(organization_id,created_by,classroom_id,user_id,starts_at,ends_at) values($1,$2,$3,$4,$5,$6) returning *",
          [orgId, userId, ...columns],
        );
  };
  try {
    return { handled: true, value: await result() };
  } catch (error) {
    if (error.code === "23514")
      fail(
        409,
        error.message,
        "Jadwal ditolak: " +
          ({
            CLASSROOM_FULL: "kapasitas kelas penuh.",
            STAFF_SHIFT_CONFLICT:
              "pengasuh sudah memiliki shift pada waktu tersebut.",
            STAFF_COVERAGE_REQUIRED:
              "cakupan pengasuh belum cukup untuk seluruh waktu booking.",
            CAPACITY_AND_RATIO_REQUIRED:
              "tetapkan kapasitas dan rasio kelas terlebih dahulu.",
            BOOKING_CONFLICT:
              "anak atau prospek sudah memiliki booking yang bertabrakan.",
            AGE_GROUP_MISMATCH: "usia anak tidak sesuai kelompok kelas.",
            ACTIVE_STAFF_REQUIRED:
              "staf tidak aktif atau perannya tidak sesuai.",
          }[error.message] ||
            "periksa data kelas, tanggal, dan hubungan anak/prospek."),
      );
    throw error;
  }
}
