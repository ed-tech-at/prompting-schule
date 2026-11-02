// Sprachen der Kursinhalte und die Texte der Kursoberfläche. Ein Kurs wird in
// seiner Ausgangssprache (Course.lang) geplant und kann in weitere Sprachen
// übersetzt werden; die Oberfläche drumherum kommt aus COURSE_TEXTS.

export const COURSE_LANGS = ['de', 'en'] as const;
export type CourseLang = (typeof COURSE_LANGS)[number];

export const COURSE_LANG_LABELS: Record<CourseLang, string> = {
  de: 'Deutsch',
  en: 'Englisch'
};

export function isCourseLang(value: unknown): value is CourseLang {
  return typeof value === 'string' && (COURSE_LANGS as readonly string[]).includes(value);
}

// Die deutschen und englischen Kursseiten behalten ihre bisherigen URLs, weil
// diese in Badges, Mails und Lehrmaterialien verlinkt sind.
const BASE_PATHS: Record<CourseLang, { courses: string; course: string }> = {
  de: { courses: '/kurse', course: '/kurs' },
  en: { courses: '/en/courses', course: '/en/course' }
};

export function coursePaths(lang: CourseLang) {
  const base = BASE_PATHS[lang];
  return {
    courses: base.courses,
    course: (courseUrl: string) => `${base.course}/${courseUrl}`,
    lesson: (courseUrl: string, lessonUrl: string) => `${base.course}/${courseUrl}/${lessonUrl}`,
    quiz: (courseUrl: string, lessonUrl: string) => `${base.course}/${courseUrl}/${lessonUrl}/quiz`,
    badge: (courseUrl: string, lessonUrl: string) => `${base.course}/${courseUrl}/${lessonUrl}/badge`
  };
}

const de = {
  dateLocale: 'de-DE',
  numberLocale: 'de-AT',

  navCourses: 'Kurse',
  coursesTitle: 'Übersicht der Kurse',
  coursePrefix: 'Kurs',
  lessonPrefix: 'Lektion',
  courseNotFound: 'Kurs nicht gefunden',
  lessonNotFound: 'Lektion nicht gefunden',

  lessonContains: 'Diese Lektion enthält:',
  tasksDone: 'Von Ihnen absolvierte Aufgaben:',
  starsNeeded: 'Zum Abschluss dieser Lektion benötigen Sie:',
  starsCollected: 'Gesammelte Sterne:',
  bestQuizAttempt: (percent: number) => `Ihr bester Quiz-Versuch liegt bei ${percent}%.`,
  showBadge: (date: string) => `Badge vom ${date} anzeigen`,
  createBadge: 'Badge erstellen',
  quizForBadge: 'Schließe das Quiz mit mindestens 75 % für den Badge ab.',
  workForBadge: 'Bearbeite die Lektion für einen Badge.',

  copyLeftFirst: 'Bitte erstelle zuerst die linke KI-Antwort in der Übung darüber.',
  copyRightFirst: 'Bitte erstelle zuerst die rechte KI-Antwort in der Übung darüber.',

  tasksMustPrefix: (count: number): string =>
    count === 1 ? 'Zum Abschluss dieser Lektion muss' : 'Zum Abschluss dieser Lektion müssen',
  taskWord: (count: number): string => (count === 1 ? 'Aufgabe' : 'Aufgaben'),
  tasksMustSuffix: 'gelöst werden.',
  starsCollectedByYou: 'Von Ihnen gesammelte Sterne:',
  bestAttempt: (percent: number) => `Ihr bester Versuch liegt bei ${percent}%.`,
  restartQuiz: 'Quiz erneut starten',
  startQuiz: 'Quiz starten',
  notEnoughTasks: 'Sie haben noch nicht genügend Aufgaben abgeschlossen, um das Quiz zu starten.',
  notEnoughStars: 'Sie haben noch nicht genügend Sterne gesammelt, um das Quiz zu starten.',

  quizTitle: (lessonName: string) => `Quiz zu ${lessonName}`,
  quizIntro: 'Beantworten Sie die Quizfragen.',
  chooseOne: 'Wählen Sie eine Antwort',
  chooseMany: 'Wählen Sie eine oder mehrere Antworten',
  yourCorrectAnswers: 'Ihre korrekten Antworten:',
  points: 'Punkte:',
  submitQuiz: 'Quiz abschicken',
  quizSummary: 'Quiz Zusammenfassung',
  pointsEarned: 'Erreichte Punkte:',
  percent: 'Prozent:',
  quizPassed: 'Gut gemacht! Lektion abgeschlossen.',
  toCoursePage: (courseName: string) => `Zur Kurs-Seite ${courseName}`,
  quizNotPassed: 'Diese Quiz-Leistung reicht für den Digital Badge noch nicht aus.',
  backToLesson:
    'Gehen Sie zur Lektion zurück und schauen Sie sich die Inhalte erneut an. Sobald Sie 75 % beim Quiz erreichen, erhalten Sie den Digital Badge.',
  quizSubmitFailed: 'Fehler beim Abschließen von quiz',

  badgeTitle: (email: string) => `Digital Badge von ${email}`,
  badgeFor: 'für die Lektion',
  badgeInCourse: 'im Kurs',
  newBadge: (prompts: number) => `Neuen Badge mit ${prompts} Prompts erstellen`,
  badgeIssued: 'Badge ausgestellt am:',
  badgePublicLink: 'Link zum öffentlichen Digital Badge:',
  badgeDownload: 'Badge herunterladen',

  notePlaceholder: 'Notiz für Sie',
  saveNote: 'Notiz speichern',
  enterMessage: 'Nachricht eingeben',
  enterSameMessage: 'Dieselbe Nachricht eingeben',
  sendWithoutMemory: 'Ohne Gedächtnis senden',
  sendWithMemory: 'Mit Gedächtnis senden',
  memory: 'Gedächtnis',
  clearMemory: 'Gedächtnis löschen',
  answer: 'Antwort',
  generating: 'wird generiert',
  tokenInfo: (completion: number, prompt: number) =>
    `besteht aus ${completion} Tokens und ${prompt} Anfrage-Tokens`,
  submit: 'Absenden',
  feedback: 'Feedback',
  taskCompleted: 'Aufgabe erfolgreich abgeschlossen',
  starReceived: 'Sie haben einen Stern erhalten',
  betterPrompt: 'Besserer Prompt',
  worsePrompt: 'Schlechterer Prompt',
  useBetterPrompt: 'Besseren Prompt übernehmen',
  useWorsePrompt: 'Schlechteren Prompt übernehmen',
  policyViolation:
    '<i>⚠️ Ihre Eingabe konnte leider nicht verarbeitet werden, da sie gegen die Inhaltsrichtlinien verstößt.</i>',
  loadError: '<i>Fehler beim Laden der Antwort.</i>',
  parseError: 'Fehler beim Parsen der Rückgabe'
};

