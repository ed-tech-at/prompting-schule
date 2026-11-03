// Pure (Prisma-free) serialization, validation and diff logic for the
// course JSON export/import feature. Everything here is unit-testable
// without a database.

// Version 2 adds `translations` to course, lessons, elements and quiz
// questions. Version 1 files are still accepted; they carry no translations,
// so an import leaves existing translations alone.
export const COURSE_EXPORT_FORMAT_VERSION = 2;
const SUPPORTED_FORMAT_VERSIONS = [1, 2];

const TRANSLATION_LANGS = ['de', 'en'];

type SourceHashes = Record<string, string> | null;

export type CourseTranslationExport = {
  active: number;
  name: string | null;
  description: string | null;
  introDescription: string | null;
  introDescriptionSuffix: string | null;
  // Translated slug; null = the source URL. Missing in older files.
  URL: string | null;
  sourceHashes: SourceHashes;
};
export type LessonTranslationExport = { lessonName: string | null; URL: string | null; sourceHashes: SourceHashes };
export type ElementTranslationExport = {
  title: string | null;
  description: string | null;
  taskA: string | null;
  devPromptA: string | null;
  taskB: string | null;
  devPromptB: string | null;
  devPromptC: string | null;
  sourceHashes: SourceHashes;
};
export type QuizQuestionTranslationExport = {
  question: string | null;
  options: string[];
  sourceHashes: SourceHashes;
};

// Keyed by language. `undefined` (only from version 1 files) means "unknown",
// an empty object means "no translations".
type Translations<T> = Record<string, T> | undefined;

export type ElementExport = {
  type: string;
  title: string | null;
  description: string | null;
  taskA: string | null;
  devPromptA: string | null;
  taskB: string | null;
  devPromptB: string | null;
  devPromptC: string | null;
  position: number;
  translations?: Translations<ElementTranslationExport>;
};

export type QuizQuestionExport = {
  question: string;
  type: string;
  options: string[];
  correct: string[];
  position: number;
  translations?: Translations<QuizQuestionTranslationExport>;
};

export type LessonExport = {
  lessonName: string;
  lessonEmoji: string | null;
  URL: string;
  active: number;
  starsNeeded: number;
  position: number;
  elements: ElementExport[];
  quizQuestions: QuizQuestionExport[];
  translations?: Translations<LessonTranslationExport>;
};

export type CourseExport = {
  name: string;
  URL: string;
  description: string | null;
  introDescription: string | null;
  introDescriptionSuffix: string | null;
  active: number;
  position: number;
  displayType: string | null;
  lang: string | null;
  lessons: LessonExport[];
  translations?: Translations<CourseTranslationExport>;
};

export type CourseExportFile = {
  formatVersion: number;
  exportedAt: string;
  course: CourseExport;
};

// Shapes as they come from Prisma (ids included); ids are stripped on export.
// Translation rows arrive as lists with a `lang` column.
type TranslationRows<T> = (Partial<Omit<T, 'sourceHashes'>> & { lang: string; sourceHashes?: unknown })[];
type ElementInput = Omit<ElementExport, 'translations'> & {
  id?: number;
  lessonId?: number;
  translations?: TranslationRows<ElementTranslationExport>;
};
type QuizQuestionInput = Omit<QuizQuestionExport, 'translations'> & {
  id?: number;
  lessonId?: number;
  translations?: TranslationRows<QuizQuestionTranslationExport>;
};
type LessonInput = Omit<LessonExport, 'elements' | 'quizQuestions' | 'translations'> & {
  id?: number;
  courseId?: number;
  elements: ElementInput[];
  quizQuestions: QuizQuestionInput[];
  translations?: TranslationRows<LessonTranslationExport>;
};
export type CourseWithRelations = Omit<CourseExport, 'lessons' | 'translations'> & {
  id?: number;
  lessons: LessonInput[];
  translations?: TranslationRows<CourseTranslationExport>;
};

