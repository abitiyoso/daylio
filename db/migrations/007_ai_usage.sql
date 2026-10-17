CREATE FUNCTION record_ai_usage(target_child uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF app_role() IS NULL OR (target_child IS NOT NULL AND NOT can_child(target_child)) THEN RAISE EXCEPTION 'forbidden'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(app_org()::text||app_user()::text));
 IF (SELECT count(*) FROM records WHERE organization_id=app_org() AND kind='ai-query' AND created_by=app_user() AND created_at>now()-interval '1 day')>=100 THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='AI daily limit reached'; END IF;
 INSERT INTO records(organization_id,child_id,kind,data,state,created_by) VALUES(app_org(),target_child,'ai-query','{"mode":"verified-records"}','recorded',app_user());
END $$;
REVOKE ALL ON FUNCTION record_ai_usage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_ai_usage(uuid) TO daylio_app;
INSERT INTO schema_migrations(version) VALUES(7);
