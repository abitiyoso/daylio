CREATE TABLE platform_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),kind text NOT NULL,resource_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(kind,resource_id));
ALTER TABLE platform_events ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER immutable_platform_events BEFORE UPDATE OR DELETE ON platform_events FOR EACH ROW EXECUTE FUNCTION immutable_audit();
INSERT INTO schema_migrations(version) VALUES(6);
