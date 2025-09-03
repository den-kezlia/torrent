-- CreateEnum (idempotent)
DO $$
BEGIN
    CREATE TYPE "VisitStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'VISITED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Prisma initial migration for Torrent Streets
-- Generated via `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`
-- Note: Idempotent create blocks are used below. The non-idempotent duplicates have been removed.

-- CreateTable Street (idempotent)
CREATE TABLE IF NOT EXISTS "Street" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "osmId" TEXT NOT NULL,
    "boundaryId" TEXT,
    "geometry" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Street_pkey" PRIMARY KEY ("id")
);

-- CreateTable StreetSegment (idempotent)
CREATE TABLE IF NOT EXISTS "StreetSegment" (
    "id" TEXT NOT NULL,
    "streetId" TEXT NOT NULL,
    "osmId" TEXT NOT NULL,
    "geometry" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StreetSegment_pkey" PRIMARY KEY ("id")
);

-- CreateTable Visit (idempotent)
CREATE TABLE IF NOT EXISTS "Visit" (
    "id" TEXT NOT NULL,
    "streetId" TEXT NOT NULL,
    "status" "VisitStatus" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" JSONB,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable Note (idempotent)
CREATE TABLE IF NOT EXISTS "Note" (
    "id" TEXT NOT NULL,
    "streetId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable Photo (idempotent)
CREATE TABLE IF NOT EXISTS "Photo" (
    "id" TEXT NOT NULL,
    "streetId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "blobKey" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex Street_osmId_key (idempotent)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'i'
          AND c.relname = 'Street_osmId_key'
          AND n.nspname = 'public'
    ) THEN
        CREATE UNIQUE INDEX "Street_osmId_key" ON "Street"("osmId");
    END IF;
END $$;

-- CreateIndex StreetSegment_osmId_key (idempotent)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'i'
          AND c.relname = 'StreetSegment_osmId_key'
          AND n.nspname = 'public'
    ) THEN
        CREATE UNIQUE INDEX "StreetSegment_osmId_key" ON "StreetSegment"("osmId");
    END IF;
END $$;

-- CreateIndex Photo_blobKey_key (idempotent)
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relkind = 'i'
          AND c.relname = 'Photo_blobKey_key'
          AND n.nspname = 'public'
    ) THEN
        CREATE UNIQUE INDEX "Photo_blobKey_key" ON "Photo"("blobKey");
    END IF;
END $$;

-- AddForeignKey StreetSegment_streetId_fkey (idempotent)
DO $$ BEGIN
    ALTER TABLE "StreetSegment" ADD CONSTRAINT "StreetSegment_streetId_fkey" FOREIGN KEY ("streetId") REFERENCES "Street"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey Visit_streetId_fkey (idempotent)
DO $$ BEGIN
    ALTER TABLE "Visit" ADD CONSTRAINT "Visit_streetId_fkey" FOREIGN KEY ("streetId") REFERENCES "Street"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey Note_streetId_fkey (idempotent)
DO $$ BEGIN
    ALTER TABLE "Note" ADD CONSTRAINT "Note_streetId_fkey" FOREIGN KEY ("streetId") REFERENCES "Street"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AddForeignKey Photo_streetId_fkey (idempotent)
DO $$ BEGIN
    ALTER TABLE "Photo" ADD CONSTRAINT "Photo_streetId_fkey" FOREIGN KEY ("streetId") REFERENCES "Street"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

