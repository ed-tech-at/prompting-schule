// import { PrismaClient } from '@prisma/client';

import { v4 as uuidv4 } from 'uuid';

import { prisma } from '$lib/server/db';


export async function newUserUUID() : Promise<string> {
  let uuid = "";
  let exists = true;

  while (exists) {
    uuid = uuidv4();
    const existing = await prisma.user.findUnique({ where: { id: uuid } });
    if (!existing) exists = false;
  }
  return uuid;
}


export async function newBadgeHash(userId : string, prefix: number) : Promise<string> {
  let randomNumber = "";
  let exists = true;

  while (exists) {
    randomNumber = String(prefix) + String(Math.floor(Math.random() * 1000000).toString().padStart(6, '0'));
    const existing = await prisma.badge.findFirst({ where: { hash: randomNumber, userId: userId } });
    if (!existing) exists = false;
  }
  return randomNumber;
}


export async function newPwResetToken() : Promise<string> {
  let uuid = "";
  let exists = true;

  while (exists) {
    uuid = uuidv4();
    const existing = await prisma.userPasswordReset.findUnique({ where: { token: uuid } });
    if (!existing) exists = false;
  }
  return uuid;
}

