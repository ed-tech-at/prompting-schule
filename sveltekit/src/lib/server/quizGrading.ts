// Quiz answers arrive as indices into QuizQuestion.options, so a learner who
// sees translated options is graded against the source options. Plain option
// texts are still accepted for pages that were loaded before the switch.
export function answersToSourceOptions(options: string[], rawAnswers: unknown): string[] {
  if (!Array.isArray(rawAnswers)) return [];

  return rawAnswers
    .map((answer) => {
      const value = String(answer);
      if (/^\d+$/.test(value)) {
        return options[Number(value)];
      }
      return options.includes(value) ? value : undefined;
    })
    .filter((answer): answer is string => answer !== undefined);
}

export type GradedQuestion = {
  questionId: number;
  // Indices into the source options, so the page can show them in its language.
  userCorrectResponse: number[];
  points: number;
};

export function gradeQuestion(
  question: { id: number; type: string; options: string[]; correct: string[] },
  userAnswer: string[]
): GradedQuestion {
  let points = 0;
  const userCorrectResponse: string[] = [];

  if (question.type === 's') {
    // Single choice: 1 point for correct, 0 for incorrect
    if (userAnswer[0] !== undefined && userAnswer[0] === question.correct[0]) {
      points = 1;
      userCorrectResponse.push(userAnswer[0]);
    }
  } else if (question.type === 'm') {
    // Multiple choice: calculate fraction of correct answers
    const correctSet = new Set(question.correct);
    let correctCount = 0;
    let wrongCount = 0;

    for (const answer of new Set(userAnswer)) {
      if (correctSet.has(answer)) {
        userCorrectResponse.push(answer);
        correctCount++;
      } else {
        wrongCount++;
      }
    }

    points = correctCount / (question.correct.length + wrongCount * 2);
    points = Math.round(points * 100) / 100;
  }

  return {
    questionId: question.id,
    userCorrectResponse: userCorrectResponse.map((answer) => question.options.indexOf(answer)),
    points
  };
}
