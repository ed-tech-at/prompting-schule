import { PrismaClient } from '@prisma/client';

import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();


export async function newUserUUID() {
  let uuid;
  let exists = true;

  while (exists) {
    uuid = uuidv4();
    const existing = await prisma.user.findUnique({ where: { id: uuid } });
    if (!existing) exists = false;
  }
  return uuid;
}