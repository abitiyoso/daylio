-- v10 Schedule & Capacity Planner. Existing care records and migrations remain intact.
ALTER TABLE classrooms ADD COLUMN age_min_months integer CHECK(age_min_months>=0), ADD COLUMN age_max_months integer CHECK(age_max_months>=age_min_months);
CREATE TABLE schedule_shifts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), classroom_id uuid NOT NULL,
 user_id uuid NOT NULL, starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL CHECK(ends_at>starts_at),
 state text NOT NULL DEFAULT 'scheduled' CHECK(state IN ('scheduled','cancelled')), created_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1,
 UNIQUE(organization_id,id), FOREIGN KEY(organization_id,classroom_id) REFERENCES classrooms(organization_id,id),
 FOREIGN KEY(organization_id,user_id) REFERENCES memberships(organization_id,user_id));
CREATE TABLE schedule_bookings(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id), classroom_id uuid NOT NULL,
 child_id uuid, lead_id uuid, child_name text NOT NULL CHECK(length(child_name) BETWEEN 1 AND 160),
 type text NOT NULL CHECK(type IN ('trial','regular','extra-day','drop-in')), starts_at timestamptz NOT NULL,
 ends_at timestamptz NOT NULL CHECK(ends_at>starts_at), state text NOT NULL DEFAULT 'confirmed' CHECK(state IN ('confirmed','cancelled')),
 created_by uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), revision integer NOT NULL DEFAULT 1,
 CHECK(child_id IS NOT NULL OR lead_id IS NOT NULL), UNIQUE(organization_id,id),
 FOREIGN KEY(organization_id,classroom_id) REFERENCES classrooms(organization_id,id),
 FOREIGN KEY(organization_id,child_id) REFERENCES children(organization_id,id),FOREIGN KEY(organization_id,lead_id) REFERENCES records(organization_id,id));
