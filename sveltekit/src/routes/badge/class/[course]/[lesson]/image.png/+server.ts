// import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// const prisma = new PrismaClient();
import { prisma } from '$lib/server/db';


export async function GET({ params }) {
	const { course, lesson } = params;

	const lessonDb = await prisma.lesson.findFirst({
		where: {
			URL: lesson,
			course: {
				URL: course
			}
		},
		include: {
			course: true
		}
	});

	if (!lessonDb) {
		return new Response('Not found', { status: 404 });
	}

	const background = path.resolve('static/badge/badge_v2_1e.png');

	const svg = `
	<svg width="1000" height="1000" xmlns="http://www.w3.org/2000/svg">
	  <defs>
		<style type="text/css">
		  text {
			fill: #009CB1;
			font-family: 'Arial';
			font-size: 52px;
			text-anchor: middle;
		  }
		  .bold {
			font-weight: bold;
		  }
		</style>
	  </defs>

	  <text x="50%" y="400">Lektion</text>
    <text x="50%" y="470"> <tspan class='bold'>${lessonDb.lessonName}</tspan></text>
	  <text x="50%" y="590">im Kurs </text>
    <text x="50%" y="660"><tspan class='bold'>${lessonDb.course.name}</tspan></text>
	</svg>
	`;

	const svgBuffer = Buffer.from(svg);

	const composedImage = await sharp(background)
		.composite([{ input: svgBuffer, top: 0, left: 0 }])
		.png()
		.toBuffer();

	return new Response(composedImage, {
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
		}
	});
}
