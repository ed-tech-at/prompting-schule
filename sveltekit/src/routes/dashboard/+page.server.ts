import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import type { PageServerLoad, Actions } from './$types';


import type { Course } from '@prisma/client';


export const load: PageServerLoad = async ({ params }) => {
  

  const courses = await prisma.course.findMany({
    where: { active: 1  },
    orderBy: { id: 'asc' }
  });

  return {
    courses
  };
};
