-- Non-blocking duplicate detection; siblings can legitimately share a guardian.
CREATE FUNCTION canonical_contact(value text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
 SELECT CASE WHEN position('@' in value)>0 THEN 'email:'||lower(trim(value)) WHEN length(digits)>=6 THEN 'phone:'||CASE WHEN digits LIKE '0%' THEN '62'||substr(digits,2) ELSE digits END ELSE 'text:'||lower(trim(value)) END FROM (SELECT regexp_replace(value,'[^0-9]','','g') digits) normalized
$$;
REVOKE ALL ON FUNCTION canonical_contact(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION canonical_contact(text) TO daylio_app;
CREATE INDEX lead_contact_lookup ON records(organization_id,canonical_contact(data->>'contact')) WHERE kind='lead';
INSERT INTO schema_migrations(version) VALUES(20);