function asSourceHashes(value: unknown): SourceHashes {
  if (!isPlainObject(value)) return null;
  const entries = Object.entries(value).filter(([, hash]) => typeof hash === 'string');
  return Object.fromEntries(entries) as Record<string, string>;
}

function pickTexts<F extends string>(row: Record<string, unknown>, fields: readonly F[]) {
  return Object.fromEntries(fields.map((field) => [field, asNullableString(row[field])])) as Record<
    F,
    string | null
  >;
}

const COURSE_TEXT_FIELDS = ['name', 'description', 'introDescription', 'introDescriptionSuffix'] as const;
const ELEMENT_TEXT_FIELDS = ['title', 'description', 'taskA', 'devPromptA', 'taskB', 'devPromptB', 'devPromptC'] as const;

function byLang<Row extends { lang: string }, T>(rows: Row[] | undefined, map: (row: Row) => T): Record<string, T> {
  return Object.fromEntries((rows ?? []).map((row) => [row.lang, map(row)]));
}

const byPosition = (a: { position: number }, b: { position: number }) =>
  a.position - b.position;

export function serializeCourse(
  course: CourseWithRelations,
  exportedAt: Date = new Date()
): CourseExportFile {
  return {
    formatVersion: COURSE_EXPORT_FORMAT_VERSION,
    exportedAt: exportedAt.toISOString(),
    course: {
      name: course.name,
      URL: course.URL,
      description: course.description ?? null,
      introDescription: course.introDescription ?? null,
      introDescriptionSuffix: course.introDescriptionSuffix ?? null,
      active: course.active,
      position: course.position,
      displayType: course.displayType ?? null,
      lang: course.lang ?? null,
      translations: byLang(course.translations, (row) => ({
        active: typeof row.active === 'number' ? row.active : 0,
        ...pickTexts(row, COURSE_TEXT_FIELDS),
        URL: asNullableString(row.URL),
        sourceHashes: asSourceHashes(row.sourceHashes)
      })),
      lessons: [...course.lessons].sort(byPosition).map((lesson) => ({
        lessonName: lesson.lessonName,
        lessonEmoji: lesson.lessonEmoji ?? null,
        URL: lesson.URL,
        active: lesson.active,
        starsNeeded: lesson.starsNeeded,
        position: lesson.position,
        translations: byLang(lesson.translations, (row) => ({
          lessonName: asNullableString(row.lessonName),
          URL: asNullableString(row.URL),
          sourceHashes: asSourceHashes(row.sourceHashes)
        })),
        elements: [...lesson.elements].sort(byPosition).map((element) => ({
          type: element.type,
          title: element.title ?? null,
          description: element.description ?? null,
          taskA: element.taskA ?? null,
          devPromptA: element.devPromptA ?? null,
          taskB: element.taskB ?? null,
          devPromptB: element.devPromptB ?? null,
          devPromptC: element.devPromptC ?? null,
          position: element.position,
          translations: byLang(element.translations, (row) => ({
            ...pickTexts(row, ELEMENT_TEXT_FIELDS),
            sourceHashes: asSourceHashes(row.sourceHashes)
          }))
        })),
        quizQuestions: [...lesson.quizQuestions].sort(byPosition).map((question) => ({
          question: question.question,
          type: question.type,
          options: [...question.options],
          correct: [...question.correct],
          position: question.position,
          translations: byLang(question.translations, (row) => ({
            question: asNullableString(row.question),
            options: isStringArray(row.options) ? [...row.options] : [],
            sourceHashes: asSourceHashes(row.sourceHashes)
          }))
        }))
      }))
    }
  };
}

// Short codes used by the quiz renderer/grader: 's' single, 'm' multiple.
const QUIZ_TYPES = ['s', 'm'];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): boolean {
  return value === null || value === undefined || typeof value === 'string';
}

function isInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function checkNullableStrings(
  entry: Record<string, unknown>,
  fields: readonly string[],
  label: string,
  errors: string[]
) {
  for (const field of fields) {
    if (!isNullableString(entry[field])) {
      errors.push(`${label}: das Feld "${field}" muss Text oder null sein.`);
    }
  }
}

// Translated slugs are optional: anything that is not a valid slug is
// dropped instead of failing the whole import.
function asTranslatedSlug(value: unknown): string | null {
  return typeof value === 'string' && /^[a-z0-9-]+$/.test(value) ? value : null;
}

// A lesson slug must lead to one lesson per course and language. Translated
// slugs that clash with another lesson of the file fall back to the source URL.
function dropClashingLessonSlugs(lessons: LessonExport[]) {
  const sourceUrls = new Map(lessons.map((lesson) => [lesson.URL, lesson]));
  const seen = new Map<string, LessonExport>();
  for (const lesson of lessons) {
    for (const [lang, translation] of Object.entries(lesson.translations ?? {})) {
      if (!translation.URL) continue;
      const key = `${lang}/${translation.URL}`;
      const sourceOwner = sourceUrls.get(translation.URL);
      if ((sourceOwner && sourceOwner !== lesson) || (seen.get(key) ?? lesson) !== lesson) {
        translation.URL = null;
      } else {
        seen.set(key, lesson);
      }
    }
  }
}

function parseTranslations<T>(
  value: unknown,
  label: string,
  errors: string[],
  parseEntry: (entry: Record<string, unknown>, entryLabel: string) => T
): Record<string, T> | undefined {
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) {
    errors.push(`${label}: "translations" muss ein Objekt sein.`);
    return undefined;
  }

  const result: Record<string, T> = {};
  for (const [lang, entry] of Object.entries(value)) {
    const entryLabel = `${label}, Übersetzung ${lang}`;
    if (!TRANSLATION_LANGS.includes(lang)) {
      errors.push(`${entryLabel}: unbekannte Sprache.`);
      continue;
    }
    if (!isPlainObject(entry)) {
      errors.push(`${entryLabel}: kein gültiges Objekt.`);
      continue;
    }
    result[lang] = parseEntry(entry, entryLabel);
  }
  return result;
}

export type ParseResult =
  | { ok: true; data: CourseExportFile }
  | { ok: false; errors: string[] };

