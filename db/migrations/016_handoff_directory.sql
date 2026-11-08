-- Minimal same-tenant staff directory for shift handovers; no emails or child data.
CREATE FUNCTION handoff_staff() RETURNS TABLE(user_id uuid,display_name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT m.user_id,m.display_name FROM memberships m WHERE m.organization_id=app_org() AND m.active AND m.role IN ('owner','manager','caregiver') AND app_role() IN ('owner','manager','caregiver') AND m.user_id<>app_user()
$$;
REVOKE ALL ON FUNCTION handoff_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION handoff_staff() TO daylio_app;
INSERT INTO schema_migrations(version) VALUES(16);
