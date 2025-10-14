// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();
import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/db';


import { redirect } from '@sveltejs/kit';
import { requireLogin, type JwtUserPayload } from '$lib/server/jwt';

import type { Course } from '@prisma/client';


export const load: PageServerLoad = async ({ cookies, params }) => {
  
  const user = requireLogin(cookies);

  // console.log('user', user);

  const courses = await prisma.course.findMany({
    where: { 
      active: { gt: 0 },
      lang: "de"
    },
    orderBy: { position: 'asc' }
  });

  return {
    courses, user
  };
};
