export async function runWorker(db) {
  const q = async (s, p = []) => {
    const result = await db.query(s, p);
    return result.rows ?? result;
  };
  const [{ locked }] = await q(
    "select pg_try_advisory_xact_lock(914204) locked",
  );
  if (!locked) return { skipped: true };
  await q(
    "insert into delivery_attempts(notification_id,status) select n.id,'delivered' from notifications n where not exists(select 1 from delivery_attempts d where d.notification_id=n.id and d.status='delivered')",
  );
  const due = await q(
    "select * from records where kind='followup' and state='draft' and (data->>'dueAt')::timestamptz<=now() for update skip locked",
  );
  for (const task of due) {
    await q(
      "insert into notifications(organization_id,user_id,event_key,kind) select organization_id,user_id,$1||':due','followup' from memberships where organization_id=$2 and active and role in ('owner','manager') on conflict do nothing",
      [task.id, task.organization_id],
    );
    await q(
      "update records set state='notified',updated_at=now() where id=$1",
      [task.id],
    );
    await q(
      "insert into audit_logs(organization_id,actor_id,action,resource_id) values($1,$2,'followup.notify',$3)",
      [task.organization_id, task.created_by, task.id],
    );
  }
  const jobs = await q(
    "select * from records where kind='retention-job' and state='draft' for update skip locked",
  );
  for (const job of jobs) {
    if (
      !["ai-query", "integration-status"].includes(job.data.kind) ||
      new Date(job.data.before) > new Date(Date.now() - 30 * 86400000)
    )
      continue;
    await q(
      "delete from records r where organization_id=$1 and kind=$2 and created_at<$3 and not exists(select 1 from record_history h where h.record_id=r.id)",
      [job.organization_id, job.data.kind, job.data.before],
    );
    await q(
      "update records set state='completed',updated_at=now() where id=$1",
      [job.id],
    );
    await q(
      "insert into audit_logs(organization_id,actor_id,action,resource_id) values($1,$2,'retention.complete',$3)",
      [job.organization_id, job.created_by, job.id],
    );
  }
  return { followups: due.length, retentionJobs: jobs.length };
}
