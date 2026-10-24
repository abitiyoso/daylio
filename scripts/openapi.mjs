import { writeFile, mkdir } from "node:fs/promises";
import { z } from "zod";
import { schemas } from "../lib/schemas.mjs";
const paths = {};
const errors = {
  401: { description: "Authentication required" },
  403: { description: "Permission denied" },
  404: { description: "Hidden or missing resource" },
  409: { description: "State/idempotency conflict" },
  422: { description: "Invalid input" },
  429: { description: "Rate limited" },
  503: { description: "Dependency unavailable" },
};
function add(
  path,
  methods,
  { kind, publicRoute = false, description = "" } = {},
) {
  paths["/api/v1/" + path] ??= {};
  for (const method of methods.split(",")) {
    const parameters = [...path.matchAll(/\{(\w+)\}/g)].map((m) => ({
      name: m[1],
      in: "path",
      required: true,
      schema: { type: "string" },
    }));
    if (!publicRoute)
      parameters.push({
        name: "X-Organization-Id",
        in: "header",
        required:
          !["me/memberships", "organizations"].includes(path) &&
          !path.startsWith("platform/"),
        schema: { type: "string", format: "uuid" },
      });
    if (method === "post")
      parameters.push({
        name: "Idempotency-Key",
        in: "header",
        required: false,
        schema: { type: "string", minLength: 8, maxLength: 160 },
      });
    const operation = {
      operationId: method + "_" + path.replace(/[^\w]/g, "_"),
      description:
        description ||
        `Daylio ${path}. Data is scoped by verified membership and database RLS.`,
      security: publicRoute ? [] : [{ BearerAuth: [] }, { CookieAuth: [] }],
      parameters,
      responses: {
        200: {
          description:
            "Success; JSON envelope {data, requestId} unless auth/public endpoint",
        },
        ...errors,
      },
    };
    if (method === "post")
      operation.responses["201"] = {
        description: "Created or idempotent result",
      };
    if (["post", "patch"].includes(method))
      operation.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: kind
              ? {
                  type: "object",
                  properties: {
                    childId: { type: "string", format: "uuid" },
                    data: { $ref: `#/components/schemas/${kind}` },
                  },
                  required: ["data"],
                }
              : { type: "object", additionalProperties: true },
          },
        },
      };
    paths["/api/v1/" + path][method] = operation;
  }
}
add("health/ready", "get", { publicRoute: true });
add("public/demo-requests", "post", {
  publicRoute: true,
  description:
    "Persist contact consent + lead; honeypot, rate limit and fingerprint dedup. Returns recorded, never claims WhatsApp sent.",
});
for (const action of [
  "session",
  "signup",
  "login",
  "recover",
  "refresh",
  "logout",
  "password",
])
  add("auth/" + action, "post", { publicRoute: action !== "password" });
add("me", "get");
add("me/memberships", "get");
add("organizations", "post");
add("organizations/current", "get,patch");
for (const name of ["branches", "classrooms", "children"]) {
  add(name, "get,post");
  add(name + "/{id}", "get,patch");
}
add("children/{id}/archive", "post");
add("children/{id}/timeline", "get");
add("children/{id}/guardians", "get,post");
add("guardians/{id}", "delete");
add("staff", "get");
add("staff/directory", "get");
add("public/inquiries/{organizationId}", "post", {
  publicRoute: true,
  description:
    "Consent + rate-limited daycare inquiry. Returns a private prospect token only on first creation. Contact duplicates do not expose existing tokens.",
});
add("public/tours/{organizationId}", "post", {
  publicRoute: true,
  description:
    "Private prospect token authorizes a requested survey; staff confirmation is separate.",
});
add("invitations/{id}/email", "post", {
  description:
    "Manager/owner requests provider verification email for a valid invitation; activation requires verified matching identity.",
});
add("staff/{id}", "patch");
add("staff-assignments", "get,post");
add("staff-assignments/{id}", "delete");
add("invitations", "get,post");
for (const action of ["accept", "revoke", "resend"])
  add(`invitations/{id}/${action}`, "post", {
    description:
      action === "accept"
        ? "Verified matching email and unexpired hashed invitation token; does not require a prior tenant membership."
        : "Management invitation action.",
  });
