-- Lesson URLs only need to be unique within their course.
DROP INDEX "Lesson_URL_key";

-- CreateIndex
CREATE UNIQUE INDEX "Lesson_courseId_URL_key" ON "Lesson"("courseId", "URL");
