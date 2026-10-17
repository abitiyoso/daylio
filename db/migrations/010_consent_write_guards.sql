-- An administrator may view consent records, but cannot grant a guardian's consent.
DROP POLICY records_insert ON records;
CREATE POLICY records_insert ON records FOR INSERT WITH CHECK(organization_id=app_org() AND created_by=app_user() AND ((app_role() IN ('owner','manager') AND kind<>'consent') OR (app_role()='caregiver' AND ((child_id IS NOT NULL AND can_child(child_id) AND kind IN ('activity','attendance','media','incident','incident-update','message','ai-draft','pickup')) OR kind='handoff')) OR (app_role()='parent' AND state='draft' AND child_id IS NOT NULL AND can_child(child_id) AND kind IN ('message','consent','data-request','pickup-authorization'))));
INSERT INTO schema_migrations(version) VALUES(10);
