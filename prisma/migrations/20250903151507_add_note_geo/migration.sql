-- DropIndex
DROP INDEX "Photo_noteId_idx";

-- AlterTable
ALTER TABLE "Note" ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION;
