/*
  Warnings:

  - You are about to drop the column `b2FileId` on the `Movie` table. All the data in the column will be lost.
  - You are about to drop the column `b2FileName` on the `Movie` table. All the data in the column will be lost.
  - Added the required column `cloudinaryId` to the `Movie` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cloudinaryName` to the `Movie` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Movie" DROP COLUMN "b2FileId",
DROP COLUMN "b2FileName",
ADD COLUMN     "cloudinaryId" TEXT NOT NULL,
ADD COLUMN     "cloudinaryName" TEXT NOT NULL;
