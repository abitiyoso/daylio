import { z } from "zod";
import { textPdf } from "./report.mjs";
import { factsAnswer } from "./schemas.mjs";
const id = z.uuid(),
  text = z.string().trim().min(1).max(2000),
  day = z.iso.date();
const passportFields = z
  .object({
    allergies: text,
    careInstructions: text,
    emergencyName: text.max(160),
    emergencyPhone: z.string().trim().min(6).max(40),
    authorizedContacts: z
      .array(
        z
          .object({
            name: text.max(160),
            relationship: text.max(160),
            phone: z.string().trim().min(6).max(40),
          })
          .strict(),
      )
      .max(10),
  })
  .strict();
export async function growthWorkflows(h, ctx, method, path, body, params) {
  const {
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
  } = h;
  const { orgId, userId, role } = ctx,
    [resource, target, action] = path.split("/");
  if (resource === "passports") {
    const childId = id.parse(target || params.get("childId"));
    await child(childId);
    if (method === "GET")
      return {
        childId,
        current:
          (
            await q(
              "select * from records where organization_id=$1 and child_id=$2 and kind='passport'",
              [orgId, childId],
            )
          )[0] || null,
        changes: (await records(["passport-change"])).filter(
          (r) => r.child_id === childId,
        ),
      };
  }
  if (resource === "passport-changes") {
    if (method === "GET") return records(["passport-change"]);
    if (method === "POST" && !target) {
      allow(["parent"]);
      const input = z
        .object({ childId: id, data: passportFields })
        .strict()
        .parse(body);
      await child(input.childId);
      const row = await insert(
        "passport-change",
        {
          ...input.data,
          submittedBy: userId,
          submittedAt: new Date().toISOString(),
        },
        input.childId,
        "submitted",
      );
      await notify(row.id, "passport-change", row.child_id, true);
      return row;
    }
    if (method === "POST" && ["approve", "reject"].includes(action)) {
      allow();
      const change = await record(target, "passport-change");
      if (change.state !== "submitted") fail(409, "NOT_PENDING_REVIEW");
      const input = z
        .object({ note: text, confirmed: z.literal(true) })
        .strict()
        .parse(body);
      const [{ allowed }] = await q(
        "select is_linked_guardian($1,$2) allowed",
        [change.created_by, change.child_id],
      );
      if (!allowed) fail(403, "GUARDIAN_AUTHORIZATION_REQUIRED");
      await q("select pg_advisory_xact_lock(hashtext($1))", [
        change.child_id + "passport",
      ]);
      if (action === "approve") {
        const [current] = await q(
          "select * from records where organization_id=$1 and child_id=$2 and kind='passport' for update",
          [orgId, change.child_id],
        );
        const data = {
          ...change.data,
          version: (current?.data.version || 0) + 1,
          sourceId: change.id,
          approvedBy: userId,
          approvedAt: new Date().toISOString(),
          reviewNote: input.note,
        };
        if (current) await update(current, data, "approved");
        else await insert("passport", data, change.child_id, "approved");
      }
      const row = await update(
        change,
        {
          ...change.data,
          reviewNote: input.note,
          reviewedBy: userId,
          reviewedAt: new Date().toISOString(),
        },
        action === "approve" ? "approved" : "rejected",
      );
      await notify(row.id, "passport-review", row.child_id);
      return row;
    }
  }
  if (resource === "development-rubrics") {
    if (method === "GET") {
      allow(["owner", "manager", "caregiver"]);
      return records(["development-rubric"]);
    }
    if (method === "POST" && !target) {
      allow();
      const input = z
        .object({
          name: text.max(160),
          version: text.max(80),
          ageMinMonths: z.number().int().min(0),
          ageMaxMonths: z.number().int().max(216),
          domains: z.array(text.max(160)).min(1).max(20),
        })
        .strict()
        .parse(body);
      if (input.ageMinMonths > input.ageMaxMonths)
        fail(422, "INVALID_AGE_RANGE");
      return insert("development-rubric", input, null, "active");
    }
  }
  if (resource === "observations") {
    if (method === "GET") return records(["observation"]);
    if (method === "POST" && !target) {
      allow(["owner", "manager", "caregiver"]);
      const input = z
        .object({
          childId: id,
          rubricId: id,
          domain: text.max(160),
          observedOn: day,
          note: text,
        })
        .strict()
        .parse(body);
      const observedChild = await child(input.childId);
      const rubric = await record(input.rubricId, "development-rubric");
      if (
        rubric.state !== "active" ||
        !rubric.data.domains.includes(input.domain)
      )
        fail(422, "INVALID_RUBRIC_DOMAIN");
      if (input.observedOn > date) fail(422, "FUTURE_OBSERVATION");
      if (!observedChild.birth_date)
        fail(
          422,
          "CHILD_BIRTH_DATE_REQUIRED",
          "Lengkapi tanggal lahir anak sebelum menggunakan rubrik usia.",
        );
      const born = new Date(observedChild.birth_date),
        observed = new Date(input.observedOn);
      const months =
        (observed.getUTCFullYear() - born.getUTCFullYear()) * 12 +
        observed.getUTCMonth() -
        born.getUTCMonth() -
        (observed.getUTCDate() < born.getUTCDate() ? 1 : 0);
      if (
        months < rubric.data.ageMinMonths ||
        months > rubric.data.ageMaxMonths
      )
        fail(
          422,
          "RUBRIC_AGE_MISMATCH",
          "Rubrik tidak sesuai usia anak pada tanggal observasi.",
        );
      return insert(
        "observation",
        {
          ...input,
          ageMonths: months,
          rubricVersion: rubric.data.version,
          observerId: userId,
        },
        input.childId,
        "draft",
      );
    }
    const row = await record(target, "observation");
    await child(row.child_id);
    if (method === "POST" && action === "submit") {
      allow(["owner", "manager", "caregiver"]);
      if (role === "caregiver" && row.created_by !== userId)
        fail(403, "FORBIDDEN");
      if (row.state !== "draft") fail(409, "NOT_A_DRAFT");
      const submitted = await update(row, row.data, "submitted");
      await notify(row.id, "observation-review", row.child_id, true);
      return submitted;
    }
    if (method === "POST" && ["approve", "reject"].includes(action)) {
      allow();
      if (row.state !== "submitted") fail(409, "NOT_PENDING_REVIEW");
      const input = z
        .object({ note: text, confirmed: z.literal(true) })
        .strict()
        .parse(body);
      return update(
        row,
        {
          ...row.data,
          reviewNote: input.note,
          reviewedBy: userId,
          reviewedAt: new Date().toISOString(),
        },
        action === "approve" ? "approved" : "rejected",
      );
    }
  }
  if (resource === "development-reports") {
    if (method === "GET" && !target) return records(["development-report"]);
    if (method === "POST" && !target) {
      allow();
      const input = z
        .object({
          childId: id,
          title: text.max(160),
          from: day,
          to: day,
          note: text,
          sourceIds: z.array(id).min(1).max(100),
        })
        .strict()
        .parse(body);
      if (input.from > input.to || input.to > date)
        fail(422, "INVALID_REPORT_PERIOD");
      await child(input.childId);
      const sources = [];
      for (const sourceId of [...new Set(input.sourceIds)]) {
        const row = await record(sourceId, "observation");
        if (
          row.child_id !== input.childId ||
          row.state !== "approved" ||
          row.data.observedOn < input.from ||
          row.data.observedOn > input.to
        )
          fail(422, "APPROVED_OBSERVATIONS_REQUIRED");
        sources.push({
          id: row.id,
          observedOn: row.data.observedOn,
          domain: row.data.domain,
          note: row.data.note,
          rubricId: row.data.rubricId,
          rubricVersion: row.data.rubricVersion,
          observerId: row.created_by,
          reviewedBy: row.data.reviewedBy,
        });
      }
      return insert(
        "development-report",
        { ...input, sourceIds: sources.map((s) => s.id), sources },
        input.childId,
        "draft",
      );
    }
    const row = await record(target, "development-report");
    await child(row.child_id);
    if (method === "POST" && action === "publish") {
      allow();
      z.object({ confirmed: z.literal(true) })
        .strict()
        .parse(body);
      if (row.state !== "draft") fail(409, "NOT_A_DRAFT");
      for (const source of row.data.sourceIds) {
        const observation = await record(source, "observation");
        if (
          observation.state !== "approved" ||
          observation.child_id !== row.child_id
        )
          fail(409, "OBSERVATION_CHANGED");
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
      await notify(row.id, "development-report", row.child_id);
      return published;
    }
    if (method === "GET" && action === "pdf") {
      if (role === "parent" && row.state !== "published")
        fail(404, "NOT_FOUND");
      await audit("development-report.export", row.id);
      const c = await child(row.child_id);
      return {
        format: "pdf",
        encoding: "base64",
        filename: `rapor-${row.id}.pdf`,
        content: textPdf(row.data.title, [
          c.name,
          `${row.data.from} - ${row.data.to}`,
          row.data.note,
          ...row.data.sources.map(
            (s) => `${s.observedOn} | ${s.domain}: ${s.note} [${s.id}]`,
          ),
          `Disahkan: ${row.data.publishedBy || "Belum dipublikasikan"}`,
        ]).toString("base64"),
      };
    }
  }
  if (resource === "crm") {
    allow();
    const [{ allowed }] = await q("select app_capability('crm') allowed");
    if (!allowed) fail(403, "CAPABILITY_REQUIRED");
    if (path === "crm/overview" && method === "GET")
      return {
        leads: await call("GET", "leads"),
        followups: await call("GET", "follow-up-tasks"),
        tours: await call("GET", "tours"),
        trials: await call("GET", "trials"),
        drafts: await records(["whatsapp-draft"]),
        staff: await q(
          "select user_id,display_name,role from memberships where organization_id=$1 and active and role in ('owner','manager') order by display_name",
          [orgId],
        ),
      };
    if (target === "leads") {
      const leadId = id.parse(path.split("/")[2]),
        operation = path.split("/")[3],
        lead = await record(leadId, "lead");
      if (method === "POST" && operation === "qualify") {
        const input = z
          .object({
            childAgeMonths: z.number().int().min(0).max(216),
            desiredSchedule: text.max(160),
            desiredStart: day,
            classroomId: id,
            packageInterest: text.max(160),
            nextOwnerId: id.optional(),
          })
          .strict()
          .parse(body);
        await one(
          "select id from classrooms where organization_id=$1 and id=$2",
          [orgId, input.classroomId],
        );
        if (input.nextOwnerId)
          await one(
            "select id from memberships where organization_id=$1 and user_id=$2 and active and role in ('owner','manager')",
            [orgId, input.nextOwnerId],
          );
        if (["enrolled", "lost"].includes(lead.state)) fail(409, "LEAD_CLOSED");
        await insert(
          "lead-event",
          { leadId: lead.id, status: "qualified", qualification: input },
          null,
          "recorded",
        );
        return update(
          lead,
          {
            ...lead.data,
            ...input,
            qualifiedBy: userId,
            qualifiedAt: new Date().toISOString(),
          },
          "qualified",
        );
      }
      if (method === "POST" && operation === "whatsapp-draft") {
        const input = z
          .object({
            purpose: z.enum(["reply", "follow-up", "tour", "enrollment"]),
            text: text,
          })
          .strict()
          .parse(body);
        if (!/^\+?[\d\s()-]{8,24}$/.test(lead.data.contact))
          fail(422, "WHATSAPP_PHONE_REQUIRED");
        return insert(
          "whatsapp-draft",
          {
            leadId: lead.id,
            purpose: input.purpose,
            text: input.text,
            phone: lead.data.contact.replace(/\D/g, ""),
            mode: "manual-copy",
            delivery: "not-sent",
          },
          null,
          "draft",
        );
      }
      if (method === "POST" && operation === "confirm-enrollment") {
        const input = z
          .object({
            name: text.max(160),
            classroomId: id,
            email: z.email(),
            packageName: text.max(160),
            packagePrice: z.number().int().positive().max(1000000000),
            emergencyName: text.max(160),
            emergencyPhone: z.string().min(6).max(40),
            confirmed: z.literal(true),
          })
          .strict()
          .parse(body);
        return call("POST", `leads/${lead.id}/enroll`, input);
      }
    }
    if (target === "whatsapp-drafts" && method === "POST") {
      const draft = await record(
          id.parse(path.split("/")[2]),
          "whatsapp-draft",
        ),
        operation = path.split("/")[3];
      if (!["copy", "open"].includes(operation)) fail(404, "ROUTE_NOT_FOUND");
      await audit(`whatsapp.${operation}`, draft.id);
      return update(
        draft,
        {
          ...draft.data,
          lastAction: operation,
          lastActionAt: new Date().toISOString(),
          lastActionBy: userId,
        },
        "draft",
      );
    }
  }
  if (path === "leo/caregiver/query" && method === "POST") {
    allow(["owner", "manager", "caregiver"]);
    const input = z
      .object({ childId: id, question: text })
      .strict()
      .parse(body);
    await child(input.childId);
    await q("select record_ai_usage($1)", [input.childId]);
    const rows = (await records(["activity"])).filter(
      (r) => r.child_id === input.childId && r.state === "published",
    );
    await audit("leo.caregiver.query");
    return {
      ...factsAnswer(input.question, rows),
      provider: "not-connected",
      requiresHumanReview: true,
    };
  }
  return undefined;
}
