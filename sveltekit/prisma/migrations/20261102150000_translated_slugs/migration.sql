-- Course and lesson slugs can be translated per language.
ALTER TABLE "CourseTranslation" ADD COLUMN "URL" TEXT;
ALTER TABLE "LessonTranslation" ADD COLUMN "URL" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CourseTranslation_URL_key" ON "CourseTranslation"("URL");
