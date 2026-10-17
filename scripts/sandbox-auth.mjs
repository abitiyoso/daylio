// Isolated test identity fixture. Never deploy this process or point production at it.
import { createServer } from "node:http";
import { randomUUID, randomBytes } from "node:crypto";
import { sandbox } from "../db/sandbox-fixture.mjs";
export function startSandboxAuth(port = 4011) {
  const mail = [],
    proofs = new Map(),
    passwords = new Map();
  const sessions = new Map(),
    refresh = new Map();
  const users = new Map(
    [
      "owner",
      "caregiver",
      "parent",
      "manager",
      "otherOwner",
      "otherParent",
      "admin",
    ].map((role) => [
      `${role.toLowerCase()}@daylio.test`,
      {
        id: sandbox[role],
        email: `${role.toLowerCase()}@daylio.test`,
        email_confirmed_at: new Date().toISOString(),
      },
    ]),
  );
  const server = createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    let text = "";
    for await (const c of req) {
      text += c;
      if (text.length > 4096) {
        res.writeHead(413);
        res.end("{}");
        return;
      }
    }
    let body;
    try {
      body = JSON.parse(text || "{}");
    } catch {
      res.writeHead(422);
      res.end("{}");
      return;
    }
    const send = (status, value) => {
      res.writeHead(status);
      res.end(JSON.stringify(value));
    };
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (url.pathname === "/__test/mail") return send(200, mail);
    if (url.pathname === "/auth/v1/otp") {
      const email = body.email.toLowerCase();
      if (!email.endsWith("@daylio.test")) return send(403, {});
      const user = users.get(email) || { id: randomUUID(), email };
      users.set(email, user);
      const proof = randomBytes(32).toString("hex");
      proofs.set(proof, {
        user,
        redirect: url.searchParams.get("redirect_to"),
      });
      mail.push({
        email,
        link: `http://127.0.0.1:${port}/auth/v1/verify?token=${proof}`,
      });
      return send(200, {});
    }
    if (url.pathname === "/auth/v1/verify") {
      const item = proofs.get(url.searchParams.get("token"));
      if (!item) return send(403, {});
      proofs.delete(url.searchParams.get("token"));
      item.user.email_confirmed_at = new Date().toISOString();
      const access_token = randomBytes(32).toString("hex"),
        refresh_token = randomBytes(32).toString("hex");
      sessions.set(access_token, item.user);
      refresh.set(refresh_token, item.user);
      const target = new URL(item.redirect);
      target.hash = new URLSearchParams({
        access_token,
        refresh_token,
        type: "magiclink",
      }).toString();
      res.writeHead(302, { Location: target.href });
      res.end();
      return;
    }
    if (req.url === "/auth/v1/user") {
      const token = req.headers.authorization?.replace("Bearer ", "");
      const user = sessions.get(token);
      if (!user) return send(401, {});
      if (req.method === "PUT" && body.password)
        passwords.set(user.email, body.password);
      return send(200, user);
    }
    if (req.url?.startsWith("/auth/v1/token")) {
      const user = body.refresh_token
        ? refresh.get(body.refresh_token)
        : body.password ===
            (passwords.get(body.email?.toLowerCase()) || "Sandbox-only-2026!")
          ? users.get(body.email?.toLowerCase())
          : null;
      if (!user) return send(401, {});
      if (body.refresh_token) refresh.delete(body.refresh_token);
      const access_token = randomBytes(32).toString("hex"),
        refresh_token = randomBytes(32).toString("hex");
      sessions.set(access_token, user);
      refresh.set(refresh_token, user);
      return send(200, { access_token, refresh_token, expires_in: 3600, user });
    }
    if (req.url === "/auth/v1/logout") {
      const token = req.headers.authorization?.replace("Bearer ", "");
      const user = sessions.get(token);
      sessions.delete(token);
      for (const [k, u] of refresh) if (u?.id === user?.id) refresh.delete(k);
      return send(200, {});
    }
    return send(503, { error: "Not implemented by isolated identity fixture" });
  });
  server.listen(port, "127.0.0.1");
  return server;
}
