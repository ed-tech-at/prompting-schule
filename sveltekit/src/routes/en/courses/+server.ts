import { json } from '@sveltejs/kit';
// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();
import { prisma } from '$lib/server/db';



export async function POST({ request, params }) {
  try {
      // console.log('params', params);
      let { action, userId } = await request.json();
      // console.log('action', action);
      
      
      if (action == "listCourses") {
      
        const listCourses = await prisma.course.findMany({  });

      return json({ success: true, listCourses });
    }
  } catch (error) {
    console.error('Error:', error);
    return json({ success: false, error: 'An error occurred' });
  }
}