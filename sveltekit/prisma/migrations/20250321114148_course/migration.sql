/*
  Warnings:

  - You are about to drop the column `public` on the `Course` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Course" DROP COLUMN "public",
ADD COLUMN     "active" INTEGER NOT NULL DEFAULT 0;
