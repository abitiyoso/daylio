-- Separate Daylio SaaS accounting from daycare-to-family invoice records.
CREATE TABLE plan_catalog(id text PRIMARY KEY CHECK(id IN ('essential','growth','intelligence')),name text NOT NULL,monthly_idr integer NOT NULL CHECK(monthly_idr>0),child_limit integer NOT NULL CHECK(child_limit>0),features jsonb NOT NULL CHECK(jsonb_typeof(features)='array'));
INSERT INTO plan_catalog VALUES('essential','Essential',299000,25,'[]'),('growth','Growth',699000,60,'["crm","scheduling","finance","business-reporting"]'),('intelligence','Intelligence',1490000,120,'["crm","scheduling","finance","business-reporting","leo"]');
CREATE TABLE tenant_subscriptions(organization_id uuid PRIMARY KEY REFERENCES organizations(id),plan_id text NOT NULL REFERENCES plan_catalog(id),state text NOT NULL CHECK(state IN ('legacy','trial','active','expired')),period_end timestamptz,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
-- Preserve existing tenants' working capabilities until an operator configures
-- their commercial terms. This is explicitly a migration entitlement, not paid status.
INSERT INTO tenant_subscriptions(organization_id,plan_id,state) SELECT id,'intelligence','legacy' FROM organizations;
CREATE FUNCTION initialize_subscription() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN INSERT INTO tenant_subscriptions(organization_id,plan_id,state,period_end) VALUES(NEW.id,'intelligence','trial',now()+interval '14 days');RETURN NEW;END $$;
-- Tenant bootstrap already runs in the narrow privileged account-creation path.
CREATE TRIGGER initialize_subscription AFTER INSERT ON organizations FOR EACH ROW EXECUTE FUNCTION initialize_subscription();
CREATE TABLE saas_invoices(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),plan_id text NOT NULL REFERENCES plan_catalog(id),cycle text NOT NULL CHECK(cycle IN ('monthly','yearly')),amount integer NOT NULL CHECK(amount>0),currency text NOT NULL DEFAULT 'IDR' CHECK(currency='IDR'),state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','verified','cancelled')),reference text UNIQUE,verified_by uuid,verified_at timestamptz,created_by uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX saas_invoice_scope ON saas_invoices(organization_id,created_at DESC);
CREATE UNIQUE INDEX one_pending_saas_invoice ON saas_invoices(organization_id) WHERE state='pending';
CREATE TABLE addon_catalog(id text PRIMARY KEY CHECK(id IN ('cctv','analytics')),name text NOT NULL,draft_unit_idr integer NOT NULL CHECK(draft_unit_idr>0));
INSERT INTO addon_catalog VALUES('cctv','CCTV / Video Access',30000),('analytics','AI Video Analytics',120000);
CREATE TABLE addon_requests(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),addon_id text NOT NULL REFERENCES addon_catalog(id),quantity integer NOT NULL CHECK(quantity BETWEEN 0 AND 1000),state text NOT NULL DEFAULT 'requested' CHECK(state='requested'),created_by uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE plan_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE addon_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE addon_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY catalog_read ON plan_catalog FOR SELECT TO daylio_app USING(app_role() IS NOT NULL);
CREATE POLICY subscription_read ON tenant_subscriptions FOR SELECT TO daylio_app USING(organization_id=app_org() AND app_role() IS NOT NULL);
CREATE POLICY saas_read ON saas_invoices FOR SELECT TO daylio_app USING(organization_id=app_org() AND app_role()='owner');
CREATE POLICY saas_request ON saas_invoices FOR INSERT TO daylio_app WITH CHECK(organization_id=app_org() AND app_role()='owner' AND created_by=app_user() AND state='pending' AND reference IS NULL AND verified_by IS NULL AND verified_at IS NULL);
CREATE POLICY addon_catalog_read ON addon_catalog FOR SELECT TO daylio_app USING(app_role() IS NOT NULL);
CREATE POLICY addon_request_read ON addon_requests FOR SELECT TO daylio_app USING(organization_id=app_org() AND app_role()='owner');
CREATE POLICY addon_request_create ON addon_requests FOR INSERT TO daylio_app WITH CHECK(organization_id=app_org() AND app_role()='owner' AND created_by=app_user() AND state='requested');
GRANT SELECT ON plan_catalog,tenant_subscriptions,addon_catalog TO daylio_app;
GRANT SELECT,INSERT ON saas_invoices,addon_requests TO daylio_app;
CREATE FUNCTION app_plan() RETURNS text LANGUAGE sql STABLE AS $$ SELECT CASE WHEN s.state IN ('trial','active') AND s.period_end<=now() OR s.state='expired' THEN 'essential' ELSE s.plan_id END FROM tenant_subscriptions s WHERE s.organization_id=app_org() AND app_role() IS NOT NULL $$;
CREATE FUNCTION app_has_feature(feature text) RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT coalesce((SELECT p.features ? feature FROM plan_catalog p WHERE p.id=app_plan()),false) $$;
CREATE FUNCTION record_feature(k text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT CASE WHEN k IN ('lead','lead-event','tour','trial','followup','enrollment','whatsapp-draft') THEN 'crm' WHEN k IN ('invoice','payment','payment-event','fee-plan') THEN 'finance' WHEN k IN ('ai-query','ai-draft') THEN 'leo' ELSE NULL END $$;
CREATE POLICY commercial_records_read ON records AS RESTRICTIVE FOR SELECT TO daylio_app USING(record_feature(kind) IS NULL OR app_has_feature(record_feature(kind)) OR (app_role()='parent' AND kind IN ('invoice','enrollment') AND child_id IS NOT NULL AND can_child(child_id)));
CREATE POLICY commercial_records_insert ON records AS RESTRICTIVE FOR INSERT TO daylio_app WITH CHECK(record_feature(kind) IS NULL OR app_has_feature(record_feature(kind)));
CREATE POLICY commercial_records_update ON records AS RESTRICTIVE FOR UPDATE TO daylio_app USING(record_feature(kind) IS NULL OR app_has_feature(record_feature(kind))) WITH CHECK(record_feature(kind) IS NULL OR app_has_feature(record_feature(kind)));
CREATE POLICY planner_entitlement_insert ON schedule_bookings AS RESTRICTIVE FOR INSERT TO daylio_app WITH CHECK(app_has_feature('scheduling'));
CREATE POLICY planner_entitlement_update ON schedule_bookings AS RESTRICTIVE FOR UPDATE TO daylio_app USING(app_has_feature('scheduling')) WITH CHECK(app_has_feature('scheduling'));
-- Parents retain access to their own historical package when a daycare downgrades.
CREATE POLICY parent_package_read ON records FOR SELECT TO daylio_app USING(organization_id=app_org() AND app_role()='parent' AND kind='enrollment' AND child_id IS NOT NULL AND can_child(child_id));
CREATE FUNCTION price_saas_invoice() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 SELECT monthly_idr*CASE WHEN NEW.cycle='yearly' THEN 10 ELSE 1 END INTO NEW.amount FROM plan_catalog WHERE id=NEW.plan_id;
 NEW.currency:='IDR';
 RETURN NEW;
END $$;
CREATE TRIGGER price_saas_invoice BEFORE INSERT ON saas_invoices FOR EACH ROW EXECUTE FUNCTION price_saas_invoice();
REVOKE ALL ON FUNCTION initialize_subscription(),app_plan(),app_has_feature(text),record_feature(text),price_saas_invoice() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_plan(),app_has_feature(text),record_feature(text) TO daylio_app;
-- No tenant role can update subscriptions, verify its own SaaS invoices or activate add-ons.
INSERT INTO schema_migrations(version) VALUES(13);
