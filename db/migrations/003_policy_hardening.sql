CREATE POLICY org_update ON organizations FOR UPDATE USING(id=app_org() AND app_role()='owner') WITH CHECK(id=app_org());
DROP POLICY records_insert ON records;
CREATE POLICY records_insert ON records FOR INSERT WITH CHECK(organization_id=app_org() AND created_by=app_user() AND (app_role() IN ('owner','manager') OR (app_role()='caregiver' AND ((child_id IS NOT NULL AND can_child(child_id) AND kind IN ('activity','attendance','media','incident','incident-update','message','ai-draft','pickup')) OR kind='handoff')) OR (app_role()='parent' AND child_id IS NOT NULL AND can_child(child_id) AND kind IN ('message','consent','data-request','pickup-authorization'))));
-- No direct anonymous/global reads of operational queues or public lead details.
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_attempts ENABLE ROW LEVEL SECURITY;
INSERT INTO schema_migrations(version) VALUES(3);
