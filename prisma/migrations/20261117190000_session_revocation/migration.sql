ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- A role or credential may be changed outside the API. Invalidate every
-- session in the same write, even when a role is later changed back.
CREATE FUNCTION bump_user_session_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF ROW(NEW."password", NEW."email", NEW."role", NEW."loginPin", NEW."homeAccessEnabled",
         NEW."accountMode", NEW."parentEmail", NEW."managedByParent")
     IS DISTINCT FROM
     ROW(OLD."password", OLD."email", OLD."role", OLD."loginPin", OLD."homeAccessEnabled",
         OLD."accountMode", OLD."parentEmail", OLD."managedByParent") THEN
    NEW."sessionVersion" := OLD."sessionVersion" + 1;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER user_session_version_before_update
BEFORE UPDATE OF "password", "email", "role", "loginPin", "homeAccessEnabled", "accountMode", "parentEmail", "managedByParent"
ON "User" FOR EACH ROW EXECUTE FUNCTION bump_user_session_version();
