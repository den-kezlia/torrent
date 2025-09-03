-- DropIndex (safe if exists)
DO $$ BEGIN
	IF EXISTS (
		SELECT 1 FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE c.relkind = 'i'
		  AND c.relname = 'Photo_noteId_idx'
		  AND n.nspname = 'public'
	) THEN
		DROP INDEX "Photo_noteId_idx";
	END IF;
END $$;
