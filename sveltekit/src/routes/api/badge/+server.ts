// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();
import { prisma } from '$lib/server/db';


import { env } from '$env/dynamic/private';


import { error, json } from '@sveltejs/kit';

import bakery from 'openbadges-bakery-v3';

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

function escapeXml(input: unknown) {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function POST({ request, cookies }) {

  

  let { formData,  action } = await request.json();

  const user = requireLogin(cookies);

  

  if (action === 'createLessonBadge') {
    // console.log('formData', formData);
    const { lessonId } = formData;
    
    const lesson = await prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) {
      return json({ success: false, error: 'Lesson not found' });
    }
    
    if (lesson?.starsNeeded > 0) {
      

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
      if (bestQuiz.percentReached < 75) {
        //  todo 75
        return json({ success: false, error: 'Not enough points' });
      }
    }

    // console.log('bestQuiz', bestQuiz);

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

    // console.log('aggregate', aggregate);

    if (aggregate._sum.promptsTried === 0) {
      return json({ success: false, error: 'No prompts tried' });
    }

    const hash = await newBadgeHash(user.id, lessonId);

    const badge = await prisma.badge.create({
      data: {
        userId: user.id,
        type: 'lesson',
        lessonId: lesson.id,
        promptsTried: aggregate._sum.promptsTried ?? 0,
        promptTokens: aggregate._sum.promptTokens ?? 0,
        completionTokens: aggregate._sum.completionTokens ?? 0,
        hash: hash,
      }
    });
    
    // console.log('badge', badge);
    return json({ success: true, badge });
  }

  if (action === "getBadgeImg") {
    const badgeDb = await prisma.badge.findFirst({ where: { userId: user.id, hash: formData.hash } });
    
    const badgePath = path.resolve('static/badge/badge_v2_1.png');
    // const boldFontBase64 = fontToBase64('static/badge/Jost-Bold.ttf');
    // const boldFontBase64 = fontToBase64('static/fonts/jost-v18-latin/jost-v18-latin-100italic.woff2');
    // const fontLesson = path.resolve('static/badge/Jost-Regular.ttf');

    const lesson = await prisma.lesson.findUnique({ where: { id: badgeDb?.lessonId } });
    const course = await prisma.course.findUnique({ where: { id: lesson?.courseId } });
    let textSelbstueberpruefung = '';

    if (lesson?.starsNeeded > 0) {
      textSelbstueberpruefung = ' und die Selbstüberprüfung bestanden';
    }
    

const certUrl = env.APP_URL + `/badge/${badgeDb?.hash}/${user.email}`; // falls QR auf externe Assertion zeigt
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
const createdAtStr = badgeDb?.createdAt.toLocaleDateString('de-DE');
const emailEsc = escapeXml(user.email);
const lessonEsc = escapeXml(lesson?.lessonName);
const courseEsc = escapeXml(course?.name);


	const svg = `
	<svg width="1000" height="1000"  xmlns="http://www.w3.org/2000/svg">
	  <defs>
		<style type="text/css">
		  text {
			fill: #009CB1;
			font-family: 'Arial';
			font-size: 38px;
      
      }
		  .email {
			font-family: 'Arial';
			font-size: 48px;
			text-anchor: middle;
      font-weight: bold;
			fill: #009CB1;
		  }
		  .cert {
			font-style: italic;
			
		  }
      .lesson {
			text-anchor: middle;

      }
      .bold {
      font-weight: bold;
      }
      .used {
      fill: white;
      text-align: left;
      font-size: 42px;
      }
      .generated {
      fill: black;
      text-align: left;
      font-size: 42px;

      }
      
		</style>
	  </defs>
	  <text x="165" y="320" class="cert">Zertifikat ${badgeDb?.hash} vom ${escapeXml(createdAtStr)}</text>

	  
	  <text x="50%" y="420" class="email">${emailEsc}</text>
	  
    <text x="50%" y="490" class="lesson">hat die Lektion <tspan class='bold'> ${lessonEsc}</tspan></text>
    <text x="50%" y="550" class="lesson">im Kurs <tspan class='bold'> ${courseEsc}</tspan></text>
	  
	  <text x="50%" y="610" class="lesson"> absolviert${textSelbstueberpruefung}.</text>
	  <text x="100" y="720" class="used">Es wurden ${badgeDb?.promptsTried} Prompts</text>
	  <text x="100" y="775" class="used">mit ${badgeDb?.promptTokens} Tokens abgesendet</text>
	  <text x="100" y="900" class="generated">und ${badgeDb?.completionTokens} Tokens generiert.</text>
    </svg>`;
	  // <text x="50%" y="845" class="lesson">Ausgesellt am </text>
    // ${user.email} 
  // console.log (svg);


	const svgBuffer = Buffer.from(svg);

	// Bild generieren (nicht speichern!)
	const badgeImgBuffer = await sharp(badgePath)
		.composite([
			{ input: qrBuffer, top: 170, left: 800 }, // Position QR
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



const assertion = {
  "@context": "https://w3id.org/openbadges/v2",
  "type": "Assertion",
  "id": env.APP_URL + "/badge/" + badgeDb?.hash + "/" + user.email + "/json.json",
  "recipient": {
    "type": "email",
    "hashed": false,
    "identity": user.email
  },
  "badge": env.APP_URL + "/badge/class/" + course?.URL + "/" + lesson?.URL + "/json.json",
  "issuedOn": badgeDb?.createdAt.toISOString(),
  "verification": {
    "type": "HostedBadge",
    "url": env.APP_URL + "/badge/" + badgeDb?.hash + "/" + user.email + "/json.json"
  },
  "image": env.APP_URL + "/badge/class/" + course?.URL + "/" + lesson?.URL + "/image.png",
  "evidence": env.APP_URL + "/badge/" + badgeDb?.hash + "/" + user.email
  };

  // console.log('Assertion:', assertion);

//   // Als base64 zurückgeben
  // const base64a = badgeImgBuffer.toString('base64');
//   console.log('Baked Image:', base64);

  // const bakedImage = await bakery.bake({ image: base64a, assertion });
  const bakedImage = await bakeBadge(badgeImgBuffer, assertion);

  const base64 = bakedImage.toString('base64');

  // const base64 = base64a;
  // console.log('Badge erfolgreich gebacken!');

	const dataUrl = `data:image/png;base64,${base64}`;

	return new Response(JSON.stringify({ image: dataUrl }), {
		headers: { 'Content-Type': 'application/json' }
	});
  
  }


}

// Funktion, die das Backen des Badges als Promise kapselt
function bakeBadge(imageBuffer, assertion) {
  return new Promise((resolve, reject) => {
    bakery.bake({ image: imageBuffer, assertion }, (err, bakedImage) => {
      if (err) {
        reject(err);
      } else {
        resolve(bakedImage);
      }
    });
  });
}