/*
  Warnings:

  - A unique constraint covering the columns `[URL]` on the table `Lesson` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `URL` to the `Lesson` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "URL" TEXT NOT NULL,
ADD COLUMN     "active" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_URL_key" ON "Lesson"("URL");
