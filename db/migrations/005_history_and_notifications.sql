CREATE TABLE record_history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),record_id uuid NOT NULL,actor_id uuid NOT NULL,before_data jsonb NOT NULL,after_data jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),FOREIGN KEY(organization_id,record_id) REFERENCES records(organization_id,id));
ALTER TABLE record_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY history_read ON record_history FOR SELECT USING(organization_id=app_org() AND app_role() IN ('owner','manager'));
GRANT SELECT ON record_history TO daylio_app;
CREATE FUNCTION preserve_record_history() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN INSERT INTO record_history(organization_id,record_id,actor_id,before_data,after_data) VALUES(OLD.organization_id,OLD.id,coalesce(app_user(),NEW.created_by),jsonb_build_object('data',OLD.data,'state',OLD.state),jsonb_build_object('data',NEW.data,'state',NEW.state));RETURN NEW;END $$;
CREATE TRIGGER record_history BEFORE UPDATE ON records FOR EACH ROW EXECUTE FUNCTION preserve_record_history();
CREATE TRIGGER immutable_record_history BEFORE UPDATE OR DELETE ON record_history FOR EACH ROW EXECUTE FUNCTION immutable_audit();
CREATE OR REPLACE FUNCTION enqueue_event(event text,event_kind text,target_child uuid,management_only boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF app_role() IS NULL OR (target_child IS NOT NULL AND NOT can_child(target_child)) THEN RAISE EXCEPTION 'forbidden'; END IF;
 INSERT INTO notifications(organization_id,user_id,child_id,event_key,kind)
 SELECT app_org(),m.user_id,target_child,event,event_kind FROM memberships m WHERE m.organization_id=app_org() AND m.active AND (m.role IN ('owner','manager') OR (NOT management_only AND m.role='parent' AND ((target_child IS NULL AND event_kind='announcement') OR EXISTS(SELECT 1 FROM guardian_child_links g WHERE g.organization_id=app_org() AND g.child_id=target_child AND g.user_id=m.user_id AND g.revoked_at IS NULL)))) ON CONFLICT DO NOTHING;
END $$;
CREATE POLICY staff_members_lookup ON memberships FOR SELECT USING(organization_id=app_org() AND app_role()='caregiver' AND role IN ('caregiver','manager','owner'));
INSERT INTO schema_migrations(version) VALUES(5);
