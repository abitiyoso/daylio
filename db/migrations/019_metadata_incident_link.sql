ALTER TABLE video_events ADD COLUMN incident_id uuid, ADD FOREIGN KEY(organization_id,incident_id) REFERENCES records(organization_id,id);
GRANT UPDATE(incident_id) ON video_events TO daylio_app;
ALTER TABLE schedule_bookings ADD CONSTRAINT booking_one_identity CHECK((child_id IS NOT NULL) <> (lead_id IS NOT NULL));
-- Changing a classroom's ratio/capacity cannot invalidate reserved future care.
CREATE OR REPLACE FUNCTION classroom_capacity_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE used integer; booking schedule_bookings; cover integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtext(NEW.organization_id::text));
 SELECT count(*) INTO used FROM children WHERE organization_id=NEW.organization_id AND classroom_id=NEW.id AND archived_at IS NULL;
 IF NEW.capacity IS NOT NULL AND used+prospective_peak(NEW.organization_id,NEW.id,now(),'infinity'::timestamptz)>NEW.capacity THEN RAISE EXCEPTION 'CLASSROOM_RESERVED_OR_FULL' USING ERRCODE='23514'; END IF;
 IF NEW.caregiver_ratio IS DISTINCT FROM OLD.caregiver_ratio THEN
 FOR booking IN SELECT * FROM schedule_bookings WHERE organization_id=NEW.organization_id AND classroom_id=NEW.id AND state='confirmed' AND ends_at>now() LOOP
  IF NEW.caregiver_ratio IS NULL THEN RAISE EXCEPTION 'STAFF_COVERAGE_REQUIRED' USING ERRCODE='23514'; END IF;
  SELECT count(DISTINCT user_id) INTO cover FROM schedule_shifts WHERE organization_id=NEW.organization_id AND classroom_id=NEW.id AND state='scheduled' AND starts_at<=booking.starts_at AND ends_at>=booking.ends_at;
  IF cover<ceil((used+prospective_peak(NEW.organization_id,NEW.id,booking.starts_at,booking.ends_at))::numeric/NEW.caregiver_ratio) THEN RAISE EXCEPTION 'STAFF_COVERAGE_REQUIRED' USING ERRCODE='23514'; END IF;
 END LOOP;
 END IF;
 RETURN NEW;
END $$;
INSERT INTO schema_migrations(version) VALUES(19);
