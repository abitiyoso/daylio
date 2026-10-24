import { createHash } from "node:crypto";
import { z } from "zod";
const input = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("care-summary-draft"),
      childId: z.uuid(),
      sourceIds: z.array(z.uuid()).min(1).max(30),
    })
    .strict(),
  z
    .object({
      kind: z.literal("crm-followup"),
      leadId: z.uuid(),
      dueAt: z.iso.datetime({ offset: true }),
      note: z.string().trim().min(1).max(2000),
    })
    .strict(),
]);
export async function leoWorkItems(h, ctx, method, path, body) {
  if (!path.startsWith("leo/work-items")) return { handled: false };
  const { q, one, allow, fail, audit, child } = h,
    { orgId, userId, role } = ctx;
  allow(["owner", "manager", "caregiver"]);
  const revalidate = async (task) => {
    if (task.child_id) await child(task.child_id);
    if (task.kind === "crm-followup") {
      const [cap] = await q("select app_capability('crm') allowed");
      if (!cap.allowed) fail(403, "CAPABILITY_REQUIRED");
    }
    const sources = await q(
      "select id,kind,child_id,state,data,updated_at from records where organization_id=$1 and id=ANY($2::uuid[]) order by id",
      [orgId, task.source_ids],
    );
    if (sources.length !== task.source_ids.length)
      fail(403, "SOURCES_NO_LONGER_AUTHORIZED");
    if (
      task.kind === "care-summary-draft" &&
      sources.some(
        (s) =>
          s.kind !== "activity" ||
          s.state !== "published" ||
          s.child_id !== task.child_id,
      )
    )
      fail(403, "PUBLISHED_SAME_CHILD_SOURCES_REQUIRED");
    if (
      task.kind === "crm-followup" &&
      sources.some(
        (s) => s.kind !== "lead" || ["lost", "enrolled"].includes(s.state),
      )
    )
      fail(409, "LEAD_NO_LONGER_ACTIVE");
    const hash = createHash("sha256")
      .update(
        JSON.stringify(
          sources.map((s) => ({
            id: s.id,
            state: s.state,
            data: s.data,
            time: new Date(s.updated_at).toISOString(),
          })),
        ),
      )
      .digest("hex");
    return { sources, hash };
  };
  const result = async () => {
    if (path === "leo/work-items" && method === "GET")
      return {
        mode: "verified-records",
        provider: "not-connected",
        items: await q(
          "select * from leo_work_items where organization_id=$1 order by created_at desc,id desc limit 100",
          [orgId],
        ),
      };
    if (path === "leo/work-items" && method === "POST") {
      const data = input.parse(body);
      if (data.kind === "crm-followup" && role === "caregiver")
        fail(403, "FORBIDDEN");
      const task = {
        kind: data.kind,
        child_id: data.childId || null,
        source_ids: [...new Set(data.sourceIds || [data.leadId])],
      };
      const { hash } = await revalidate(task);
      const row = await one(
        "insert into leo_work_items(organization_id,child_id,kind,payload,source_ids,source_hash,created_by) values($1,$2,$3,$4,$5,$6,$7) returning *",
        [
          orgId,
          task.child_id,
          task.kind,
          JSON.stringify(data),
          task.source_ids,
          hash,
          userId,
        ],
      );
      await audit("leo.action.proposed", row.id);
      return row;
    }
    const parts = path.split("/");
    if (parts.length !== 4 || method !== "POST")
      fail(405, "METHOD_NOT_ALLOWED");
    const id = z.uuid().parse(parts[2]);
    await q("select pg_advisory_xact_lock(hashtext($1))", [id]);
    const task = await one(
      "select * from leo_work_items where organization_id=$1 and id=$2 for update",
      [orgId, id],
    );
    const { hash, sources } = await revalidate(task);
    if (hash !== task.source_hash)
      fail(
        409,
        "SOURCES_CHANGED_REVIEW_AGAIN",
        "Catatan sumber berubah. Buat usulan baru dan tinjau ulang.",
      );
    if (parts[3] === "cancel" && task.state !== "executed") {
      const row = await one(
        "update leo_work_items set state='cancelled',updated_at=now() where id=$1 returning *",
        [id],
      );
      await audit("leo.action.cancelled", id);
      return row;
    }
    if (parts[3] === "draft" && task.state === "proposed") {
      const text =
        task.kind === "crm-followup"
          ? task.payload.note
          : sources
              .map((s) => `${s.data.occurredAt}: ${s.data.note}`)
              .join("\n")
              .slice(0, 2000);
      const row = await one(
        "update leo_work_items set state='drafted',draft_text=$2,updated_at=now() where id=$1 returning *",
        [id, text],
      );
      await audit("leo.action.drafted", id);
      return row;
    }
    if (parts[3] === "approve" && task.state === "drafted") {
      allow();
      if (body.confirmed !== true) fail(422, "HUMAN_CONFIRMATION_REQUIRED");
      const row = await one(
        "update leo_work_items set state='approved',approved_by=$2,approved_at=now(),updated_at=now() where id=$1 returning *",
        [id, userId],
      );
      await audit("leo.action.approved", id);
      return row;
    }
    if (parts[3] === "execute") {
      allow();
      if (body.confirmed !== true) fail(422, "HUMAN_CONFIRMATION_REQUIRED");
      if (task.state === "executed") return task;
      if (task.state !== "approved" || !task.approved_by)
        fail(409, "APPROVAL_REQUIRED");
      // Approver membership/capabilities must still be valid at execution time.
      const [approver] = await q(
        "select user_id,role from memberships where organization_id=$1 and user_id=$2 and active and role in ('owner','manager')",
        [orgId, task.approved_by],
      );
      if (!approver) fail(403, "APPROVER_NO_LONGER_AUTHORIZED");
      const kind = task.kind === "crm-followup" ? "followup" : "ai-draft";
      const payload =
        kind === "followup"
          ? {
              leadId: task.payload.leadId,
              dueAt: task.payload.dueAt,
              note: task.draft_text,
            }
          : {
              note: task.draft_text,
              sources: task.source_ids,
              mode: "verified-records",
              workItemId: task.id,
            };
      const output = await one(
        "insert into records(organization_id,child_id,kind,data,state,created_by) values($1,$2,$3,$4,'draft',$5) returning id",
        [orgId, task.child_id, kind, JSON.stringify(payload), userId],
      );
      const row = await one(
        "update leo_work_items set state='executed',output_id=$2,updated_at=now() where id=$1 returning *",
        [id, output.id],
      );
      await audit("leo.action.executed", id);
      return row;
    }
    fail(409, "INVALID_ACTION_STATE");
  };
  return { handled: true, value: await result() };
}
