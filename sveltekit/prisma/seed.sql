-- Insert Courses
INSERT INTO "Course" (name, "URL", "active") VALUES
  ('Grundlagen', 'grundlagen', 1),
  ('Prompt Labor', 'prompt-labor', 1);

-- Insert Lessons for "Grundlagen"
INSERT INTO "Lesson" ("lessonName", "URL", "active", "courseId") VALUES
  ('Einführung in KI Ethik', 'einfuhrung-ki-ethik', 1, (SELECT id FROM "Course" WHERE name = 'Grundlagen')),
  ('Klare Anweisungen schreiben', 'klare-anweisungen', 1, (SELECT id FROM "Course" WHERE name = 'Grundlagen')),
  ('Referenztext bereitstellen', 'referenztext', 1, (SELECT id FROM "Course" WHERE name = 'Grundlagen')),
  ('Komplexe Aufgaben aufteilen', 'aufgaben-aufteilen', 1, (SELECT id FROM "Course" WHERE name = 'Grundlagen')),
  ('Der KI Zeit zum Nachdenken geben', 'zum-nachdenken', 1, (SELECT id FROM "Course" WHERE name = 'Grundlagen'));

-- Insert Lessons for "Prompt Labor"
INSERT INTO "Lesson" ("lessonName", "URL", "active", "courseId") VALUES
  ('Grammatik-Korrektur', 'grammatik-korrektur', 1, (SELECT id FROM "Course" WHERE name = 'Prompt Labor')),
  ('Meeting-Notizen zusammenfassen', 'meeting-notizen-zusammenfassen', 1, (SELECT id FROM "Course" WHERE name = 'Prompt Labor')),
  ('Schlüsselwörter extrahieren', 'schluesselwoerter-extrahieren', 1, (SELECT id FROM "Course" WHERE name = 'Prompt Labor')),
  ('Pro- und Kontra-Diskussion', 'pro-und-kontra-diskussion', 1, (SELECT id FROM "Course" WHERE name = 'Prompt Labor')),
  ('Übersetzung', 'uebersetzung', 1, (SELECT id FROM "Course" WHERE name = 'Prompt Labor'));
