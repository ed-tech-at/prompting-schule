-- Info blocks: admin-managed HTML notices for the start page and the course
-- overview. A block may be restricted to an email pattern, a time window, a
-- language and one or more placements.
CREATE TABLE "InfoBlock" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "variant" TEXT NOT NULL DEFAULT 'info',
    "lang" TEXT NOT NULL DEFAULT 'both',
    "placements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emailPattern" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "active" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfoBlock_pkey" PRIMARY KEY ("id")
);

-- The public pages read the active blocks in display order on every request.
CREATE INDEX "InfoBlock_active_position_idx" ON "InfoBlock"("active", "position");