export function parseCourseExportFile(text: string): ParseResult {
  const errors: string[] = [];

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['Die Datei enthält kein gültiges JSON.'] };
  }

  if (!isPlainObject(raw)) {
    return { ok: false, errors: ['Die Datei enthält kein JSON-Objekt.'] };
  }

  if (!SUPPORTED_FORMAT_VERSIONS.includes(raw.formatVersion as number)) {
    return {
      ok: false,
      errors: [
        `Nicht unterstützte Formatversion (erwartet ${SUPPORTED_FORMAT_VERSIONS.join(' oder ')}, erhalten ${String(raw.formatVersion)}).`
      ]
    };
  }

  const course = raw.course;
  if (!isPlainObject(course)) {
    return { ok: false, errors: ['Der Kurs-Eintrag ("course") fehlt in der Datei.'] };
  }

  if (typeof course.name !== 'string' || course.name.trim() === '') {
    errors.push('Der Kursname ("name") fehlt oder ist leer.');
  }
  if (typeof course.URL !== 'string' || course.URL.trim() === '') {
    errors.push('Die Kurs-URL ("URL") fehlt oder ist leer.');
  }
  for (const key of ['description', 'introDescription', 'introDescriptionSuffix', 'displayType', 'lang']) {
    if (!isNullableString(course[key])) {
      errors.push(`Das Kursfeld "${key}" muss Text oder null sein.`);
    }
  }
  for (const key of ['active', 'position']) {
    if (!isInteger(course[key])) {
      errors.push(`Das Kursfeld "${key}" muss eine ganze Zahl sein.`);
    }
  }

  if (!Array.isArray(course.lessons)) {
    errors.push('Die Lektionsliste ("lessons") fehlt oder ist keine Liste.');
    return { ok: false, errors };
  }

  const lessonUrls = new Set<string>();
  const lessons: LessonExport[] = [];

  course.lessons.forEach((rawLesson: unknown, lessonIndex: number) => {
    const label = `Lektion ${lessonIndex + 1}`;
    if (!isPlainObject(rawLesson)) {
      errors.push(`${label}: kein gültiges Objekt.`);
      return;
    }

    if (typeof rawLesson.lessonName !== 'string' || rawLesson.lessonName.trim() === '') {
      errors.push(`${label}: der Name ("lessonName") fehlt oder ist leer.`);
    }
    if (typeof rawLesson.URL !== 'string' || rawLesson.URL.trim() === '') {
      errors.push(`${label}: die URL fehlt oder ist leer.`);
    } else if (lessonUrls.has(rawLesson.URL)) {
      errors.push(`${label}: die URL "${rawLesson.URL}" kommt in der Datei mehrfach vor.`);
    } else {
      lessonUrls.add(rawLesson.URL);
    }
    if (!isNullableString(rawLesson.lessonEmoji)) {
      errors.push(`${label}: das Feld "lessonEmoji" muss Text oder null sein.`);
    }
    for (const key of ['active', 'starsNeeded', 'position']) {
      if (!isInteger(rawLesson[key])) {
        errors.push(`${label}: das Feld "${key}" muss eine ganze Zahl sein.`);
      }
    }

    const elements: ElementExport[] = [];
    if (!Array.isArray(rawLesson.elements)) {
      errors.push(`${label}: die Elementliste ("elements") fehlt oder ist keine Liste.`);
    } else {
      rawLesson.elements.forEach((rawElement: unknown, elementIndex: number) => {
        const elementLabel = `${label}, Element ${elementIndex + 1}`;
        if (!isPlainObject(rawElement)) {
          errors.push(`${elementLabel}: kein gültiges Objekt.`);
          return;
        }
        if (typeof rawElement.type !== 'string' || rawElement.type.trim() === '') {
          errors.push(`${elementLabel}: der Typ ("type") fehlt oder ist leer.`);
        }
        if (!isInteger(rawElement.position)) {
          errors.push(`${elementLabel}: das Feld "position" muss eine ganze Zahl sein.`);
        }
        for (const key of ['title', 'description', 'taskA', 'devPromptA', 'taskB', 'devPromptB', 'devPromptC']) {
          if (!isNullableString(rawElement[key])) {
            errors.push(`${elementLabel}: das Feld "${key}" muss Text oder null sein.`);
          }
        }
        const elementTranslations = parseTranslations(rawElement.translations, elementLabel, errors, (entry, entryLabel) => {
          checkNullableStrings(entry, ELEMENT_TEXT_FIELDS, entryLabel, errors);
          return { ...pickTexts(entry, ELEMENT_TEXT_FIELDS), sourceHashes: asSourceHashes(entry.sourceHashes) };
        });
        elements.push({
          type: typeof rawElement.type === 'string' ? rawElement.type : '',
          title: asNullableString(rawElement.title),
          description: asNullableString(rawElement.description),
          taskA: asNullableString(rawElement.taskA),
          devPromptA: asNullableString(rawElement.devPromptA),
          taskB: asNullableString(rawElement.taskB),
          devPromptB: asNullableString(rawElement.devPromptB),
          devPromptC: asNullableString(rawElement.devPromptC),
          position: isInteger(rawElement.position) ? (rawElement.position as number) : 0,
          ...(elementTranslations === undefined ? {} : { translations: elementTranslations })
        });
      });
    }

    const quizQuestions: QuizQuestionExport[] = [];
    if (!Array.isArray(rawLesson.quizQuestions)) {
      errors.push(`${label}: die Quizliste ("quizQuestions") fehlt oder ist keine Liste.`);
    } else {
      rawLesson.quizQuestions.forEach((rawQuestion: unknown, questionIndex: number) => {
        const questionLabel = `${label}, Quizfrage ${questionIndex + 1}`;
        if (!isPlainObject(rawQuestion)) {
          errors.push(`${questionLabel}: kein gültiges Objekt.`);
          return;
        }
        if (typeof rawQuestion.question !== 'string' || rawQuestion.question.trim() === '') {
          errors.push(`${questionLabel}: der Fragetext ("question") fehlt oder ist leer.`);
        }
        if (typeof rawQuestion.type !== 'string' || !QUIZ_TYPES.includes(rawQuestion.type)) {
          errors.push(
            `${questionLabel}: der Typ muss einer von ${QUIZ_TYPES.join(', ')} sein.`
          );
        }
        if (!isStringArray(rawQuestion.options)) {
          errors.push(`${questionLabel}: "options" muss eine Liste von Texten sein.`);
        }
        if (!isStringArray(rawQuestion.correct)) {
          errors.push(`${questionLabel}: "correct" muss eine Liste von Texten sein.`);
        }
        if (!isInteger(rawQuestion.position)) {
          errors.push(`${questionLabel}: das Feld "position" muss eine ganze Zahl sein.`);
        }
        const optionCount = isStringArray(rawQuestion.options) ? rawQuestion.options.length : 0;
        const questionTranslations = parseTranslations(rawQuestion.translations, questionLabel, errors, (entry, entryLabel) => {
          checkNullableStrings(entry, ['question'], entryLabel, errors);
          if (entry.options !== undefined && !isStringArray(entry.options)) {
            errors.push(`${entryLabel}: "options" muss eine Liste von Texten sein.`);
          } else if (isStringArray(entry.options) && entry.options.length > optionCount) {
            errors.push(`${entryLabel}: es gibt mehr übersetzte Antworten als Antworten im Original.`);
          }
          return {
            question: asNullableString(entry.question),
            options: isStringArray(entry.options) ? entry.options : [],
            sourceHashes: asSourceHashes(entry.sourceHashes)
          };
        });
        quizQuestions.push({
          question: typeof rawQuestion.question === 'string' ? rawQuestion.question : '',
          type: typeof rawQuestion.type === 'string' ? rawQuestion.type : '',
          options: isStringArray(rawQuestion.options) ? rawQuestion.options : [],
          correct: isStringArray(rawQuestion.correct) ? rawQuestion.correct : [],
          position: isInteger(rawQuestion.position) ? (rawQuestion.position as number) : 0,
          ...(questionTranslations === undefined ? {} : { translations: questionTranslations })
        });
      });
    }

    const lessonTranslations = parseTranslations(rawLesson.translations, label, errors, (entry, entryLabel) => {
      checkNullableStrings(entry, ['lessonName'], entryLabel, errors);
      return {
        lessonName: asNullableString(entry.lessonName),
        URL: asTranslatedSlug(entry.URL),
        sourceHashes: asSourceHashes(entry.sourceHashes)
      };
    });
    lessons.push({
      lessonName: typeof rawLesson.lessonName === 'string' ? rawLesson.lessonName : '',
      lessonEmoji: asNullableString(rawLesson.lessonEmoji),
      URL: typeof rawLesson.URL === 'string' ? rawLesson.URL : '',
      active: isInteger(rawLesson.active) ? (rawLesson.active as number) : 0,
      starsNeeded: isInteger(rawLesson.starsNeeded) ? (rawLesson.starsNeeded as number) : 0,
      position: isInteger(rawLesson.position) ? (rawLesson.position as number) : 0,
      elements,
      quizQuestions,
      ...(lessonTranslations === undefined ? {} : { translations: lessonTranslations })
    });
  });

  const courseTranslations = parseTranslations(course.translations, 'Kurs', errors, (entry, entryLabel) => {
    checkNullableStrings(entry, COURSE_TEXT_FIELDS, entryLabel, errors);
    if (entry.active !== undefined && !isInteger(entry.active)) {
      errors.push(`${entryLabel}: das Feld "active" muss eine ganze Zahl sein.`);
    }
    return {
      active: isInteger(entry.active) ? (entry.active as number) : 0,
      ...pickTexts(entry, COURSE_TEXT_FIELDS),
      URL: asTranslatedSlug(entry.URL),
      sourceHashes: asSourceHashes(entry.sourceHashes)
    };
  });
  dropClashingLessonSlugs(lessons);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    data: {
      formatVersion: COURSE_EXPORT_FORMAT_VERSION,
      exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
      course: {
        name: course.name as string,
        URL: course.URL as string,
        description: asNullableString(course.description),
        introDescription: asNullableString(course.introDescription),
        introDescriptionSuffix: asNullableString(course.introDescriptionSuffix),
        active: course.active as number,
        position: course.position as number,
        displayType: asNullableString(course.displayType),
        lang: asNullableString(course.lang),
        lessons,
        ...(courseTranslations === undefined ? {} : { translations: courseTranslations })
      }
    }
  };
}

