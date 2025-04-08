import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import { error, json } from '@sveltejs/kit';


import { newBadgeHash } from '$lib/server/dbUtils';

import { requireLogin } from '$lib/server/jwt';

import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

function fontToBase64(filePath: string) {
	const fontBuffer = fs.readFileSync(filePath);
	return fontBuffer.toString('base64');
}

export async function POST({ request, cookies }) {

  

  let { formData,  action } = await request.json();

  const user = requireLogin(cookies);

  

  if (action === 'createLessonBadge') {
    console.log('formData', formData);
    const { lessonId } = formData;
    
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
      return json({ success: false, error: 'Lesson not found' });
    }
    const bestQuiz = await prisma.userQuizAttempt.findFirst({
      where: {
        userId: user.id,
        lessonId: lesson.id
      },
      orderBy: {
        percentReached: 'desc'
      }
    });
    if (!bestQuiz) {
      return json({ success: false, error: 'No quiz attempt found' });
    }
    if (bestQuiz.percentReached < 30) {
      //  todo
      return json({ success: false, error: 'Not enough points' });
    }

    console.log('bestQuiz', bestQuiz);

    const aggregate = await prisma.userProgress.aggregate({
      where: {
        userId: user.id,
        lessonId: lesson.id
      },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        promptsTried: true,

      }
    });

    console.log('aggregate', aggregate);

    const hash = await newBadgeHash(user.id, lessonId);

    const badge = await prisma.badge.create({
      data: {
        userId: user.id,
        type: 'lesson',
        lessonId: lesson.id,
        promptsTried: aggregate._sum.promptTokens,
        promptTokens: aggregate._sum.promptTokens,
        completionTokens: aggregate._sum.completionTokens,
        hash: hash,
      }
    });
    
    console.log('badge', badge);
    return json({ success: true, badge });
  }

  if (action === "getBadgeImg") {
    const badgeDb = await prisma.badge.findFirst({ where: { userId: user.id, hash: formData.hash } });
    
    const badgePath = path.resolve('static/badge/badge_v1_1.png');
    // const boldFontBase64 = fontToBase64('static/badge/Jost-Bold.ttf');
    // const boldFontBase64 = fontToBase64('static/fonts/jost-v18-latin/jost-v18-latin-100italic.woff2');
    // const fontLesson = path.resolve('static/badge/Jost-Regular.ttf');

    const lesson = await prisma.lesson.findUnique({ where: { id: badgeDb?.lessonId } });

const certUrl = `https://example.com/badges/${badgeDb?.hash}`; // falls QR auf externe Assertion zeigt
	const qrBuffer = await QRCode.toBuffer(certUrl, {
    color: {
      dark: "#009CB1",
      light: "#E4F3F5"
    },
    margin: 0,
    width: 180
  }
   );

	// SVG-Overlay erzeugen
	const svg = `
	<svg width="1000" height="1000"  xmlns="http://www.w3.org/2000/svg">
	  <defs>
		<style type="text/css">
		  
		  .email {
			font-family: 'Arial';
			font-size: 48px;
			text-anchor: middle;
			fill: #009CB1;
		  }
		  .lesson {
			font-family: 'Arial';
			
			font-size: 32px;
			// text-anchor: middle;
			fill: #009CB1;
		  }
		</style>
	  </defs>
	  <text x="50%" y="410" class="email">${user.email}</text>
	  <text x="60" y="545" class="lesson">hat die Lektion ${lesson?.lessonName}</text>
	  <text x="50%" y="585" class="lesson">im Kurs KURSNAME</text>
	  <text x="50%" y="645" class="lesson"> bearbeitet und die Selbstüberprüfung positiv absolivert.</text>
	  <text x="50%" y="845" class="lesson">Ausgesellt am ${badgeDb?.createdAt.toLocaleDateString('de-DE')}</text>
	  <text x="50%" y="970" class="lesson"> prompting.schule2 eduNexus Ausgestellt am: ${badgeDb?.createdAt.toLocaleDateString('de-DE')}</text>
	</svg>`;

  console.log (svg);


	const svgBuffer = Buffer.from(svg);

	// Bild generieren (nicht speichern!)
	const badge = await sharp(badgePath)
		.composite([
			{ input: qrBuffer, top: 180, left: 730 }, // Position QR
			{ input: svgBuffer, top: 0, left: 0 }   // SVG-Text
		])
		.png()
		.toBuffer();


// // Text als PNGs rendern mit sharp.text() (ab Node 18 / Sharp >0.32)
// const emailText = await sharp({
//   text: {
//     text: user.email,
//     font: path.resolve('static/badge/Jost-Bold.ttf'),
//     width: 800,
//     align: 'center',
//     dpi: 72
//   }
// }).png().toBuffer();

// const lessonText = await sharp({
//   text: {
//     text: lesson.lessonName + " eduNexus prompting.schule",
//     font: path.resolve('static/badge/Jost-Regular.ttf'),
//     width: 800,
//     align: 'center',
//     dpi: 300
//   }
// }).png().toBuffer();

// const dateText = await sharp({
//   text: {
//     text: `Ausgestellt am: ${badgeDb?.createdAt.toLocaleDateString('de-DE')}`,
//     font: path.resolve('static/badge/Jost-Regular.ttf'),
//     width: 800,
//     align: 'center',
//     dpi: 72
//   }
// }).png().toBuffer();

// // Badge-Bild laden & zusammensetzen
// const badge = await sharp(badgePath)
//   .composite([
//     { input: qrBuffer, top: 180, left: 730 },
//     { input: emailText, top: 260, left: 0 },
//     { input: lessonText, top: 300, left: 0 },
//     { input: dateText, top: 340, left: 0 }
//   ])
//   .png()
//   .toBuffer();


	// Als base64 zurückgeben
	const base64 = badge.toString('base64');
	const dataUrl = `data:image/png;base64,${base64}`;

	return new Response(JSON.stringify({ image: dataUrl }), {
		headers: { 'Content-Type': 'application/json' }
	});

  }


}