CREATE POLICY guardian_write ON guardian_child_links FOR ALL USING(organization_id=app_org() AND app_role() IN ('owner','manager')) WITH CHECK(organization_id=app_org() AND app_role() IN ('owner','manager'));
CREATE POLICY assignment_write ON staff_assignments FOR ALL USING(organization_id=app_org() AND app_role() IN ('owner','manager')) WITH CHECK(organization_id=app_org() AND app_role() IN ('owner','manager'));
CREATE POLICY invite_write ON invitations FOR ALL USING(organization_id=app_org() AND (app_role()='owner' OR (app_role()='manager' AND role IN ('caregiver','parent')))) WITH CHECK(organization_id=app_org() AND (app_role()='owner' OR (app_role()='manager' AND role IN ('caregiver','parent'))));
CREATE POLICY own_idempotency ON idempotency_keys FOR ALL USING(organization_id=app_org() AND user_id=app_user()) WITH CHECK(organization_id=app_org() AND user_id=app_user());
CREATE FUNCTION enqueue_event(event text, event_kind text, target_child uuid, management_only boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF app_role() IS NULL OR (target_child IS NOT NULL AND NOT can_child(target_child)) THEN RAISE EXCEPTION 'forbidden'; END IF;
 INSERT INTO notifications(organization_id,user_id,child_id,event_key,kind)
 SELECT app_org(),m.user_id,target_child,event,event_kind FROM memberships m WHERE m.organization_id=app_org() AND m.active AND (m.role IN ('owner','manager') OR (NOT management_only AND m.role='parent' AND EXISTS(SELECT 1 FROM guardian_child_links g WHERE g.organization_id=app_org() AND g.child_id=target_child AND g.user_id=m.user_id AND g.revoked_at IS NULL))) ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION enqueue_event(text,text,uuid,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION enqueue_event(text,text,uuid,boolean) TO daylio_app;
INSERT INTO schema_migrations(version) VALUES(2);