// ---------------------------------------------------------------------------
// Import diff
// ---------------------------------------------------------------------------

// Snapshot of the existing course as plain objects (built from Prisma by the
// route, kept Prisma-free here so the diff stays pure).
export type ExistingElementSnapshot = ElementExport & { id: number };
export type ExistingQuizQuestionSnapshot = QuizQuestionExport & { id: number };
export type ExistingLessonSnapshot = Omit<LessonExport, 'elements' | 'quizQuestions'> & {
  id: number;
  elements: ExistingElementSnapshot[];
  quizQuestions: ExistingQuizQuestionSnapshot[];
};
export type ExistingCourseSnapshot = Omit<CourseExport, 'lessons'> & {
  id: number;
  lessons: ExistingLessonSnapshot[];
};

export type ElementPairDiff = {
  index: number;
  status: 'new' | 'changed' | 'unchanged';
  typeChanged: boolean;
  changedFields: string[];
  existingId: number | null;
};

export type LessonDiff = {
  URL: string;
  lessonName: string;
  status: 'new' | 'changed' | 'unchanged';
  changedFields: string[];
  existingId: number | null;
  elements: ElementPairDiff[];
  elementIdsToDelete: number[];
  quizReplaced: boolean;
};

export type CourseDiff = {
  courseStatus: 'new' | 'exists';
  changedCourseFields: string[];
  lessons: LessonDiff[];
  removedLessons: { URL: string; lessonName: string; id: number }[];
};

