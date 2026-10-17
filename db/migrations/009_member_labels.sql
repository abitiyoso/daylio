ALTER TABLE memberships ADD COLUMN display_name text NOT NULL DEFAULT '' CHECK(length(display_name)<=160);
INSERT INTO schema_migrations(version) VALUES(9);
