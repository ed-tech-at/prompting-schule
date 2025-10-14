// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();
import { prisma } from '$lib/server/db';


import { json } from '@sveltejs/kit';

import { requireLogin } from '$lib/server/jwt';


export async function POST({ request, cookies }) {

  const user = requireLogin(cookies);


  let { answerData, action } = await request.json();

  if (action == "submitQuiz") {
    answerData = JSON.parse(answerData).answerData;
    answerData.answers = JSON.parse(answerData.answers);

    const quizQuestions = await prisma.quizQuestion.findMany({
      where: { lessonId: answerData.lessonId }
    });

    const results = [];
    let totalPoints = 0;

    for (const question of quizQuestions) {
      const userAnswer = answerData.answers[question.id];
      const correctAnswers = question.correct;
      let points = 0;
      let userCorrectResponse = [];

      if (question.type === 's') {
        // Single choice: 1 point for correct, 0 for incorrect
        if (userAnswer && userAnswer[0] === correctAnswers[0]) {
          points = 1;
          userCorrectResponse.push(userAnswer);
        }

      } else if (question.type === 'm') {
        // Multiple choice: calculate fraction of correct answers
        const correctSet = new Set(correctAnswers);
        const userSet = new Set(userAnswer);


        // const userCorrectResponse: string[] = [];
        let correctCount = 0;
        let wrongCount = 0;

        // Loop through the user's answers
        for (const answer of userSet) {
          if (correctSet.has(answer)) {
            userCorrectResponse.push(answer);
            correctCount++;
          } else {
            wrongCount++;
          }
        }

        // console.log('Correct answers given:', correctCount);
        // console.log('Wrong answers given:', wrongCount);
        // console.log('Correct user responses:', userCorrectResponse);

        points = correctCount / (correctAnswers.length + wrongCount * 2);
        points = Math.round(points * 100) / 100;
            
      }

      totalPoints += points;

      results.push({
        questionId: question.id,
        userCorrectResponse: userCorrectResponse,
        points: points,
        
      });
    }
    const maxPoints = quizQuestions.length;
    const percent = Math.ceil((totalPoints / maxPoints) * 100);

    if (answerData.userId !== user.id) {
      return json({
        success: false,
        message: "User ID passen nicht zusammen."
      });
    }

    const log = await prisma.userQuizAttempt.create({
      data: {
        user: {
          connect: { id: answerData.userId } // Connect to the existing user by userId
        },
        lesson: {
          connect: { id: answerData.lessonId } // Connect to the existing lesson by lessonId
        },
        course: {
          connect: { id: answerData.courseId } // Connect to the existing course by courseId
        },
        answers: JSON.stringify(answerData.answers),
        // results: JSON.stringify(results),
        // totalPoints: totalPoints,
        // maxPoints: maxPoints,
        percentReached: percent
      }
    });

    return json({
      success: true,
      results,
      totalPoints,
      maxPoints: maxPoints,
      percent: percent
    });
  }

  if (action == "getQuizResults") {
    
    
    

    if (answerData.userId !== user.id) {
      return json({
        success: false,
        message: "User ID passen nicht zusammen."
      });
    }

    // console.log('answerData:', answerData);
    const userId = answerData.userId;
    const lessonId = answerData.lessonId;
    
    
    const results = await prisma.userQuizAttempt.findFirst({
      where: { userId: userId, lessonId: lessonId },
      orderBy: { percentReached: 'desc' }
    });

    
    if (!results) {
      return json({
        success: false,
        message: "No quiz results found."
      });
    }

    return json({
      success: true,
      percentReached: results.percentReached
    });
  }

  if (action == "getPromptsTried") {
    if (answerData.userId !== user.id) {
      return json({
        success: false,
        message: "User ID passen nicht zusammen."
      });
    }
    const promptsTried = await prisma.userProgress.aggregate({
      where: { userId: answerData.userId, lessonId: answerData.lessonId },
      _count: {
        promptsTried: true
      }
    });
    return json({
      success: true,
      promptsTried: promptsTried._count.promptsTried
    });

  }
}