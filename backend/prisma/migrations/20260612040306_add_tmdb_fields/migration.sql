/*
  Warnings:

  - You are about to drop the column `cloudinaryName` on the `Movie` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Movie" DROP COLUMN "cloudinaryName",
ADD COLUMN     "backdropUrl" TEXT,
ADD COLUMN     "genres" TEXT,
ADD COLUMN     "imdbId" TEXT,
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "releaseYear" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'upload',
ADD COLUMN     "tmdbId" TEXT,
ALTER COLUMN "videoUrl" SET DEFAULT '',
ALTER COLUMN "cloudinaryId" SET DEFAULT '';