export type CourseTexts = typeof de;

const en: CourseTexts = {
  dateLocale: 'en-GB',
  numberLocale: 'en-GB',

  navCourses: 'Courses',
  coursesTitle: 'Overview of Courses',
  coursePrefix: 'Course',
  lessonPrefix: 'Lesson',
  courseNotFound: 'Course not found',
  lessonNotFound: 'Lesson not found',

  lessonContains: 'This lesson contains:',
  tasksDone: 'Tasks you have completed:',
  starsNeeded: 'To complete this lesson, you need:',
  starsCollected: 'Total stars:',
  bestQuizAttempt: (percent) => `Your best quiz attempt is ${percent}%.`,
  showBadge: (date) => `Show badge from ${date}`,
  createBadge: 'Create badge',
  quizForBadge: 'Complete the quiz with at least 75% for the badge.',
  workForBadge: 'Work on the lesson for a badge.',

  copyLeftFirst: 'Please create the left AI answer in the exercise above first.',
  copyRightFirst: 'Please create the right AI answer in the exercise above first.',

  tasksMustPrefix: () => 'To complete this lesson,',
  taskWord: (count) => (count === 1 ? 'task' : 'tasks'),
  tasksMustSuffix: 'must be completed.',
  starsCollectedByYou: 'Stars you have collected:',
  bestAttempt: (percent) => `Your best attempt is at ${percent}%.`,
  restartQuiz: 'Restart quiz',
  startQuiz: 'Start quiz',
  notEnoughTasks: 'You have not completed enough tasks to start the quiz.',
  notEnoughStars: 'You have not collected enough stars to start the quiz.',

  quizTitle: (lessonName) => `Quiz for Lesson ${lessonName}`,
  quizIntro: 'Please answer the quiz questions.',
  chooseOne: 'Choose one answer',
  chooseMany: 'Choose one or more answers',
  yourCorrectAnswers: 'Your correct answers:',
  points: 'Points:',
  submitQuiz: 'Submit quiz',
  quizSummary: 'Quiz Summary',
  pointsEarned: 'Points earned:',
  percent: 'Percentage:',
  quizPassed: 'Well done! Lesson completed.',
  toCoursePage: (courseName) => `Go to course page ${courseName}`,
  quizNotPassed: 'This quiz performance is not enough for the digital badge.',
  backToLesson:
    'Go back to the lesson and review the content. Once you reach 75% on the quiz, you will receive the digital badge.',
  quizSubmitFailed: 'Error submitting quiz',

  badgeTitle: (email) => `Digital Badge for ${email}`,
  badgeFor: 'for the lesson',
  badgeInCourse: 'in the course',
  newBadge: (prompts) => `Create new badge with ${prompts} prompts`,
  badgeIssued: 'Badge created at:',
  badgePublicLink: 'Link to public digital badge:',
  badgeDownload: 'Download badge',

  notePlaceholder: 'Note for you',
  saveNote: 'Save note',
  enterMessage: 'Enter message',
  enterSameMessage: 'Enter the same message',
  sendWithoutMemory: 'Send without memory',
  sendWithMemory: 'Send with memory',
  memory: 'Memory',
  clearMemory: 'Clear memory',
  answer: 'Answer',
  generating: 'is being generated',
  tokenInfo: (completion, prompt) => `consists of ${completion} tokens and ${prompt} request tokens`,
  submit: 'Submit',
  feedback: 'Feedback',
  taskCompleted: 'Task completed successfully',
  starReceived: 'You have received a star',
  betterPrompt: 'Better Prompt',
  worsePrompt: 'Worse Prompt',
  useBetterPrompt: 'Use better prompt',
  useWorsePrompt: 'Use worse prompt',
  policyViolation: '<i>⚠️ Your input could not be processed because it violates content policies.</i>',
  loadError: '<i>Error loading response.</i>',
  parseError: 'Error parsing the response'
};

export const COURSE_TEXTS: Record<CourseLang, CourseTexts> = { de, en };
