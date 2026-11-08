-- Paid terms are append-only through application permissions. No customer can
-- activate, alter or remove a verified term. Existing paid periods are retained.
ALTER TABLE saas_invoices ADD CONSTRAINT saas_invoice_org_unique UNIQUE(id,organization_id);
ALTER TABLE saas_invoices ADD COLUMN cancelled_at timestamptz,
 ADD COLUMN cancelled_by uuid, ADD COLUMN cancel_reason text;
CREATE TABLE saas_paid_terms(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 organization_id uuid NOT NULL REFERENCES organizations(id),
 invoice_id uuid NOT NULL UNIQUE,
 plan_id text NOT NULL REFERENCES plan_catalog(id),
 starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL CHECK(ends_at>starts_at),
 created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(invoice_id,organization_id) REFERENCES saas_invoices(id,organization_id)
);
CREATE INDEX paid_term_timeline ON saas_paid_terms(organization_id,starts_at,ends_at);
ALTER TABLE saas_paid_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE saas_paid_terms FORCE ROW LEVEL SECURITY;
CREATE POLICY paid_term_read ON saas_paid_terms FOR SELECT TO daylio_app
 USING(organization_id=app_org() AND app_role() IS NOT NULL);
GRANT SELECT ON saas_paid_terms TO daylio_app;
CREATE FUNCTION validate_paid_term() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE invoice saas_invoices;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(NEW.organization_id::text));
 SELECT * INTO invoice FROM saas_invoices WHERE id=NEW.invoice_id AND organization_id=NEW.organization_id;
 IF invoice.state IS DISTINCT FROM 'verified' OR invoice.plan_id IS DISTINCT FROM NEW.plan_id THEN
  RAISE EXCEPTION 'VERIFIED_MATCHING_INVOICE_REQUIRED' USING ERRCODE='23514';
 END IF;
 IF NEW.starts_at<invoice.verified_at THEN RAISE EXCEPTION 'PAID_TERM_START_INVALID' USING ERRCODE='23514'; END IF;
 NEW.ends_at:=NEW.starts_at+CASE WHEN invoice.cycle='yearly' THEN interval '1 year' ELSE interval '1 month' END;
 IF EXISTS(SELECT 1 FROM saas_paid_terms t WHERE t.organization_id=NEW.organization_id AND t.starts_at<NEW.ends_at AND t.ends_at>NEW.starts_at) THEN
  RAISE EXCEPTION 'PAID_TERM_OVERLAP' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER paid_term_guard BEFORE INSERT ON saas_paid_terms FOR EACH ROW EXECUTE FUNCTION validate_paid_term();
-- Date-based entitlement resolution does not depend on a worker waking up on time.
-- Explicit operator expiry remains an override; routine expiry is date-driven.
CREATE FUNCTION commercial_plan_at(tenant uuid,at_time timestamptz) RETURNS text LANGUAGE sql STABLE AS $$
 SELECT CASE WHEN s.state='expired' THEN 'essential' ELSE coalesce(
  (SELECT t.plan_id FROM saas_paid_terms t WHERE t.organization_id=s.organization_id AND t.starts_at<=at_time AND t.ends_at>at_time ORDER BY t.starts_at DESC LIMIT 1),
  CASE WHEN s.state IN ('trial','active') AND s.period_end<=at_time THEN 'essential' ELSE s.plan_id END
 ) END FROM tenant_subscriptions s WHERE s.organization_id=tenant
$$;
CREATE OR REPLACE FUNCTION app_plan() RETURNS text LANGUAGE sql STABLE AS $$ SELECT commercial_plan_at(app_org(),now()) $$;
CREATE FUNCTION cancel_pending_saas_invoice(invoice_id uuid,reason text) RETURNS saas_invoices
 LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE invoice saas_invoices;
BEGIN
 IF app_role() IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'OWNER_REQUIRED' USING ERRCODE='42501'; END IF;
 IF reason IS NULL OR length(trim(reason)) NOT BETWEEN 6 AND 500 THEN RAISE EXCEPTION 'CANCEL_REASON_REQUIRED' USING ERRCODE='23514'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(app_org()::text));
 SELECT * INTO invoice FROM saas_invoices WHERE id=invoice_id AND organization_id=app_org() FOR UPDATE;
 IF invoice.id IS NULL THEN RAISE EXCEPTION 'NOT_FOUND' USING ERRCODE='42501'; END IF;
 IF invoice.state='cancelled' AND invoice.cancel_reason=trim(reason) THEN RETURN invoice; END IF;
 IF invoice.state<>'pending' THEN RAISE EXCEPTION 'INVOICE_NOT_PENDING' USING ERRCODE='40001'; END IF;
 UPDATE saas_invoices SET state='cancelled',cancelled_at=now(),cancelled_by=app_user(),cancel_reason=trim(reason) WHERE id=invoice.id RETURNING * INTO invoice;
 INSERT INTO audit_logs(organization_id,actor_id,action,resource_id) VALUES(app_org(),app_user(),'saas.invoice.cancel',invoice.id);
 RETURN invoice;
END $$;
REVOKE ALL ON FUNCTION validate_paid_term(),commercial_plan_at(uuid,timestamptz),cancel_pending_saas_invoice(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION commercial_plan_at(uuid,timestamptz),cancel_pending_saas_invoice(uuid,text) TO daylio_app;
INSERT INTO schema_migrations(version) VALUES(21);
