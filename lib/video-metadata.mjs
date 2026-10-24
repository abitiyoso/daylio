import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
const ingestion = z
  .object({
    organizationId: z.uuid(),
    cameraId: z.uuid(),
    eventId: z.string().trim().min(1).max(160),
    type: z.enum(["restricted-zone", "occupancy", "offline"]),
    occurredAt: z.iso.datetime({ offset: true }),
    confidence: z.number().min(0).max(1).optional(),
  })
  .strict();
export function verifyVideoWebhook(
  raw,
  headers,
  { secret = "", enabled = false, now = Date.now() } = {},
) {
  const deny = (status, code) => {
    throw Object.assign(new Error(code), { status, code });
  };
  if (!enabled || !secret || secret.length < 32)
    deny(503, "ELENIO_NOT_CONFIGURED");
  const timestamp = headers.get("x-daylio-timestamp"),
    signature = headers.get("x-daylio-signature");
  if (
    !/^\d{13}$/.test(timestamp || "") ||
    Math.abs(now - Number(timestamp)) > 300000 ||
    !/^v1=[a-f0-9]{64}$/.test(signature || "")
  )
    deny(401, "INVALID_WEBHOOK_SIGNATURE");
  const expected = createHmac("sha256", secret)
    .update(timestamp + "." + raw)
    .digest();
  if (!timingSafeEqual(expected, Buffer.from(signature.slice(3), "hex")))
    deny(401, "INVALID_WEBHOOK_SIGNATURE");
  const event = ingestion.parse(JSON.parse(raw));
  if (Date.parse(event.occurredAt) > now + 300000) deny(422, "FUTURE_EVENT");
  return event;
}
export async function ingestVideoEvent(db, event) {
  const q = async (s, p = []) => {
    const r = await db.query(s, p);
    return r.rows ?? r;
  };
  const [camera] = await q(
    "select * from camera_registry where organization_id=$1 and id=$2 and enabled",
    [event.organizationId, event.cameraId],
  );
  if (!camera)
    throw Object.assign(new Error("CAMERA_NOT_REGISTERED"), {
      status: 404,
      code: "CAMERA_NOT_REGISTERED",
    });
  const [row] = await q(
    "insert into video_events(organization_id,camera_id,external_event_id,event_type,occurred_at,confidence) values($1,$2,$3,$4,$5,$6) on conflict(organization_id,camera_id,external_event_id) do nothing returning id",
    [
      event.organizationId,
      event.cameraId,
      event.eventId,
      event.type,
      event.occurredAt,
      event.confidence ?? null,
    ],
  );
  if (row)
    await q(
      "insert into audit_logs(organization_id,actor_id,action,resource_id) values($1,$2,'elenio.metadata.received',$3)",
      [event.organizationId, "00000000-0000-4000-8000-000000000017", row.id],
    );
  return { accepted: true, duplicate: !row, eventId: row?.id || null };
}
export async function videoMetadata(h, ctx, method, path, body) {
  if (!path.startsWith("integrations/")) return { handled: false };
  const { q, one, allow, fail, audit } = h,
    { orgId, userId } = ctx;
  allow();
  const result = async () => {
    if (path === "integrations/overview" && method === "GET")
      return {
        registry: await q(
          "select r.*,c.name classroom_name from camera_registry r join classrooms c on c.id=r.classroom_id and c.organization_id=r.organization_id where r.organization_id=$1 order by r.created_at",
          [orgId],
        ),
        events: await q(
          "select e.*,c.name camera_name from video_events e join camera_registry c on c.id=e.camera_id and c.organization_id=e.organization_id where e.organization_id=$1 order by e.occurred_at desc,e.id desc limit 100",
          [orgId],
        ),
        streaming: "not-configured",
        analytics: "not-configured",
        message:
          "Metadata is not video footage. AI signals require human review.",
      };
    if (path === "integrations/registry" && method === "POST") {
      const data = z
        .object({
          classroomId: z.uuid(),
          name: z.string().trim().min(1).max(160),
          externalId: z.string().regex(/^[A-Za-z0-9_.:-]{1,160}$/),
          area: z.enum(["shared-play", "shared-learning", "lobby"]),
        })
        .strict()
        .parse(body);
      await one(
        "select id from classrooms where organization_id=$1 and id=$2",
        [orgId, data.classroomId],
      );
      const row = await one(
        "insert into camera_registry(organization_id,classroom_id,name,external_id,area,created_by) values($1,$2,$3,$4,$5,$6) returning *",
        [
          orgId,
          data.classroomId,
          data.name,
          data.externalId,
          data.area,
          userId,
        ],
      );
      await audit("camera.registry.create", row.id);
      return row;
    }
    const parts = path.split("/");
    if (
      parts[1] === "events" &&
      parts[3] === "link-incident" &&
      method === "POST"
    ) {
      if (body.confirmed !== true) fail(422, "HUMAN_CONFIRMATION_REQUIRED");
      const event = await one(
        "select * from video_events where organization_id=$1 and id=$2 and state='reviewed' for update",
        [orgId, z.uuid().parse(parts[2])],
      );
      const incident = await one(
        "select r.id from records r join children c on c.id=r.child_id and c.organization_id=r.organization_id join camera_registry cam on cam.organization_id=c.organization_id and cam.classroom_id=c.classroom_id where r.organization_id=$1 and r.id=$2 and r.kind='incident' and cam.id=$3",
        [orgId, z.uuid().parse(body.incidentId), event.camera_id],
      );
      const row = await one(
        "update video_events set incident_id=$3,reviewed_by=$4,reviewed_at=now() where organization_id=$1 and id=$2 returning *",
        [orgId, event.id, incident.id, userId],
      );
      await audit("video.signal.incident-linked", event.id);
      return row;
    }
    if (
      parts[1] === "registry" &&
      parts[3] === "disable" &&
      method === "POST"
    ) {
      const row = await one(
        "update camera_registry set enabled=false where organization_id=$1 and id=$2 returning *",
        [orgId, z.uuid().parse(parts[2])],
      );
      await audit("camera.registry.disable", row.id);
      return row;
    }
    if (parts[1] === "events" && parts[3] === "review" && method === "POST") {
      const note = z.string().trim().min(10).max(2000).parse(body.note);
      await one(
        "select id from video_events where organization_id=$1 and id=$2 and state=$3 for update",
        [orgId, z.uuid().parse(parts[2]), "pending"],
      );
      const row = await one(
        "update video_events set state='reviewed',review_note=$3,reviewed_by=$4,reviewed_at=now() where organization_id=$1 and id=$2 returning *",
        [orgId, parts[2], note, userId],
      );
      await audit("video.signal.review", row.id);
      return row;
    }
    fail(405, "METHOD_NOT_ALLOWED");
  };
  return { handled: true, value: await result() };
}
