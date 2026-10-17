import { randomUUID } from "node:crypto";
import { z } from "zod";
import { schemas } from "./schemas.mjs";
import { growthWorkflows } from "./growth-workflows.mjs";
const text = z.string().trim().min(1).max(2000),
  id = z.uuid(),
  day = z.iso.date(),
  instant = z.iso.datetime({ offset: true });
export const jakartaDay = (value = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(
    new Date(value),
  );
const listKinds = [
  "activity",
  "media",
  "attendance",
  "morning-note",
  "daily-story",
  "pickup-authorization",
  "pickup",
  "incident",
  "incident-update",
  "handoff",
  "observation",
  "development-report",
  "passport",
  "passport-change",
  "announcement",
  "message",
  "shift",
];
export async function careWorkflows(h, ctx, method, path, body, params) {
  const {
    q,
    one,
    child,
    record,
    add,
    update,
    audit,
    notify,
    allow,
    fail,
    call,
  } = h;
  const { orgId, userId, role } = ctx,
    management = ["owner", "manager"].includes(role),
    staff = management || role === "caregiver";
  const [resource, target, action] = path.split("/");
  const matches = [
    "workspace/context",
    "care/today",
    "care/policy",
    "manager/exceptions",
    "manager/closing",
    "owner/business-pulse",
    "parent/today",
    "activities/batch",
    "activities/batches",
    "morning-notes",
    "daily-stories",
    "pickup-authorizations",
    "pickups",
    "passports",
    "passport-changes",
    "observations",
    "development-reports",
    "development-rubrics",
    "crm",
    "leo/caregiver/query",
  ].some((p) => path === p || path.startsWith(p + "/"));
  if (!matches) return { handled: false };
  const result = async () => {
    const date = day.parse(params.get("date") || jakartaDay());
    if (method !== "GET" && date !== jakartaDay())
      fail(
        422,
        "CURRENT_OPERATION_DATE_REQUIRED",
        "Gunakan tanggal operasional hari ini.",
      );
    const policy = async () => {
      const [row] = await q("select care_policy() policy");
      return {
        routinePublishing: "caregiver",
        substituteReview: true,
        ...row.policy,
      };
    };
    const insert = async (kind, data, childId = null, state = "draft") => {
      if (childId) {
        const c = await child(childId);
        if (c.archived_at) fail(409, "CHILD_ARCHIVED");
      }
      const row = await one(
        "insert into records(organization_id,child_id,kind,data,state,created_by) values($1,$2,$3,$4,$5,$6) returning *",
        [orgId, childId, kind, JSON.stringify(data), state, userId],
      );
      await audit(`${kind}.create`, row.id);
      return row;
    };
    const records = async (kinds = listKinds) => {
      const childId = params.get("childId");
      if (childId) await child(id.parse(childId));
      return q(
        "select r.*,actor_label(r.created_by,r.child_id) as actor_name from records r where organization_id=$1 and kind=ANY($2::text[]) and ($3::uuid is null or child_id=$3) order by created_at desc,id desc limit 1500",
        [orgId, kinds, childId || null],
      );
    };
    const roster = async () => {
      const children = await q(
        "select * from children where organization_id=$1 and archived_at is null order by name",
        [orgId],
      );
      const attendance = await q(
        "select distinct on(child_id) * from records where organization_id=$1 and kind='attendance' and (created_at at time zone 'Asia/Jakarta')::date<=$2::date order by child_id,created_at desc,id desc",
        [orgId, date],
      );
      const latest = new Map(attendance.map((r) => [r.child_id, r]));
      return children.map((c) => ({
        ...c,
        present:
          latest.get(c.id)?.data.type === "in" &&
          jakartaDay(latest.get(c.id).created_at) === date,
        attendance: latest.get(c.id) || null,
      }));
    };
    const exceptionQueue = async (closing = false) => {
      allow();
      const rows = await records(),
        p = await policy();
      const items = rows
        .filter(
          (r) =>
            (r.kind === "morning-note" && r.state === "submitted") ||
            (r.kind === "incident" && r.state !== "resolved") ||
            (r.kind === "pickup-authorization" &&
              r.state === "requested" &&
              Date.parse(r.data.expiresAt) > Date.now()) ||
            (r.kind === "activity" &&
              r.state === "draft" &&
              (r.data.reviewRequired ||
                p.routinePublishing === "manager-review")) ||
            (r.kind === "daily-story" &&
              r.state === "draft" &&
              p.routinePublishing === "manager-review") ||
            (r.kind === "observation" && r.state === "submitted") ||
            (r.kind === "passport-change" && r.state === "submitted") ||
            (r.kind === "handoff" && r.state !== "acknowledged"),
        )
        .map((r) => ({
          id: r.id,
          childId: r.child_id,
          kind: r.kind,
          state: r.state,
          data: r.data,
          createdAt: r.created_at,
          actorName: r.actor_name,
        }));
      const children = await roster(),
        classes = await q("select * from classrooms where organization_id=$1", [
          orgId,
        ]);
      for (const classroom of classes) {
        const present = children.filter(
          (c) => c.classroom_id === classroom.id && c.present,
        );
        if (!present.length || !classroom.caregiver_ratio) continue;
        const [{ count }] = await q(
          "select count(distinct a.user_id)::integer count from staff_assignments a join children c on c.id=a.child_id and c.organization_id=a.organization_id join memberships m on m.organization_id=a.organization_id and m.user_id=a.user_id where a.organization_id=$1 and c.classroom_id=$2 and a.revoked_at is null and m.active and m.role='caregiver' and exists(select 1 from records r where r.organization_id=a.organization_id and r.kind='shift' and r.data->>'userId'=a.user_id::text and r.data->>'onDuty'='true' and (r.data->>'startsAt')::timestamptz<=now() and (r.data->>'endsAt')::timestamptz>=now())",
          [orgId, classroom.id],
        );
        const required = Math.ceil(present.length / classroom.caregiver_ratio);
        if (count < required)
          items.push({
            id: classroom.id,
            childId: null,
            kind: "staff-coverage",
            state: "open",
            data: {
              name: classroom.name,
              note: `${present.length} anak hadir; ${count} pengasuh dengan shift tercatat. Kebutuhan menurut rasio daycare: ${required}. Periksa penugasan dan catatan shift.`,
              present: present.length,
              staffOnDuty: count,
              required,
            },
          });
      }
      if (closing) {
        for (const c of await roster()) {
          if (c.attendance?.data.type === "in")
            items.push({
              id: c.attendance.id,
              childId: c.id,
              kind: "still-present",
              state: "open",
              data: { name: c.name },
              createdAt: c.attendance.created_at,
            });
          if (
            c.present &&
            !rows.some(
              (r) =>
                r.kind === "daily-story" &&
                r.child_id === c.id &&
                r.state === "published" &&
                r.data.date === date,
            )
          )
            items.push({
              id: c.id,
              childId: c.id,
              kind: "missing-story",
              state: "open",
              data: { name: c.name },
            });
        }
      }
      return items;
    };
    const publishActivities = async (rows) => {
      allow(["owner", "manager", "caregiver"]);
      const p = await policy();
      if (
        role === "caregiver" &&
        (p.routinePublishing === "manager-review" ||
          rows.some((r) => r.created_by !== userId || r.data.reviewRequired))
      )
        fail(
          403,
          "MANAGER_REVIEW_REQUIRED",
          "Catatan ini memerlukan review pengelola.",
        );
      for (const row of rows) {
        await child(row.child_id);
        if (row.state !== "draft") fail(409, "NOT_A_DRAFT");
      }
      const published = [];
      for (const row of rows) {
        published.push(
          await update(
            row,
            {
              ...row.data,
              publishedBy: userId,
              publishedAt: new Date().toISOString(),
            },
            "published",
          ),
        );
        await q(
          "update records set state='published' where organization_id=$1 and kind='media' and data->>'activityId'=$2 and data->>'uploaded'='true'",
          [orgId, row.id],
        );
        await notify(
          `${row.child_id}:${date}:daily-update`,
          "daily-update",
          row.child_id,
        );
      }
      return published;
    };
    if (path === "workspace/context" && method === "GET") {
      const children = await roster(),
        rows = await records(),
        classes = await q(
          "select c.*,b.name branch_name from classrooms c join branches b on b.id=c.branch_id and b.organization_id=c.organization_id where c.organization_id=$1 order by c.name",
          [orgId],
        );
      const [caps] = await q(
        "select app_capability('finance') finance,app_capability('crm') crm",
      );
      const org = await one("select id,name from organizations where id=$1", [
        orgId,
      ]);
      return {
        organization: org,
        role,
        userId,
        date,
        children,
        classrooms: classes.filter(
          (c) => management || children.some((k) => k.classroom_id === c.id),
        ),
        records: rows,
        policy: await policy(),
        capabilities: caps,
      };
    }
    if (path === "care/policy" && method === "GET") {
      allow(["owner", "manager", "caregiver"]);
      return policy();
    }
    if (path === "care/today" && method === "GET") {
      allow(["owner", "manager", "caregiver"]);
      return {
        date,
        children: await roster(),
        records: await records([
          "morning-note",
          "activity",
          "daily-story",
          "attendance",
          "handoff",
        ]),
        policy: await policy(),
      };
    }
    if (path === "activities/batch" && method === "POST") {
      allow(["owner", "manager", "caregiver"]);
      const input = z
        .object({
          childIds: z.array(id).min(1).max(50),
          classroomId: id.optional(),
          data: schemas.activity.omit({ batchId: true, reviewRequired: true }),
          exceptions: z
            .record(
              z.string(),
              schemas.activity
                .omit({ batchId: true, reviewRequired: true })
                .partial(),
            )
            .optional(),
        })
        .strict()
        .parse(body);
      if (new Set(input.childIds).size !== input.childIds.length)
        fail(422, "DUPLICATE_CHILD");
      for (const childId of [...input.childIds].sort()) {
        await child(childId);
        await q("select pg_advisory_xact_lock(hashtext($1))", [
          childId + "pickup",
        ]);
      }
      const children = await roster(),
        present = new Map(children.map((c) => [c.id, c]));
      for (const target of input.childIds) {
        await child(target);
        const c = present.get(target);
        if (!c?.present)
          fail(409, "CHILD_NOT_PRESENT", "Pilih hanya anak yang sedang hadir.");
        if (input.classroomId && c.classroom_id !== input.classroomId)
          fail(422, "CLASSROOM_MISMATCH");
      }
      if (
        input.exceptions &&
        Object.keys(input.exceptions).some(
          (key) => !input.childIds.includes(key),
        )
      )
        fail(422, "EXCEPTION_NOT_SELECTED");
      const p = await policy(),
        batchId = randomUUID(),
        rows = [];
      for (const target of input.childIds) {
        const data = {
          ...input.data,
          ...input.exceptions?.[target],
          batchId,
          reviewRequired: p.routinePublishing === "manager-review",
        };
        rows.push(await insert("activity", data, target));
      }
      await audit("activity.batch.create", rows[0].id);
      return rows;
    }
    if (
      resource === "activities" &&
      target === "batches" &&
      method === "POST" &&
      path.split("/")[3] === "publish"
    ) {
      const batch = id.parse(path.split("/")[2]);
      z.object({ confirmed: z.literal(true) })
        .strict()
        .parse(body);
      await q("select pg_advisory_xact_lock(hashtext($1))", [batch]);
      const rows = await q(
        "select * from records where organization_id=$1 and kind='activity' and data->>'batchId'=$2 and state='draft' order by child_id for update",
        [orgId, batch],
      );
      if (!rows.length) fail(409, "NO_DRAFTS");
      return publishActivities(rows);
    }
    if (resource === "morning-notes") {
      if (method === "GET")
        return target
          ? record(target, "morning-note")
          : records(["morning-note"]);
      if (method === "POST" && !target) {
        allow(["parent"]);
        const input = z
          .object({ childId: id, note: text })
          .strict()
          .parse(body);
        await child(input.childId);
        const row = await insert(
          "morning-note",
          { note: input.note, date, guardianId: userId },
          input.childId,
          "submitted",
        );
        await notify(row.id, "morning-note", row.child_id, true);
        return row;
      }
      const row = await record(target, "morning-note");
      await child(row.child_id);
      if (method === "POST" && action === "acknowledge") {
        allow(["owner", "manager", "caregiver"]);
        if (row.state === "acknowledged") return row;
        return update(
          row,
          {
            ...row.data,
            acknowledgedBy: userId,
            acknowledgedAt: new Date().toISOString(),
          },
          "acknowledged",
        );
      }
      if (method === "PATCH" && !action) {
        allow(["parent"]);
        if (row.created_by !== userId) fail(403, "FORBIDDEN");
        const input = z.object({ note: text }).strict().parse(body);
        return update(
          row,
          { note: input.note, date, guardianId: userId },
          "submitted",
        );
      }
    }
    if (path === "manager/exceptions" && method === "GET")
      return {
        date,
        items: await exceptionQueue(params.get("closing") === "true"),
      };
    if (path === "manager/closing") {
      allow();
      if (method === "GET")
        return {
          date,
          items: await exceptionQueue(true),
          closings: await records(["daily-closing"]),
        };
      if (method === "POST") {
        const input = z
          .object({ note: text, confirmed: z.literal(true) })
          .strict()
          .parse(body);
        await q("select pg_advisory_xact_lock(hashtext($1))", [
          orgId + date + "closing",
        ]);
        const items = await exceptionQueue(true);
        const row = await insert(
          "daily-closing",
          {
            date,
            note: input.note,
            unresolved: items.map(({ id, childId, kind, state }) => ({
              id,
              childId,
              kind,
              state,
            })),
            confirmedBy: userId,
            confirmedAt: new Date().toISOString(),
          },
          null,
          "recorded",
        );
        await audit("closing.record-unresolved", row.id);
        return row;
      }
    }
    if (resource === "daily-stories") {
      if (method === "GET")
        return target
          ? record(target, "daily-story")
          : records(["daily-story"]);
      if (method === "POST" && !target) {
        allow(["owner", "manager", "caregiver"]);
        const input = z
          .object({
            childId: id,
            date: day,
            note: text,
            sourceIds: z.array(id).min(1).max(100),
          })
          .strict()
          .parse(body);
        await child(input.childId);
        for (const source of input.sourceIds) {
          const r = await record(source, "activity");
          if (
            r.child_id !== input.childId ||
            r.state !== "published" ||
            jakartaDay(r.data.occurredAt) !== input.date
          )
            fail(422, "INVALID_STORY_SOURCE");
        }
        return insert(
          "daily-story",
          {
            date: input.date,
            note: input.note,
            sourceIds: [...new Set(input.sourceIds)],
          },
          input.childId,
        );
      }
      const row = await record(target, "daily-story");
      await child(row.child_id);
      if (method === "POST" && action === "publish") {
        z.object({ confirmed: z.literal(true) })
          .strict()
          .parse(body);
        allow(["owner", "manager", "caregiver"]);
        const p = await policy();
        if (
          role === "caregiver" &&
          (p.routinePublishing === "manager-review" ||
            row.created_by !== userId)
        )
          fail(403, "MANAGER_REVIEW_REQUIRED");
        for (const source of row.data.sourceIds) {
          const r = await record(source, "activity");
          if (r.state !== "published" || r.child_id !== row.child_id)
            fail(409, "STORY_SOURCE_CHANGED");
        }
        const published = await update(
          row,
          {
            ...row.data,
            publishedBy: userId,
            publishedAt: new Date().toISOString(),
          },
          "published",
        );
        await notify(
          `${row.child_id}:${row.data.date}:daily-update`,
          "daily-update",
          row.child_id,
        );
        return published;
      }
      if (method === "PATCH" && !action) {
        allow(["owner", "manager", "caregiver"]);
        if (role === "caregiver" && row.created_by !== userId)
          fail(403, "FORBIDDEN");
        const input = z.object({ note: text }).strict().parse(body);
        return update(row, { ...row.data, note: input.note }, "draft");
      }
    }
    if (resource === "pickup-authorizations") {
      if (method === "GET")
        return target
          ? record(target, "pickup-authorization")
          : records(["pickup-authorization"]);
      if (method === "POST" && !target) {
        allow(["parent"]);
        const input = z
          .object({
            childId: id,
            data: z
              .object({
                name: text.max(160),
                relationship: text.max(160),
                kind: z.enum(["routine", "substitute"]).default("substitute"),
                validFrom: instant.optional(),
                expiresAt: instant,
                days: z.array(z.number().int().min(0).max(6)).min(1).optional(),
              })
              .strict(),
          })
          .strict()
          .parse(body);
        await child(input.childId);
        if (
          Date.parse(input.data.expiresAt) <= Date.now() ||
          (input.data.validFrom &&
            Date.parse(input.data.validFrom) >=
              Date.parse(input.data.expiresAt))
        )
          fail(422, "INVALID_PICKUP_WINDOW");
        const p = await policy();
        return insert(
          "pickup-authorization",
          {
            ...input.data,
            guardianConfirmedBy: userId,
            guardianConfirmedAt: new Date().toISOString(),
            requiresReview:
              input.data.kind === "substitute" && p.substituteReview,
          },
          input.childId,
          input.data.kind === "routine" || !p.substituteReview
            ? "approved"
            : "requested",
        );
      }
      let row = await record(target, "pickup-authorization");
      if (method === "POST" && ["approve", "revoke"].includes(action)) {
        await q("select pg_advisory_xact_lock(hashtext($1))", [
          row.child_id + "pickup",
        ]);
        row = await record(target, "pickup-authorization");
      }
      if (method === "POST" && action === "approve") {
        allow();
        if (row.state === "revoked" || row.state === "used")
          fail(409, "AUTHORIZATION_INACTIVE");
        const [{ allowed }] = await q(
          "select is_linked_guardian($1,$2) allowed",
          [row.created_by, row.child_id],
        );
        if (!allowed) fail(403, "GUARDIAN_AUTHORIZATION_REQUIRED");
        return update(
          row,
          {
            ...row.data,
            reviewedBy: userId,
            reviewedAt: new Date().toISOString(),
          },
          "approved",
        );
      }
      if (method === "POST" && action === "revoke") {
        if (!management && !(role === "parent" && row.created_by === userId))
          fail(403, "FORBIDDEN");
        return update(
          row,
          {
            ...row.data,
            revokedBy: userId,
            revokedAt: new Date().toISOString(),
          },
          "revoked",
        );
      }
    }
    if (resource === "pickups" && method === "GET")
      return target ? record(target, "pickup") : records(["pickup"]);
    if (
      resource === "pickups" &&
      action === "verify-handover" &&
      method === "POST"
    ) {
      allow(["owner", "manager", "caregiver"]);
      let auth = await record(target, "pickup-authorization");
      await child(auth.child_id);
      await q("select pg_advisory_xact_lock(hashtext($1))", [
        auth.child_id + "pickup",
      ]);
      auth = await record(target, "pickup-authorization");
      if (
        auth.state !== "approved" ||
        Date.parse(auth.data.expiresAt) <= Date.now() ||
        (auth.data.validFrom && Date.parse(auth.data.validFrom) > Date.now())
      )
        fail(409, "PICKUP_NOT_AUTHORIZED");
      const [{ allowed }] = await q(
        "select is_linked_guardian($1,$2) allowed",
        [auth.created_by, auth.child_id],
      );
      if (!allowed) fail(403, "GUARDIAN_AUTHORIZATION_REQUIRED");
      const weekday = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" }),
      ).getDay();
      if (auth.data.days && !auth.data.days.includes(weekday))
        fail(409, "PICKUP_DAY_NOT_ALLOWED");
      const input = z
        .object({
          identityVerified: z.literal(true).optional(),
          verificationMethod: z.enum([
            "physical-id",
            "known-authorized-person",
          ]),
          verifiedPersonName: text.max(160),
          identityNote: text.min(8).max(300),
          handoverConfirmed: z.literal(true),
        })
        .strict()
        .parse(body);
      if (
        input.verifiedPersonName.trim().toLocaleLowerCase() !==
        auth.data.name.trim().toLocaleLowerCase()
      )
        fail(422, "PICKUP_PERSON_MISMATCH");
      if (
        (auth.data.kind || "substitute") === "substitute" &&
        input.verificationMethod !== "physical-id"
      )
        fail(422, "SUBSTITUTE_REQUIRES_ID_CHECK");
      const [attendance] = await q(
        "select * from records where organization_id=$1 and child_id=$2 and kind='attendance' order by created_at desc,id desc limit 1",
        [orgId, auth.child_id],
      );
      if (!attendance || attendance.data.type !== "in")
        fail(409, "CHILD_NOT_PRESENT");
      const timestamp = new Date().toISOString();
      const row = await insert(
        "pickup",
        {
          authorizationId: auth.id,
          guardianId: auth.created_by,
          name: auth.data.name,
          kind: auth.data.kind || "substitute",
          verificationMethod: input.verificationMethod,
          identityNote: input.identityNote,
          verifiedAt: timestamp,
          handedOverAt: timestamp,
          staffId: userId,
          checkInId: attendance.id,
        },
        auth.child_id,
        "verified",
      );
      await insert(
        "attendance",
        { type: "out", pickupId: row.id, authorizationId: auth.id },
        auth.child_id,
        "recorded",
      );
      if ((auth.data.kind || "substitute") === "substitute")
        await update(auth, { ...auth.data, usedAt: timestamp }, "used");
      await notify(row.id, "pickup", row.child_id);
      return row;
    }
    if (path === "parent/today" && method === "GET") {
      allow(["parent"]);
      const target = id.parse(params.get("childId"));
      const c = await child(target);
      const rows = (await records()).filter((r) => r.child_id === c.id);
      const today = rows.filter((r) =>
        r.data.date
          ? r.data.date === date
          : jakartaDay(r.data.occurredAt || r.created_at) === date,
      );
      return {
        date,
        child: c,
        attendance: today.find((r) => r.kind === "attendance") || null,
        meal:
          today.find((r) => r.kind === "activity" && r.data.type === "meal") ||
          null,
        sleep:
          today.find((r) => r.kind === "activity" && r.data.type === "sleep") ||
          null,
        activities: today.filter((r) => r.kind === "activity"),
        photos: today.filter(
          (r) =>
            r.kind === "media" &&
            r.state === "published" &&
            r.data.uploaded === true,
        ),
        story: today.find((r) => r.kind === "daily-story") || null,
        morning: today.filter((r) => r.kind === "morning-note"),
        pickups: rows.filter(
          (r) => r.kind === "pickup-authorization" || r.kind === "pickup",
        ),
        reports: rows.filter((r) => r.kind === "development-report"),
      };
    }
    if (path === "owner/business-pulse" && method === "GET") {
      allow();
      const branch = params.get("branchId");
      if (branch)
        await one(
          "select id from branches where id=$1 and organization_id=$2",
          [id.parse(branch), orgId],
        );
      const children = await roster(),
        classes = await q(
          "select * from classrooms where organization_id=$1 and ($2::uuid is null or branch_id=$2) order by name",
          [orgId, branch || null],
        );
      const classesSet = new Set(classes.map((c) => c.id)),
        kids = children.filter((c) => classesSet.has(c.classroom_id)),
        kidSet = new Set(kids.map((c) => c.id));
      const storyRows = await q(
        "select child_id from records where organization_id=$1 and kind='daily-story' and state='published' and data->>'date'=$2 and child_id=ANY($3::uuid[])",
        [orgId, date, kids.map((c) => c.id)],
      );
      const leadStages = await q(
        "select state,count(*)::integer count from records where organization_id=$1 and kind='lead' and (created_at at time zone 'Asia/Jakarta')::date<=$2::date and ($3::uuid is null or data->>'classroomId'=ANY($4::text[])) group by state",
        [orgId, date, branch || null, classes.map((c) => c.id)],
      );
      const [{ followups }] = await q(
        "select count(*)::integer followups from records f where organization_id=$1 and kind='followup' and state<>'completed' and (data->>'dueAt')::timestamptz<($2::date+1)::timestamp at time zone 'Asia/Jakarta' and ($3::uuid is null or exists(select 1 from records l where l.organization_id=f.organization_id and l.kind='lead' and l.id::text=f.data->>'leadId' and l.data->>'classroomId'=ANY($4::text[])))",
        [orgId, date, branch || null, classes.map((c) => c.id)],
      );
      const present = kids.filter((c) => c.present),
        covered = present.filter((c) =>
          storyRows.some((r) => r.child_id === c.id),
        );
      return {
        date,
        children: kids.length,
        present: present.length,
        storyCoverage: { completed: covered.length, total: present.length },
        classes: classes.map((c) => ({
          ...c,
          enrolled: kids.filter((k) => k.classroom_id === c.id).length,
          occupancy: c.capacity
            ? Math.round(
                (kids.filter((k) => k.classroom_id === c.id).length /
                  c.capacity) *
                  100,
              )
            : null,
        })),
        leads: leadStages
          .filter((r) => !["enrolled", "lost"].includes(r.state))
          .reduce((sum, r) => sum + r.count, 0),
        followups,
        exceptions: (await exceptionQueue(false)).filter((item) =>
          item.childId
            ? kidSet.has(item.childId)
            : item.kind === "staff-coverage"
              ? classesSet.has(item.id)
              : true,
        ),
        funnel: Object.fromEntries(leadStages.map((r) => [r.state, r.count])),
        scope: {
          attendanceDate: date,
          enrollment: "current-active",
          leadState: "current-state-created-through-date",
          unassignedLeadsExcludedFromBranch: !!branch,
        },
      };
    }
    const extended = await growthWorkflows(
      {
        q,
        one,
        child,
        record,
        insert,
        update,
        audit,
        notify,
        allow,
        fail,
        call,
        records,
        date,
      },
      ctx,
      method,
      path,
      body,
      params,
    );
    if (extended !== undefined) return extended;
    fail(404, "ROUTE_NOT_FOUND");
  };
  return { handled: true, value: await result() };
}
