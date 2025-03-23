/*
  Warnings:

  - You are about to drop the column `starId` on the `UserProgress` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "UserProgress" DROP COLUMN "starId",
ADD COLUMN     "ai1" TEXT,
ADD COLUMN     "ai1Result" TEXT,
ADD COLUMN     "ai2" TEXT,
ADD COLUMN     "ai2Result" TEXT,
ADD COLUMN     "completionTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "promptTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "stars" INTEGER NOT NULL DEFAULT 0;
