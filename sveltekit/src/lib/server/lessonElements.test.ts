import { describe, expect, it } from 'vitest';
import { redactElementPrompts } from './lessonElements';

const element = (type: string) => ({
  type,
  devPromptA: 'A',
  devPromptB: 'B',
  devPromptC: 'C'
});

describe('redactElementPrompts', () => {
  it('never ships devPromptA or devPromptC', () => {
    for (const type of ['ai1', 'ai2', 'ai2only', 'labor', 'text']) {
      const [redacted] = redactElementPrompts([element(type)]);
      expect(redacted.devPromptA).toBeNull();
      expect(redacted.devPromptC).toBeNull();
    }
  });

  it('keeps devPromptB only for types that display it', () => {
    const redacted = redactElementPrompts(['ai1', 'ai2', 'ai2only', 'labor', 'ai1only'].map(element));
    expect(redacted.map((e) => e.devPromptB)).toEqual(['B', 'B', 'B', null, null]);
  });
});