const COURSE_SCALAR_FIELDS: (keyof Omit<CourseExport, 'lessons'>)[] = [
  'name',
  'description',
  'introDescription',
  'introDescriptionSuffix',
  'active',
  'position',
  'displayType',
  'lang'
];

const LESSON_SCALAR_FIELDS: (keyof Omit<LessonExport, 'elements' | 'quizQuestions'>)[] = [
  'lessonName',
  'lessonEmoji',
  'active',
  'starsNeeded',
  'position'
];

const ELEMENT_FIELDS: (keyof ElementExport)[] = [
  'type',
  'title',
  'description',
  'taskA',
  'devPromptA',
  'taskB',
  'devPromptB',
  'devPromptC',
  'position'
];

function changedFields<T>(incoming: T, existing: T, fields: (keyof T)[]): string[] {
  return fields
    .filter((field) => (incoming[field] ?? null) !== (existing[field] ?? null))
    .map((field) => String(field));
}

function quizEquals(a: QuizQuestionExport[], b: QuizQuestionExport[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort(byPosition);
  const sortedB = [...b].sort(byPosition);
  return sortedA.every((question, index) => {
    const other = sortedB[index];
    return (
      question.question === other.question &&
      question.type === other.type &&
      question.position === other.position &&
      JSON.stringify(question.options) === JSON.stringify(other.options) &&
      JSON.stringify(question.correct) === JSON.stringify(other.correct)
    );
  });
}

export function diffCourseImport(
  incoming: CourseExport,
  existing: ExistingCourseSnapshot | null
): CourseDiff {
  const lessons: LessonDiff[] = [];

  const existingLessonsByUrl = new Map<string, ExistingLessonSnapshot>();
  for (const lesson of existing?.lessons ?? []) {
    existingLessonsByUrl.set(lesson.URL, lesson);
  }

  for (const incomingLesson of [...incoming.lessons].sort(byPosition)) {
    const existingLesson = existingLessonsByUrl.get(incomingLesson.URL) ?? null;

    if (!existingLesson) {
      lessons.push({
        URL: incomingLesson.URL,
        lessonName: incomingLesson.lessonName,
        status: 'new',
        changedFields: [],
        existingId: null,
        elements: incomingLesson.elements.map((_, index) => ({
          index,
          status: 'new',
          typeChanged: false,
          changedFields: [],
          existingId: null
        })),
        elementIdsToDelete: [],
        quizReplaced: incomingLesson.quizQuestions.length > 0
      });
      continue;
    }

    const lessonChangedFields = changedFields(
      incomingLesson,
      existingLesson,
      LESSON_SCALAR_FIELDS
    );

    // Elements carry no natural key: pair by position order, index by index.
    const incomingElements = [...incomingLesson.elements].sort(byPosition);
    const existingElements = [...existingLesson.elements].sort(byPosition);

    const elementDiffs: ElementPairDiff[] = incomingElements.map((incomingElement, index) => {
      const existingElement = existingElements[index];
      if (!existingElement) {
        return { index, status: 'new', typeChanged: false, changedFields: [], existingId: null };
      }
      const fields = changedFields(incomingElement, existingElement, ELEMENT_FIELDS);
      return {
        index,
        status: fields.length > 0 ? 'changed' : 'unchanged',
        typeChanged: incomingElement.type !== existingElement.type,
        changedFields: fields,
        existingId: existingElement.id
      };
    });

    const elementIdsToDelete = existingElements
      .slice(incomingElements.length)
      .map((element) => element.id);

    const quizReplaced = !quizEquals(incomingLesson.quizQuestions, existingLesson.quizQuestions);

    const hasElementChanges =
      elementDiffs.some((diff) => diff.status !== 'unchanged') || elementIdsToDelete.length > 0;

    lessons.push({
      URL: incomingLesson.URL,
      lessonName: incomingLesson.lessonName,
      status:
        lessonChangedFields.length > 0 || hasElementChanges || quizReplaced
          ? 'changed'
          : 'unchanged',
      changedFields: lessonChangedFields,
      existingId: existingLesson.id,
      elements: elementDiffs,
      elementIdsToDelete,
      quizReplaced
    });
  }

  const incomingLessonUrls = new Set(incoming.lessons.map((lesson) => lesson.URL));
  const removedLessons = (existing?.lessons ?? [])
    .filter((lesson) => !incomingLessonUrls.has(lesson.URL))
    .map((lesson) => ({ URL: lesson.URL, lessonName: lesson.lessonName, id: lesson.id }));

  return {
    courseStatus: existing ? 'exists' : 'new',
    changedCourseFields: existing
      ? changedFields(incoming, existing, COURSE_SCALAR_FIELDS)
      : [],
    lessons,
    removedLessons
  };
}

// ---------------------------------------------------------------------------
// Copy-mode course URL suggestion
// ---------------------------------------------------------------------------

// Lesson URLs are unique per course, so a copy keeps them; only the course URL
// needs a free slug.
export function suggestCopyCourseUrl(courseUrl: string, takenCourseUrls: Set<string>): string {
  if (!takenCourseUrls.has(courseUrl)) return courseUrl;
  let candidate = `${courseUrl}-kopie`;
  let counter = 2;
  while (takenCourseUrls.has(candidate)) {
    candidate = `${courseUrl}-kopie-${counter}`;
    counter += 1;
  }
  return candidate;
}
