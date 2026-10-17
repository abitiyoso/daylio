-- Management INSERT ... RETURNING must not depend on a stable helper's pre-insert snapshot.
DROP POLICY children_read ON children;
CREATE POLICY children_read ON children FOR SELECT USING(organization_id=app_org() AND (app_role() IN ('owner','manager') OR can_child(id)));
INSERT INTO schema_migrations(version) VALUES(4);
