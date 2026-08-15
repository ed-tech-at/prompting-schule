-- Give quiz questions an explicit sort order for the content editor.
ALTER TABLE "QuizQuestion" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;

-- Backfill so the previous implicit id-order is preserved per lesson.
UPDATE "QuizQuestion" q
SET "position" = sub.rn
FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY "lessonId" ORDER BY id) AS rn
    FROM "QuizQuestion"
) sub
WHERE q.id = sub.id;

-- seed.sql inserts content rows with explicit ids, which leaves the
-- autoincrement sequences behind. Resync them so the content editor can
-- create rows without unique-constraint collisions.
SELECT setval(pg_get_serial_sequence('"Course"', 'id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM "Course"), 1));
SELECT setval(pg_get_serial_sequence('"Lesson"', 'id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM "Lesson"), 1));
SELECT setval(pg_get_serial_sequence('"Element"', 'id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM "Element"), 1));
SELECT setval(pg_get_serial_sequence('"QuizQuestion"', 'id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM "QuizQuestion"), 1));
