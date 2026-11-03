// Instructions for the AI pre-translation in the translate view. Kept free of
// the OpenAI client so the wording can be tested.

const LANGUAGE_NAMES: Record<string, string> = { de: 'German', en: 'English' };

// System prompts are instructions for the course AI, not text learners read.
// They need a different translation brief than the visible course content.
export const PROMPT_FIELDS = ['devPromptA', 'devPromptB', 'devPromptC'];

export const AI_TRANSLATABLE_FIELDS = [
  'name',
  'description',
  'introDescription',
  'introDescriptionSuffix',
  'lessonName',
  'title',
  'taskA',
  'taskB',
  'question',
  'option',
  ...PROMPT_FIELDS
];

export const AI_TRANSLATION_MAX_LENGTH = 20_000;

export function buildTranslationInstructions(field: string, sourceLang: string, targetLang: string): string {
  const from = LANGUAGE_NAMES[sourceLang] ?? sourceLang;
  const to = LANGUAGE_NAMES[targetLang] ?? targetLang;

  const common = [
    `You translate content of an online course about prompt engineering and AI from ${from} to ${to}.`,
    'Return only the translation, with no explanations, quotes or code fences around it.',
    'Keep all HTML tags, attributes, inline scripts, Markdown, emojis, line breaks, URLs and placeholders exactly as they are; translate only the human-readable text.',
    'Do not translate code, JSON keys or function names.',
    'Use a friendly, clear tone suitable for learners. Keep the formal or informal form of address consistent with the source.'
  ];

  if (PROMPT_FIELDS.includes(field)) {
    return [
      ...common,
      `The text is a system prompt that instructs the course AI. Translate it so that it works the same way for ${to}-speaking learners.`,
      `If it tells the AI to answer in ${from}, make it answer in ${to} instead. Keep JSON formats and keywords the AI must output unchanged.`
    ].join('\n');
  }

  if (field === 'option') {
    return [...common, 'The text is one answer option of a quiz question. Keep it as short as the source.'].join('\n');
  }

  return common.join('\n');
}
