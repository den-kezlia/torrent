-- Add nullable noteId to Photo and relation to Note; backfill is not needed.
ALTER TABLE "Photo" ADD COLUMN IF NOT EXISTS "noteId" TEXT;

-- Add FK (idempotent)
DO $$ BEGIN
    ALTER TABLE "Photo" ADD CONSTRAINT "Photo_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Optional index for filtering by noteId
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'i'
          AND c.relname = 'Photo_noteId_idx'
          AND n.nspname = 'public'
    ) THEN
        CREATE INDEX "Photo_noteId_idx" ON "Photo"("noteId");
    END IF;
END $$;
