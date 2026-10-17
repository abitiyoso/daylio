CREATE POLICY parent_care_updates ON records FOR SELECT USING(organization_id=app_org() AND app_role()='parent' AND can_child(child_id) AND ((kind='incident-update' AND state='published' AND data->>'parentVisible'='true') OR (kind='message' AND data->>'audience'='guardians')));
CREATE FUNCTION is_linked_guardian(target uuid,target_child uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT can_child(target_child) AND EXISTS(SELECT 1 FROM guardian_child_links g JOIN memberships m ON m.user_id=g.user_id AND m.organization_id=g.organization_id WHERE g.organization_id=app_org() AND g.child_id=target_child AND g.user_id=target AND g.revoked_at IS NULL AND m.active AND m.role='parent') $$;
REVOKE ALL ON FUNCTION is_linked_guardian(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_linked_guardian(uuid,uuid) TO daylio_app;
INSERT INTO schema_migrations(version) VALUES(8);
