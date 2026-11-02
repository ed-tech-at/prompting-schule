// Nur diese Elementtypen zeigen devPromptB im Client an (ElementRender.svelte).
const SHOWS_PROMPT_B = new Set(['ai1', 'ai2', 'ai2only']);

// Entfernt System-Prompts, die Lernende nicht sehen sollen, aus den Seitendaten.
// devPromptA und devPromptC bleiben immer serverseitig (api/aiAnswer).
export function redactElementPrompts<
  T extends { type: string; devPromptA: string | null; devPromptB: string | null; devPromptC: string | null }
>(elements: T[]): T[] {
  return elements.map((element) => ({
    ...element,
    devPromptA: null,
    devPromptB: SHOWS_PROMPT_B.has(element.type) ? element.devPromptB : null,
    devPromptC: null
  }));
}