const kinds = {
  activities: "activity",
  attendance: "attendance",
  "pickup-authorizations": "pickup-authorization",
  shifts: "shift",
  handoffs: "handoff",
  incidents: "incident",
  announcements: "announcement",
  messages: "message",
  leads: "lead",
  tours: "tour",
  trials: "trial",
  "follow-up-tasks": "followup",
  consents: "consent",
  "data-requests": "data-request",
  "fee-plans": "fee-plan",
  invoices: "invoice",
  settings: "settings",
  "care-instructions": "care-instruction",
};
for (const [name, kind] of Object.entries(kinds)) {
  add(name, "get,post", { kind });
  add(name + "/{id}", "get");
}
for (const name of [
  "activities",
  "leads",
  "settings",
  "follow-up-tasks",
  "tours",
  "shifts",
  "care-instructions",
])
  add(name + "/{id}", "patch", { kind: kinds[name] });
for (const [name, actions] of Object.entries({
  activities: ["publish"],
  attendance: ["correct"],
  "pickup-authorizations": ["approve"],
  pickups: ["verify-handover"],
  incidents: ["acknowledge", "updates", "resolve"],
  announcements: ["publish"],
  handoffs: ["acknowledge"],
  leads: ["status", "enroll"],
  tours: ["confirm"],
  consents: ["revoke"],
  invoices: ["record-manual-payment", "remind"],
  "data-requests": ["approve-export"],
}))
  for (const action of actions) add(`${name}/{id}/${action}`, "post");
add("activities/batch", "post");
add("activities/{id}/history", "get");
add("leads/{id}/history", "get");
add("data-requests/{id}/download", "get");
for (const path of [
  "parent/home",
  "owner/overview",
  "owner/enrollment-funnel",
  "reports/operations",
  "notifications",
  "audit",
  "subscription",
])
  add(path, "get");
add("notifications/{id}/read", "patch");
add("media", "get");
add("media/upload-intent", "post", { kind: "media" });
add("media/{id}/attach", "post");
add("media/{id}/access", "get");
add("media/{id}/content", "get,put", {
  description:
    "PUT: raw image bytes, declared MIME, max 5 MiB. GET: expiring user-bound signed query plus authenticated identity; organization passed as signed org query. JSON requestBody does not apply.",
});
for (const path of [
  "leo/parent/query",
  "leo/owner/query",
  "leo/caregiver/draft-summary",
  "leo/drafts/{id}/approve",
])
  add(path, "post");
for (const path of ["cameras/authorized", "owner/analytics-events"])
  add(path, "get", {
    description:
      "Disabled until actual Elenio API is verified. Returns 503; no fake live state.",
  });
add("camera-sessions", "post", {
  description: "Disabled: never issues an unverified playback grant.",
});
add("platform/tenants", "get");
add("platform/demo-requests", "get");
add("platform/support-access", "post");
add("platform/subscriptions", "post");
add("platform/tenants/{id}/health", "get");
add("platform/tenants/{id}/suspend", "post");
add("support-access", "get");
add("support-access/{id}/approve", "post");
add("support-access/{id}/revoke", "post");
add("retention-jobs", "get,post", { kind: "retention-job" });
add("payments/provider-webhook", "post", {
  publicRoute: true,
  description:
    "Disabled (503) until payment provider is selected and signature, amount, currency, replay and reconciliation checks are verified.",
});
// Backend v3 commands retain the same authenticated /api/v1 boundary.
for (const path of [
  "workspace/context",
  "care/today",
  "care/policy",
  "manager/exceptions",
  "manager/closing",
  "owner/business-pulse",
  "parent/today",
  "passports/{childId}",
  "crm/overview",
  "development-reports/{id}/pdf",
])
  add(path, "get");
for (const path of [
  "morning-notes",
  "daily-stories",
  "pickup-authorizations",
  "passport-changes",
  "observations",
  "development-reports",
  "development-rubrics",
])
  add(path, "get,post", {
    description:
      "Backend v3 scoped workflow. See docs/BACKEND_V3_API.md for strict command payloads, permissions and transitions.",
  });
