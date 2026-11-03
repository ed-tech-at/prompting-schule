-- Mehrsprachige Kurse: Course.lang wird zur Ausgangssprache. Weitere Sprachen
-- liegen in eigenen Übersetzungstabellen und teilen sich die Kursstruktur.

-- Kurse ohne Sprache waren bisher in keiner Kursliste sichtbar; sie werden
-- als deutsche Kurse geführt.
UPDATE "Course" SET "lang" = 'de' WHERE "lang" IS NULL OR "lang" NOT IN ('de', 'en');

-- AlterTable
ALTER TABLE "Course" ALTER COLUMN "lang" SET NOT NULL,
ALTER COLUMN "lang" SET DEFAULT 'de';

-- CreateTable
CREATE TABLE "CourseTranslation" (
    "id" SERIAL NOT NULL,
    "courseId" INTEGER NOT NULL,
    "lang" TEXT NOT NULL,
    "active" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT,
    "description" TEXT,
    "introDescription" TEXT,
    "introDescriptionSuffix" TEXT,
    "sourceHashes" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonTranslation" (
    "id" SERIAL NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "lang" TEXT NOT NULL,
    "lessonName" TEXT,
    "sourceHashes" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElementTranslation" (
    "id" SERIAL NOT NULL,
    "elementId" INTEGER NOT NULL,
    "lang" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "taskA" TEXT,
    "devPromptA" TEXT,
    "taskB" TEXT,
    "devPromptB" TEXT,
    "devPromptC" TEXT,
    "sourceHashes" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElementTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizQuestionTranslation" (
    "id" SERIAL NOT NULL,
    "quizQuestionId" INTEGER NOT NULL,
    "lang" TEXT NOT NULL,
    "question" TEXT,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceHashes" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizQuestionTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CourseTranslation_courseId_lang_key" ON "CourseTranslation"("courseId", "lang");

-- CreateIndex
CREATE UNIQUE INDEX "LessonTranslation_lessonId_lang_key" ON "LessonTranslation"("lessonId", "lang");

-- CreateIndex
CREATE UNIQUE INDEX "ElementTranslation_elementId_lang_key" ON "ElementTranslation"("elementId", "lang");

-- CreateIndex
CREATE UNIQUE INDEX "QuizQuestionTranslation_quizQuestionId_lang_key" ON "QuizQuestionTranslation"("quizQuestionId", "lang");

-- AddForeignKey
ALTER TABLE "CourseTranslation" ADD CONSTRAINT "CourseTranslation_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonTranslation" ADD CONSTRAINT "LessonTranslation_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElementTranslation" ADD CONSTRAINT "ElementTranslation_elementId_fkey" FOREIGN KEY ("elementId") REFERENCES "Element"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestionTranslation" ADD CONSTRAINT "QuizQuestionTranslation_quizQuestionId_fkey" FOREIGN KEY ("quizQuestionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

