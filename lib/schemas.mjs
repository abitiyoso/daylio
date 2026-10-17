import { z } from "zod";
const text = z.string().trim().min(1).max(2000),
  uuid = z.uuid(),
  date = z.iso.datetime({ offset: true });
export const schemas = {
  settings: z.object({
    name: text.optional(),
    hours: text,
    timezone: z.literal("Asia/Jakarta"),
    routinePublishing: z.enum(["caregiver", "manager-review"]).optional(),
    substituteReview: z.boolean().optional(),
    managerFinance: z.boolean().optional(),
    managerCrm: z.boolean().optional(),
  }),
  "care-instruction": z.object({ note: text }),
  shift: z.object({
    userId: uuid,
    startsAt: date,
    endsAt: date,
    onDuty: z.boolean(),
  }),
  attendance: z.object({
    type: z.enum(["in", "out"]),
    corrects: uuid.optional(),
    reason: text.optional(),
  }),
  "pickup-authorization": z.object({
    name: text,
    relationship: text,
    expiresAt: date,
  }),
  activity: z.object({
    type: z.enum(["meal", "sleep", "play", "learning", "hygiene", "note"]),
    note: text,
    occurredAt: date,
    result: text.max(160).optional(),
    batchId: uuid.optional(),
    reviewRequired: z.boolean().optional(),
  }),
  media: z.object({
    activityId: uuid,
    mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
    size: z.number().int().min(1).max(5242880),
    depictedChildIds: z.array(uuid).min(1).max(30).optional(),
  }),
  handoff: z.object({ recipientId: uuid, note: text }),
  incident: z.object({
    severity: z.enum(["low", "medium", "critical"]),
    note: text,
  }),
  "incident-update": z.object({
    incidentId: uuid,
    note: text,
    parentVisible: z.boolean().default(false),
  }),
  announcement: z.object({ title: text, note: text }),
  message: z.object({ note: text, recipientId: uuid.optional() }),
  lead: z.object({
    name: text,
    contact: text,
    source: text,
    notes: text.optional(),
  }),
  tour: z.object({
    leadId: uuid,
    startsAt: date,
    endsAt: date,
    timezone: z.literal("Asia/Jakarta"),
  }),
  trial: z.object({ leadId: uuid, startsAt: date, note: text }),
  followup: z.object({ leadId: uuid, dueAt: date, note: text }),
  consent: z.object({
    scope: z.enum(["care", "media", "cctv", "ai"]),
    version: text,
    granted: z.literal(true),
  }),
  "data-request": z.object({ type: z.enum(["export", "delete"]), note: text }),
  "camera-link": z.object({
    externalCameraId: text,
    classroomId: uuid,
    area: z.enum(["shared-play", "shared-learning"]),
  }),
  "camera-policy": z.object({
    cameraLinkId: uuid,
    sharedRoomApproved: z.literal(true),
    hours: text,
  }),
  "ai-draft": z.object({ note: text, sources: z.array(uuid).max(100) }),
  "fee-plan": z.object({
    name: text,
    amount: z.number().int().positive(),
    currency: z.literal("IDR"),
  }),
  invoice: z.object({
    dueAt: date,
    lines: z
      .array(
        z.object({ description: text, amount: z.number().int().positive() }),
      )
      .min(1)
      .max(50),
  }),
  subscription: z.object({
    plan: z.enum(["trial", "active", "suspended"]),
    limit: z.number().int().positive(),
  }),
  "retention-job": z.object({
    before: date,
    kind: z.enum(["ai-query", "integration-status"]),
  }),
};
export const uuidSchema = uuid;
for (const key of Object.keys(schemas)) schemas[key] = schemas[key].strict();
export const ownerKinds = new Set([
  "settings",
  "shift",
  "care-instruction",
  "lead",
  "tour",
  "trial",
  "followup",
  "announcement",
  "camera-link",
  "camera-policy",
  "fee-plan",
  "invoice",
  "retention-job",
  "subscription",
]);
export const childKinds = new Set([
  "care-instruction",
  "attendance",
  "pickup-authorization",
  "activity",
  "media",
  "incident",
  "incident-update",
  "message",
  "consent",
  "data-request",
  "ai-draft",
  "invoice",
]);
export function authorizeCreate(role, kind) {
  if (role === "owner") return kind !== "subscription";
  if (role === "manager")
    return ![
      "subscription",
      "camera-link",
      "camera-policy",
      "retention-job",
    ].includes(kind);
  if (role === "caregiver")
    return [
      "attendance",
      "activity",
      "media",
      "handoff",
      "incident",
      "incident-update",
      "message",
      "ai-draft",
    ].includes(kind);
  if (role === "parent")
    return [
      "message",
      "consent",
      "data-request",
      "pickup-authorization",
    ].includes(kind);
  return false;
}
export function factsAnswer(question, activities) {
  const types = /makan|meal/i.test(question)
    ? ["meal"]
    : /tidur|sleep/i.test(question)
      ? ["sleep"]
      : null;
  const sources = activities
    .filter((a) => !types || types.includes(a.data.type))
    .map((a) => ({
      id: a.id,
      time: a.data.occurredAt,
      note: a.data.note,
      type: a.data.type,
    }));
  return {
    mode: "verified-records",
    answer: sources.length
      ? sources.map((s) => `${s.time} · ${s.type}: ${s.note}`).join("\n")
      : "Belum ada informasi dalam catatan yang dipublikasikan.",
    sources,
  };
}
