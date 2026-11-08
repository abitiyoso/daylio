CREATE FUNCTION prospective_peak(tenant uuid,room uuid,from_time timestamptz,to_time timestamptz) RETURNS integer LANGUAGE sql STABLE AS $$
 SELECT coalesce(max(load),0)::integer FROM (
 SELECT sum(delta) OVER(ORDER BY point ROWS UNBOUNDED PRECEDING) load FROM (
 SELECT point,sum(delta) delta FROM (
 SELECT greatest(starts_at,from_time) point,1 delta FROM schedule_bookings WHERE organization_id=tenant AND classroom_id=room AND child_id IS NULL AND state='confirmed' AND starts_at<to_time AND ends_at>from_time
 UNION ALL SELECT least(ends_at,to_time),-1 FROM schedule_bookings WHERE organization_id=tenant AND classroom_id=room AND child_id IS NULL AND state='confirmed' AND starts_at<to_time AND ends_at>from_time
 ) events GROUP BY point) grouped) loads
$$;
REVOKE ALL ON FUNCTION prospective_peak(uuid,uuid,timestamptz,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION prospective_peak(uuid,uuid,timestamptz,timestamptz) TO daylio_app;
CREATE FUNCTION enrollment_capacity_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE cap integer; used integer; quota integer;
BEGIN
 IF current_user='daylio_app' AND (app_role() NOT IN ('owner','manager') OR NEW.organization_id<>app_org()) THEN RAISE EXCEPTION 'row-level security: child write denied' USING ERRCODE='42501'; END IF;
 IF NEW.archived_at IS NOT NULL THEN RETURN NEW; END IF;
 IF TG_OP='UPDATE' AND NEW.classroom_id=OLD.classroom_id AND OLD.archived_at IS NULL THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(NEW.organization_id::text));
 SELECT capacity INTO cap FROM classrooms WHERE organization_id=NEW.organization_id AND id=NEW.classroom_id FOR UPDATE;
 SELECT count(*) INTO used FROM children WHERE organization_id=NEW.organization_id AND classroom_id=NEW.classroom_id AND archived_at IS NULL AND id<>NEW.id;
 IF cap IS NOT NULL AND used+1+prospective_peak(NEW.organization_id,NEW.classroom_id,now(),'infinity'::timestamptz)>cap THEN RAISE EXCEPTION 'CLASSROOM_RESERVED_OR_FULL' USING ERRCODE='23514'; END IF;
 SELECT p.child_limit INTO quota FROM tenant_subscriptions s JOIN plan_catalog p ON p.id=CASE WHEN s.state IN ('trial','active') AND s.period_end<=now() OR s.state='expired' THEN 'essential' ELSE s.plan_id END WHERE s.organization_id=NEW.organization_id;
 SELECT count(*) INTO used FROM children WHERE organization_id=NEW.organization_id AND archived_at IS NULL AND id<>NEW.id;
 IF quota IS NOT NULL AND used>=quota THEN RAISE EXCEPTION 'PLAN_CHILD_LIMIT' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER enrollment_capacity_guard BEFORE INSERT OR UPDATE ON children FOR EACH ROW EXECUTE FUNCTION enrollment_capacity_guard();
CREATE FUNCTION classroom_capacity_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE used integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(NEW.organization_id::text));
 SELECT count(*) INTO used FROM children WHERE organization_id=NEW.organization_id AND classroom_id=NEW.id AND archived_at IS NULL;
 IF NEW.capacity IS NOT NULL AND used+prospective_peak(NEW.organization_id,NEW.id,now(),'infinity'::timestamptz)>NEW.capacity THEN RAISE EXCEPTION 'CLASSROOM_RESERVED_OR_FULL' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER classroom_capacity_guard BEFORE UPDATE OF capacity ON classrooms FOR EACH ROW EXECUTE FUNCTION classroom_capacity_guard();
CREATE FUNCTION shift_coverage_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE booking schedule_bookings; used integer; ratio integer; cover integer;
BEGIN
 IF OLD.state<>'scheduled' THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(OLD.organization_id::text));
 FOR booking IN SELECT * FROM schedule_bookings WHERE organization_id=OLD.organization_id AND classroom_id=OLD.classroom_id AND state='confirmed' AND ends_at>now() AND starts_at<OLD.ends_at AND ends_at>OLD.starts_at LOOP
  SELECT count(*) INTO used FROM children WHERE organization_id=OLD.organization_id AND classroom_id=OLD.classroom_id AND archived_at IS NULL;
  SELECT caregiver_ratio INTO ratio FROM classrooms WHERE organization_id=OLD.organization_id AND id=OLD.classroom_id;
  SELECT count(DISTINCT user_id) INTO cover FROM schedule_shifts WHERE organization_id=OLD.organization_id AND classroom_id=OLD.classroom_id AND state='scheduled' AND id<>OLD.id AND starts_at<=booking.starts_at AND ends_at>=booking.ends_at;
  IF NEW.state='scheduled' AND NEW.classroom_id=OLD.classroom_id AND NEW.starts_at<=booking.starts_at AND NEW.ends_at>=booking.ends_at THEN cover:=cover+1; END IF;
  IF cover<ceil((used+prospective_peak(OLD.organization_id,OLD.classroom_id,booking.starts_at,booking.ends_at))::numeric/ratio) THEN RAISE EXCEPTION 'STAFF_COVERAGE_REQUIRED' USING ERRCODE='23514'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER coverage_guard BEFORE UPDATE ON schedule_shifts FOR EACH ROW EXECUTE FUNCTION shift_coverage_guard();
REVOKE ALL ON FUNCTION enrollment_capacity_guard(),classroom_capacity_guard(),shift_coverage_guard() FROM PUBLIC;
INSERT INTO schema_migrations(version) VALUES(14);
