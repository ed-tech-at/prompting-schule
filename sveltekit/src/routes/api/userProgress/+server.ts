import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import { error, json } from '@sveltejs/kit';
import { OPENAI_API_KEY } from '$env/static/private';

import OpenAI from 'openai';

import { marked } from 'marked';



const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

export async function POST({ request }) {
	let { data,  action } = await request.json();

  if (action == "aiSide1") {
    data = JSON.parse(data).data;
    const element = await prisma.element.findUnique({ where: { id: data.elementId } });

    // console.log('data parse aiSide1', data);

    // console.log(`Generating AI 1 response for userId ${data.userId} developerPrompt: ${element.devPromptA} input: "${data.AI1}"`);
    // return json({ response: "AI1" });

    if (data.ai1.length > 5000) {
      return json( {success: false, error: "Anfrage zu lange" });
    }

    const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Use GPT-4o-mini or a different OpenAI model if preferred
        messages: [
            { role: "developer", content: element.devPromptA },
            { role: "user", content: data.ai1 }
        ],
        temperature: 0.7,
        max_completion_tokens: 1000
    });

    let responseText = aiResponse.choices[0]?.message?.content?.trim() || "No response generated.";

    responseText = marked.parse(responseText);

    const promptTokens = aiResponse.usage?.prompt_tokens;
    const completionTokens = aiResponse.usage?.completion_tokens;

    const logResult = await prisma.userProgress.create({ 
      data: {
        userId: data.userId,
        elementId: data.elementId,
        courseId: data.courseId,
        lessonId: data.lessonId,
        ai1: data.ai1,
        ai1Result: responseText,
        completionTokens: completionTokens,
        promptTokens: promptTokens,
        promptsTried: 1
      }
    });

    return json( {success: true, ai1Result: responseText, promptTokens, completionTokens });
  } 
  if (action == "aiSide2") {
    data = JSON.parse(data).data;
    const element = await prisma.element.findUnique({ where: { id: data.elementId } });

    console.log('data parse aiSide2', data);

    console.log(`Generating AI 2 response for userId ${data.userId} developerPrompt: ${element.devPromptB} input: "${data.ai2}"`); // Updated input reference to data.ai2
    // return json({ response: "AI2" }); // Updated response comment to reflect action "ai2"

    if (data.ai2.length > 5000) {
      return json( {success: false, error: "Anfrage zu lange" });
    }

    const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Use GPT-4o-mini or a different OpenAI model if preferred
        messages: [
            { role: "developer", content: element.devPromptB },
            { role: "user", content: data.ai2 }
        ],
        temperature: 0.7,
        max_completion_tokens: 1000
    });

    let responseText = aiResponse.choices[0]?.message?.content?.trim() || "No response generated.";

    responseText = marked.parse(responseText);
    
    const promptTokens = aiResponse.usage?.prompt_tokens;
    const completionTokens = aiResponse.usage?.completion_tokens;

    const logResult = await prisma.userProgress.create({ 
      data: {
        userId: data.userId,
        elementId: data.elementId,
        courseId: data.courseId,
        lessonId: data.lessonId,
        ai2: data.ai2,
        ai2Result: responseText,
        completionTokens: completionTokens,
        promptTokens: promptTokens,
        promptsTried: 1
      }
    });

    // console.log('logResult', logResult);


    return json( {success: true, ai2Result: responseText, promptTokens, completionTokens });
  }

  
  


  if (action == "ai1") {
    data = JSON.parse(data).data;
    const element = await prisma.element.findUnique({ where: { id: data.elementId } });

    console.log('data parse ai1', data);

    console.log(`Generating AI 1 response for userId ${data.userId} developerPrompt: ${element.devPromptA} input: "${data.AI1}"`);
    // return json({ response: "AI1" });

    if (data.ai1.length > 5000) {
      return json( {success: false, error: "Anfrage zu lange" });
    }

    const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Use GPT-4o-mini or a different OpenAI model if preferred
        messages: [
            { role: "developer", content: element.devPromptA },
            { role: "user", content: data.ai1 },
            { role: "user", content: element.devPromptB }
        ],
        temperature: 0.7,
        max_completion_tokens: 1000
    });

    let responseText = aiResponse.choices[0]?.message?.content?.trim() || "No response generated.";

    responseText = marked.parse(responseText);

    const promptTokens = aiResponse.usage?.prompt_tokens;
    const completionTokens = aiResponse.usage?.completion_tokens;

    const logResult = await prisma.userProgress.create({ 
      data: {
        userId: data.userId,
        elementId: data.elementId,
        courseId: data.courseId,
        lessonId: data.lessonId,
        ai1: data.ai1,
        ai1Result: responseText,
        completionTokens: completionTokens,
        promptTokens: promptTokens,
        promptsTried: 1
      }
    });

    return json( {success: true, ai1Result: responseText, promptTokens, completionTokens });
  } 

  

  if (action == "ai2") {
    data = JSON.parse(data).data;
    const element = await prisma.element.findUnique({ where: { id: data.elementId } });

    console.log('data parse ai2', data);

    console.log(`Generating AI 2 response for userId ${data.userId} developerPrompt: ${element.devPromptA} input: "${data.ai2}"`); // Updated to reflect action "ai2"
    // return json({ response: "AI2" });
    if (data.ai2.length > 5000) {
      return json( {success: false, error: "Anfrage zu lange" });
    }

    const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Use GPT-4o-mini or a different OpenAI model if preferred
        messages: [
            { role: "developer", content: element.devPromptA },
            { role: "user", content: element.devPromptB },
            { role: "user", content: data.ai2 }
        ],
        temperature: 0.7,
        max_completion_tokens: 1000
    });

    let responseText = aiResponse.choices[0]?.message?.content?.trim() || "No response generated.";

    responseText = marked.parse(responseText);

    const promptTokens = aiResponse.usage?.prompt_tokens;
    const completionTokens = aiResponse.usage?.completion_tokens;

    const logResult = await prisma.userProgress.create({ 
      data: {
        userId: data.userId,
        elementId: data.elementId,
        courseId: data.courseId,
        lessonId: data.lessonId,
        ai2: data.ai2,
        ai2Result: responseText,
        completionTokens: completionTokens,
        promptTokens: promptTokens,
        promptsTried: 1
      }
    });

    return json( {success: true, ai2Result: responseText, promptTokens, completionTokens });
  } 

  
  if (action == "ai12") {
    data = JSON.parse(data).data;
    const element = await prisma.element.findUnique({ where: { id: data.elementId } });

    console.log('data parse ai12', data);

    console.log(`Generating AI 1 response for userId ${data.userId} developerPrompt: ${element.devPromptA} input: "${data.ai1}"`);
    // return json({ response: "AI1" });

    if (data.ai2.length > 5000) {
      return json( {success: false, error: "Anfrage zu lange" });
    }
    if (data.ai1.length > 5000) {
      return json( {success: false, error: "Anfrage zu lange" });
    }

    const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Use GPT-4o-mini or a different OpenAI model if preferred
        messages: [
            { role: "developer", content: element.devPromptA },
            { role: "user", content: data.ai1 },
            { role: "user", content: data.ai2 }
        ],
        temperature: 0.7,
        max_completion_tokens: 1000
    });

    let responseText = aiResponse.choices[0]?.message?.content?.trim() || "No response generated.";

    responseText = marked.parse(responseText);

    const promptTokens = aiResponse.usage?.prompt_tokens;
    const completionTokens = aiResponse.usage?.completion_tokens;

    const logResult = await prisma.userProgress.create({ 
      data: {
        userId: data.userId,
        elementId: data.elementId,
        courseId: data.courseId,
        lessonId: data.lessonId,
        ai1: data.ai1,
        ai1Result: responseText,
        completionTokens: completionTokens,
        promptTokens: promptTokens,
        promptsTried: 1
      }
    });

    return json( {success: true, ai1Result: responseText, promptTokens, completionTokens });
  } 

  

  if (action == "star") {
    data = JSON.parse(data).data;
    const element = await prisma.element.findUnique({ where: { id: data.elementId } });

    console.log('data parse star', data);

    console.log(`Generating AI 1 response for userId ${data.userId} developerPrompt: ${element.devPromptA} input: "${data.ai1}"`);
    // return json({ response: "AI1" });

    const starPrompt = `Wenn die Aufgabe vom User erfüllt ist, antworte in JSON {"star": true, "feedback": feedbackText} und schreibe ein freundliches Feedback in feedbackText. Ansonsten JSON {"star": false, "feedback": feedbackText}`;

    if (data.ai1.length > 5000) {
      return json( {success: false, error: "Anfrage zu lange" });
    }

    const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Use GPT-4o-mini or a different OpenAI model if preferred
        messages: [
            { role: "developer", content: element.devPromptA + starPrompt },
            { role: "user", content: data.ai1 }
        ],
        response_format: { "type": "json_object" },
        temperature: 0.7,
        max_completion_tokens: 1000
    });

    let responseText = aiResponse.choices[0]?.message?.content?.trim() || "No response generated.";

    console.log('responseText', responseText);
    responseText = JSON.parse(responseText);

    responseText.feedback = marked.parse(responseText.feedback);

    const star = responseText.star ? 1 : 0;
    console.log('responseText after feedbakck parsed', responseText);
    
    responseText = JSON.stringify(responseText);
    console.log('response trext stirngified', responseText);

    const promptTokens = aiResponse.usage?.prompt_tokens;
    const completionTokens = aiResponse.usage?.completion_tokens;

    const logResult = await prisma.userProgress.create({ 
      data: {
        userId: data.userId,
        elementId: data.elementId,
        courseId: data.courseId,
        lessonId: data.lessonId,
        stars: star,
        ai1: data.ai1,
        ai1Result: responseText,
        completionTokens: completionTokens,
        promptTokens: promptTokens,
        promptsTried: 1
      }
    });

    return json( {success: true, ai1Result: responseText, promptTokens, completionTokens });
  } 

  


  if (action === 'getUserProgressElementAi1') {
    data = JSON.parse(data);
    // console.log('getUserProgressElementAi1', data);
    // console.log('elementId', data.userId);
    const userProgress = await prisma.userProgress.findFirst({
      where: { userId: data.userId, elementId: data.elementId, ai1Result: { not: null } },
      orderBy: { createdAt: 'desc' }
    });
    if (!userProgress) {
      // console.log('userProgress', userProgress);
      return json({ success: false });
    }
    // console.log('userProgress', userProgress);
    return json({ success: true, userProgress });

  }
  if (action === 'getUserProgressElementAi2') {
    data = JSON.parse(data);

    const userProgress = await prisma.userProgress.findFirst({
      where: { userId: data.userId, elementId: data.elementId, ai2Result: { not: null } },
      orderBy: { createdAt: 'desc' }
    });
    // console.log(' data.elementId',  data);
    // console.log('userProgress', userProgress);

    if (!userProgress) {
      // console.log('userProgress', userProgress);
      return json({ success: false });
    }

    return json({ success: true, userProgress });

  }


  if (action === 'getUserProgressElementStar') {
    data = JSON.parse(data);
    // console.log('getUserProgressElementAi1', data);
    // console.log('elementId', data.userId);
    const userProgress = await prisma.userProgress.findFirst({
      where: { userId: data.userId, elementId: data.elementId, ai1Result: { not: null } },
      orderBy: [{ stars: 'desc' }, { createdAt: 'desc' }]
    });

    if (!userProgress) {
      // console.log('userProgress', userProgress);
      return json({ success: false });
    }
    // console.log('userProgress', userProgress);
    return json({ success: true, userProgress });

  }

  if (action === 'getLessonStars') {
    data = JSON.parse(data);
    // console.log('getUserProgressElementAi1', data);
    // console.log('elementId', data.userId);
    const userProgress = await prisma.userProgress.groupBy({
      by: ['elementId'],
      where: { userId: data.userId, lessonId: data.lessonId, stars: { not: 0 } }
    });

    // console.log('userProgress', userProgress);

    // const totalStars = userProgress.reduce((sum, progress) => sum + (progress._sum.stars || 0), 0);
    
    // console.log('userProgress', userProgress);
    return json({ success: true, stars: userProgress.length });

  }

  
}