for (const path of ["morning-notes/{id}", "daily-stories/{id}"])
  add(path, "patch");
for (const path of [
  "activities/batches/{batchId}/publish",
  "morning-notes/{id}/acknowledge",
  "manager/closing",
  "daily-stories/{id}/publish",
  "pickup-authorizations/{id}/approve",
  "pickup-authorizations/{id}/revoke",
  "pickups/{id}/verify-handover",
  "passport-changes/{id}/approve",
  "passport-changes/{id}/reject",
  "observations/{id}/submit",
  "observations/{id}/approve",
  "observations/{id}/reject",
  "development-reports/{id}/publish",
  "crm/leads/{id}/qualify",
  "crm/leads/{id}/whatsapp-draft",
  "crm/leads/{id}/confirm-enrollment",
  "crm/whatsapp-drafts/{id}/copy",
  "crm/whatsapp-drafts/{id}/open",
  "leo/caregiver/query",
])
  add(path, "post", {
    description:
      "Strict authenticated command; server-side permission and state checks. See docs/BACKEND_V3_API.md.",
  });
for (const [path, methods] of [
  ["owner/summary", "get"],
  ["workspace/search", "get"],
  ["care/handoff-options", "get"],
  ["planner/overview", "get"],
  ["planner/history/{id}", "get"],
  ["planner/bookings", "post"],
  ["planner/bookings/{id}", "patch"],
  ["planner/bookings/{id}/cancel", "post"],
  ["planner/shifts", "post"],
  ["planner/shifts/{id}", "patch"],
  ["planner/shifts/{id}/cancel", "post"],
  ["commercial/context", "get"],
  ["commercial/invoices", "post"],
  ["commercial/addons", "post"],
  ["billing/overview", "get"],
  ["billing/recurring", "get,post"],
  ["billing/recurring/{id}/generate", "post"],
  ["billing/recurring/{id}/stop", "post"],
  ["family/billing", "get"],
  ["family/receipts/{id}", "get"],
  ["platform/saas-invoices", "get"],
  ["platform/saas-invoices/{id}/verify", "post"],
  ["integrations/overview", "get"],
  ["integrations/registry", "post"],
  ["integrations/registry/{id}/disable", "post"],
  ["integrations/events/{id}/review", "post"],
  ["integrations/events/{id}/link-incident", "post"],
  ["leo/work-items", "get,post"],
  ...["draft", "approve", "execute", "cancel"].map((action) => [
    "leo/work-items/{id}/" + action,
    "post",
  ]),
])
  add(path, methods, {
    description:
      "Authenticated v10 workflow. Role, plan, RLS and state checks apply; strict request DTO and provider limitations: docs/BACKEND_V10_API.md.",
  });
add("integrations/elenio/events", "post", {
  publicRoute: true,
  description:
    "Disabled by default Daylio metadata bridge proposal; requires configured HMAC signature and timestamp, registered camera and deduplicated provider event ID. Not an official verified Elenio contract. See docs/BACKEND_V10_API.md.",
});
const spec = {
  openapi: "3.1.0",
  info: {
    title: "Daylio API",
    version: "0.1.0",
    description:
      "Implemented route inventory; some endpoints explicitly disabled. Domain input schemas are strict. Generic auth/command DTOs currently require the accompanying API notes; not a generated Flutter SDK.",
  },
  servers: [{ url: "/" }],
  paths,
  components: {
    securitySchemes: {
      BearerAuth: { type: "http", scheme: "bearer" },
      CookieAuth: { type: "apiKey", in: "cookie", name: "daylio_access" },
    },
    schemas: Object.fromEntries(
      Object.entries(schemas).map(([key, value]) => [
        key,
        z.toJSONSchema(value),
      ]),
    ),
  },
};
await mkdir("docs", { recursive: true });
await writeFile("docs/openapi.json", JSON.stringify(spec, null, 2));
console.log(`OpenAPI: ${Object.keys(paths).length} paths`);
