import { createHash } from "node:crypto";
export async function acceptInvitation(db, user, token, now = Date.now()) {
  const q = async (s, p = []) => {
    const result = await db.query(s, p);
    return result.rows ?? result;
  };
  const deny = () => {
    throw Object.assign(new Error("Undangan tidak berlaku"), {
      status: 403,
      code: "INVITATION_INVALID",
    });
  };
  const hash = createHash("sha256").update(token).digest("hex");
  const [invite] = await q(
    "select * from invitations where token_hash=$1 for update",
    [hash],
  );
  if (
    !invite ||
    invite.revoked_at ||
    new Date(invite.expires_at).getTime() < now ||
    invite.email !== user.email.toLowerCase() ||
    (invite.accepted_by && invite.accepted_by !== user.id)
  )
    deny();
  const [org] = await q(
    "select id from organizations where id=$1 and not suspended",
    [invite.organization_id],
  );
  if (!org) deny();
  if (invite.accepted_by)
    return { organizationId: invite.organization_id, accepted: true };
  await q(
    "insert into memberships(organization_id,user_id,role,display_name) values($1,$2,$3,$4) on conflict(organization_id,user_id) do nothing",
    [
      invite.organization_id,
      user.id,
      invite.role,
      user.email.split("@")[0].slice(0, 160),
    ],
  );
  if (invite.child_id)
    await q(
      "insert into guardian_child_links(organization_id,child_id,user_id) values($1,$2,$3) on conflict do nothing",
      [invite.organization_id, invite.child_id, user.id],
    );
  await q("update invitations set accepted_by=$1 where id=$2", [
    user.id,
    invite.id,
  ]);
  await q(
    "insert into audit_logs(organization_id,actor_id,action,resource_id) values($1,$2,'invitation.accept',$3)",
    [invite.organization_id, user.id, invite.id],
  );
  return { organizationId: invite.organization_id, accepted: true };
}