CREATE INDEX schedule_booking_window ON schedule_bookings(organization_id,classroom_id,starts_at,ends_at) WHERE state='confirmed';
CREATE INDEX schedule_shift_window ON schedule_shifts(organization_id,user_id,starts_at,ends_at) WHERE state='scheduled';
CREATE TABLE schedule_history(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),organization_id uuid NOT NULL REFERENCES organizations(id),resource_id uuid NOT NULL,resource_type text NOT NULL,before_data jsonb,after_data jsonb NOT NULL,actor_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX schedule_history_scope ON schedule_history(organization_id,resource_id,created_at);
ALTER TABLE schedule_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY shifts_read ON schedule_shifts FOR SELECT TO daylio_app USING(organization_id=app_org() AND (app_role() IN ('owner','manager') OR (app_role()='caregiver' AND user_id=app_user())));
CREATE POLICY shifts_create ON schedule_shifts FOR INSERT TO daylio_app WITH CHECK(organization_id=app_org() AND app_role() IN ('owner','manager') AND created_by=app_user());
CREATE POLICY shifts_update ON schedule_shifts FOR UPDATE TO daylio_app USING(organization_id=app_org() AND app_role() IN ('owner','manager')) WITH CHECK(organization_id=app_org() AND app_role() IN ('owner','manager'));
CREATE POLICY bookings_read ON schedule_bookings FOR SELECT TO daylio_app USING(organization_id=app_org() AND (app_role() IN ('owner','manager') OR (child_id IS NOT NULL AND can_child(child_id))));
CREATE POLICY bookings_create ON schedule_bookings FOR INSERT TO daylio_app WITH CHECK(organization_id=app_org() AND app_role() IN ('owner','manager') AND created_by=app_user());
CREATE POLICY bookings_update ON schedule_bookings FOR UPDATE TO daylio_app USING(organization_id=app_org() AND app_role() IN ('owner','manager')) WITH CHECK(organization_id=app_org() AND app_role() IN ('owner','manager'));
CREATE POLICY schedule_history_read ON schedule_history FOR SELECT TO daylio_app USING(organization_id=app_org() AND app_role() IN ('owner','manager'));
CREATE POLICY schedule_history_insert ON schedule_history FOR INSERT TO daylio_app WITH CHECK(organization_id=app_org() AND app_role() IN ('owner','manager') AND actor_id=app_user());
CREATE TRIGGER schedule_history_immutable BEFORE UPDATE OR DELETE ON schedule_history FOR EACH ROW EXECUTE FUNCTION immutable_audit();
GRANT SELECT,INSERT,UPDATE ON schedule_shifts,schedule_bookings TO daylio_app;
GRANT SELECT,INSERT ON schedule_history TO daylio_app;
-- Validation lives in the database as well as the API; every writer shares the
-- existing enrollment tenant lock, so simultaneous bookings/enrollments serialize.
CREATE FUNCTION schedule_validate() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE cap integer; enrolled integer; peak integer; ratio integer; cover integer; tz text; minimum integer; maximum integer; months integer;
BEGIN
 IF current_user='daylio_app' AND (app_role() NOT IN ('owner','manager') OR NEW.organization_id<>app_org()) THEN RAISE EXCEPTION 'row-level security: schedule write denied' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(NEW.organization_id::text));
 IF TG_OP='UPDATE' AND (NEW.organization_id<>OLD.organization_id OR NEW.created_by<>OLD.created_by OR NEW.id<>OLD.id) THEN RAISE EXCEPTION 'SCHEDULE_IDENTITY_IMMUTABLE' USING ERRCODE='23514'; END IF;
 IF TG_OP='UPDATE' THEN NEW.revision:=OLD.revision+1; END IF;
 NEW.updated_at:=now();
 IF NEW.ends_at-NEW.starts_at>interval '24 hours' THEN RAISE EXCEPTION 'INVALID_SCHEDULE_INTERVAL' USING ERRCODE='23514'; END IF;
 IF NEW.state='cancelled' THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='schedule_shifts' THEN
  IF NOT EXISTS(SELECT 1 FROM memberships WHERE organization_id=NEW.organization_id AND user_id=NEW.user_id AND active AND role IN ('caregiver','manager')) THEN RAISE EXCEPTION 'ACTIVE_STAFF_REQUIRED' USING ERRCODE='23514'; END IF;
  IF EXISTS(SELECT 1 FROM schedule_shifts WHERE organization_id=NEW.organization_id AND user_id=NEW.user_id AND id<>NEW.id AND state='scheduled' AND starts_at<NEW.ends_at AND ends_at>NEW.starts_at) THEN RAISE EXCEPTION 'STAFF_SHIFT_CONFLICT' USING ERRCODE='23514'; END IF;
 ELSE
  SELECT c.capacity,c.caregiver_ratio,b.timezone,c.age_min_months,c.age_max_months INTO cap,ratio,tz,minimum,maximum FROM classrooms c JOIN branches b ON b.id=c.branch_id AND b.organization_id=c.organization_id WHERE c.organization_id=NEW.organization_id AND c.id=NEW.classroom_id;
  IF cap IS NULL OR ratio IS NULL THEN RAISE EXCEPTION 'CAPACITY_AND_RATIO_REQUIRED' USING ERRCODE='23514'; END IF;
  IF (NEW.starts_at AT TIME ZONE tz)::date<>(NEW.ends_at AT TIME ZONE tz)::date THEN RAISE EXCEPTION 'SINGLE_OPERATION_DAY_REQUIRED' USING ERRCODE='23514'; END IF;
  IF NEW.lead_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM records WHERE id=NEW.lead_id AND organization_id=NEW.organization_id AND kind='lead' AND state NOT IN ('lost','enrolled')) THEN RAISE EXCEPTION 'ACTIVE_LEAD_REQUIRED' USING ERRCODE='23514'; END IF;
  IF NEW.child_id IS NOT NULL THEN
   IF NOT EXISTS(SELECT 1 FROM children WHERE organization_id=NEW.organization_id AND id=NEW.child_id AND classroom_id=NEW.classroom_id AND archived_at IS NULL) THEN RAISE EXCEPTION 'ACTIVE_CLASS_CHILD_REQUIRED' USING ERRCODE='23514'; END IF;
   SELECT extract(year from age((NEW.starts_at AT TIME ZONE tz)::date,birth_date))*12+extract(month from age((NEW.starts_at AT TIME ZONE tz)::date,birth_date)) INTO months FROM children WHERE id=NEW.child_id;
   IF (minimum IS NOT NULL AND months<minimum) OR (maximum IS NOT NULL AND months>maximum) THEN RAISE EXCEPTION 'AGE_GROUP_MISMATCH' USING ERRCODE='23514'; END IF;
  END IF;
  IF EXISTS(SELECT 1 FROM schedule_bookings WHERE organization_id=NEW.organization_id AND id<>NEW.id AND state='confirmed' AND starts_at<NEW.ends_at AND ends_at>NEW.starts_at AND ((NEW.child_id IS NOT NULL AND child_id=NEW.child_id) OR (NEW.lead_id IS NOT NULL AND lead_id=NEW.lead_id))) THEN RAISE EXCEPTION 'BOOKING_CONFLICT' USING ERRCODE='23514'; END IF;
  SELECT count(*) INTO enrolled FROM children WHERE organization_id=NEW.organization_id AND classroom_id=NEW.classroom_id AND archived_at IS NULL;
  -- Registered children already reserve a classroom slot. Only prospective
  -- children consume extra seats; sweep simultaneous intervals, not day totals.
  SELECT coalesce(max(load),0) INTO peak FROM (
   SELECT sum(delta) OVER(ORDER BY point ROWS UNBOUNDED PRECEDING) AS load FROM (
    SELECT point,sum(delta) delta FROM (
     SELECT greatest(starts_at,NEW.starts_at) point,1 delta FROM schedule_bookings WHERE organization_id=NEW.organization_id AND classroom_id=NEW.classroom_id AND id<>NEW.id AND child_id IS NULL AND state='confirmed' AND starts_at<NEW.ends_at AND ends_at>NEW.starts_at
     UNION ALL SELECT least(ends_at,NEW.ends_at),-1 FROM schedule_bookings WHERE organization_id=NEW.organization_id AND classroom_id=NEW.classroom_id AND id<>NEW.id AND child_id IS NULL AND state='confirmed' AND starts_at<NEW.ends_at AND ends_at>NEW.starts_at
    ) events GROUP BY point
   ) grouped
  ) loads;
  peak:=enrolled+peak+CASE WHEN NEW.child_id IS NULL THEN 1 ELSE 0 END;
  IF peak>cap THEN RAISE EXCEPTION 'CLASSROOM_FULL' USING ERRCODE='23514'; END IF;
  SELECT count(DISTINCT user_id) INTO cover FROM schedule_shifts WHERE organization_id=NEW.organization_id AND classroom_id=NEW.classroom_id AND state='scheduled' AND starts_at<=NEW.starts_at AND ends_at>=NEW.ends_at;
  IF cover<ceil(peak::numeric/ratio) THEN RAISE EXCEPTION 'STAFF_COVERAGE_REQUIRED' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_shift BEFORE INSERT OR UPDATE ON schedule_shifts FOR EACH ROW EXECUTE FUNCTION schedule_validate();
CREATE TRIGGER validate_booking BEFORE INSERT OR UPDATE ON schedule_bookings FOR EACH ROW EXECUTE FUNCTION schedule_validate();
REVOKE ALL ON FUNCTION schedule_validate() FROM PUBLIC;
CREATE FUNCTION schedule_audit() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 INSERT INTO schedule_history(organization_id,resource_id,resource_type,before_data,after_data,actor_id) VALUES(NEW.organization_id,NEW.id,TG_TABLE_NAME,CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,to_jsonb(NEW),coalesce(app_user(),NEW.created_by));
 INSERT INTO audit_logs(organization_id,actor_id,action,resource_id) VALUES(NEW.organization_id,coalesce(app_user(),NEW.created_by),TG_TABLE_NAME||'.'||lower(TG_OP),NEW.id);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION schedule_audit() FROM PUBLIC;
CREATE TRIGGER audit_booking AFTER INSERT OR UPDATE ON schedule_bookings FOR EACH ROW EXECUTE FUNCTION schedule_audit();
CREATE TRIGGER audit_shift AFTER INSERT OR UPDATE ON schedule_shifts FOR EACH ROW EXECUTE FUNCTION schedule_audit();
INSERT INTO schema_migrations(version) VALUES(12);
