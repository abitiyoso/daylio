-- Integration metadata only. No video storage, streaming gateway or analytics engine.
CREATE TABLE camera_registry(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),classroom_id uuid NOT NULL,name text NOT NULL CHECK(length(name) BETWEEN 1 AND 160),external_id text NOT NULL CHECK(external_id ~ '^[A-Za-z0-9_.:-]{1,160}$'),area text NOT NULL CHECK(area IN ('shared-play','shared-learning','lobby')),enabled boolean NOT NULL DEFAULT true,created_by uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(organization_id,id),UNIQUE(organization_id,external_id),FOREIGN KEY(organization_id,classroom_id) REFERENCES classrooms(organization_id,id));
CREATE TABLE video_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),camera_id uuid NOT NULL,external_event_id text NOT NULL CHECK(length(external_event_id) BETWEEN 1 AND 160),event_type text NOT NULL CHECK(event_type IN ('restricted-zone','occupancy','offline')),occurred_at timestamptz NOT NULL,confidence numeric CHECK(confidence BETWEEN 0 AND 1),state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','reviewed')),review_note text,reviewed_by uuid,reviewed_at timestamptz,received_at timestamptz NOT NULL DEFAULT now(),UNIQUE(organization_id,camera_id,external_event_id),FOREIGN KEY(organization_id,camera_id) REFERENCES camera_registry(organization_id,id));
CREATE INDEX video_events_scope ON video_events(organization_id,state,occurred_at DESC);
ALTER TABLE camera_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY registry_read ON camera_registry FOR SELECT TO daylio_app USING(organization_id=app_org() AND app_role() IN ('owner','manager'));
CREATE POLICY registry_create ON camera_registry FOR INSERT TO daylio_app WITH CHECK(organization_id=app_org() AND app_role() IN ('owner','manager') AND created_by=app_user());
CREATE POLICY registry_update ON camera_registry FOR UPDATE TO daylio_app USING(organization_id=app_org() AND app_role() IN ('owner','manager')) WITH CHECK(organization_id=app_org() AND app_role() IN ('owner','manager'));
CREATE POLICY video_events_read ON video_events FOR SELECT TO daylio_app USING(organization_id=app_org() AND app_role() IN ('owner','manager'));
CREATE POLICY video_events_review ON video_events FOR UPDATE TO daylio_app USING(organization_id=app_org() AND app_role() IN ('owner','manager')) WITH CHECK(organization_id=app_org() AND app_role() IN ('owner','manager') AND state='reviewed' AND reviewed_by=app_user() AND review_note IS NOT NULL);
GRANT SELECT,INSERT ON camera_registry TO daylio_app;
GRANT UPDATE(enabled) ON camera_registry TO daylio_app;
GRANT SELECT ON video_events TO daylio_app;
GRANT UPDATE(state,review_note,reviewed_by,reviewed_at) ON video_events TO daylio_app;
INSERT INTO schema_migrations(version) VALUES(17);
