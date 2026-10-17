export const sandbox = {
  org: "10000000-0000-4000-8000-000000000001",
  otherOrg: "10000000-0000-4000-8000-000000000002",
  owner: "20000000-0000-4000-8000-000000000001",
  caregiver: "20000000-0000-4000-8000-000000000002",
  parent: "20000000-0000-4000-8000-000000000003",
  otherOwner: "20000000-0000-4000-8000-000000000004",
  otherParent: "20000000-0000-4000-8000-000000000005",
  manager: "20000000-0000-4000-8000-000000000006",
  admin: "20000000-0000-4000-8000-000000000007",
  branch: "30000000-0000-4000-8000-000000000001",
  otherBranch: "30000000-0000-4000-8000-000000000002",
  room: "40000000-0000-4000-8000-000000000001",
  otherRoom: "40000000-0000-4000-8000-000000000002",
  child: "50000000-0000-4000-8000-000000000001",
  otherChild: "50000000-0000-4000-8000-000000000002",
};
export async function seedSandbox(db) {
  const q = (s, p = []) => db.query(s, p);
  const s = sandbox;
  for (const [o, b, r, c, name] of [
    [s.org, s.branch, s.room, s.child, "SANDBOX Daycare A"],
    [s.otherOrg, s.otherBranch, s.otherRoom, s.otherChild, "SANDBOX Daycare B"],
  ]) {
    await q(
      "insert into organizations(id,name) values($1,$2) on conflict do nothing",
      [o, name],
    );
    await q(
      "insert into branches(id,organization_id,name) values($1,$2,'Utama') on conflict do nothing",
      [b, o],
    );
    await q(
      "insert into classrooms(id,organization_id,branch_id,name) values($1,$2,$3,'Toddler') on conflict do nothing",
      [r, o, b],
    );
    await q(
      "insert into children(id,organization_id,classroom_id,name) values($1,$2,$3,'Anak Sandbox') on conflict do nothing",
      [c, o, r],
    );
  }
  for (const [o, u, role] of [
    [s.org, s.owner, "owner"],
    [s.org, s.caregiver, "caregiver"],
    [s.org, s.parent, "parent"],
    [s.org, s.manager, "manager"],
    [s.otherOrg, s.otherOwner, "owner"],
    [s.otherOrg, s.otherParent, "parent"],
  ])
    await q(
      "insert into memberships(organization_id,user_id,role) values($1,$2,$3) on conflict do nothing",
      [o, u, role],
    );
  await q(
    "insert into guardian_child_links(organization_id,child_id,user_id) values($1,$2,$3) on conflict do nothing",
    [s.org, s.child, s.parent],
  );
  await q(
    "insert into guardian_child_links(organization_id,child_id,user_id) values($1,$2,$3) on conflict do nothing",
    [s.otherOrg, s.otherChild, s.otherParent],
  );
  await q(
    "insert into staff_assignments(organization_id,child_id,user_id) values($1,$2,$3) on conflict do nothing",
    [s.org, s.child, s.caregiver],
  );
  await q(
    "update memberships set display_name=role||' sandbox' where display_name=''",
  );
  await q(
    "insert into platform_admins(user_id) values($1) on conflict do nothing",
    [s.admin],
  );
}
