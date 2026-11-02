import { describe, expect, it } from 'vitest';
import { answersToSourceOptions, gradeQuestion } from './quizGrading';

const options = ['Paris', 'Berlin', 'Wien'];

describe('answersToSourceOptions', () => {
  it('maps option indices to the source options', () => {
    expect(answersToSourceOptions(options, ['2', '0'])).toEqual(['Wien', 'Paris']);
  });

  it('still accepts option texts from pages loaded before the switch', () => {
    expect(answersToSourceOptions(options, ['Berlin'])).toEqual(['Berlin']);
  });

  it('drops unknown indices and texts', () => {
    expect(answersToSourceOptions(options, ['7', 'Rom'])).toEqual([]);
    expect(answersToSourceOptions(options, undefined)).toEqual([]);
  });
});

describe('gradeQuestion', () => {
  it('grades single choice and reports correct answers as indices', () => {
    const question = { id: 1, type: 's', options, correct: ['Wien'] };
    expect(gradeQuestion(question, ['Wien'])).toEqual({ questionId: 1, userCorrectResponse: [2], points: 1 });
    expect(gradeQuestion(question, ['Paris'])).toEqual({ questionId: 1, userCorrectResponse: [], points: 0 });
  });

  it('keeps the multiple choice formula', () => {
    const question = { id: 2, type: 'm', options, correct: ['Berlin', 'Wien'] };
    expect(gradeQuestion(question, ['Berlin', 'Wien']).points).toBe(1);
    // 1 correct / (2 correct answers + 1 wrong * 2)
    expect(gradeQuestion(question, ['Berlin', 'Paris'])).toEqual({
      questionId: 2,
      userCorrectResponse: [1],
      points: 0.25
    });
  });
});
