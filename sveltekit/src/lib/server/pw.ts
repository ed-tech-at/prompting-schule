import bcrypt from 'bcrypt';
import { env } from '$env/dynamic/private';
// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();
import { prisma } from '$lib/server/db';


import { createJWT } from './jwt';
import { json } from '@sveltejs/kit';
import { newUserUUID } from '$lib/server/dbUtils.js';

import { resolve } from '$app/paths';


export async function hashPassword(password: string) {
  const salt = env.SERVER_PW_SALT;
  // console.log('Salt:', salt);
  return await bcrypt.hash(password + salt, 10);
}

export async function comparePassword(password: string, hashedPassword: string) {
  const salt = env.SERVER_PW_SALT;
  // console.log('Salt:', salt);
  return await bcrypt.compare(password + salt, hashedPassword);
}


export async function hashPasswordV2(password: string, userId: string) {
  const pepper = env.SERVER_PW_PEPPER;
  // console.log('Salt:', salt);
  return await bcrypt.hash(password + pepper + userId, 10);
}

export async function comparePasswordV2(password: string, hashedPassword: string, userId: string) { 
  const pepper = env.SERVER_PW_PEPPER;
  // console.log('Salt:', salt);
  return await bcrypt.compare(password + pepper + userId, hashedPassword);
}

export async function login(email: string, password: string): Promise<Response> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return json({ success: false, error: "Ungültige Anmeldedaten. Bitte versuchen Sie es erneut." });
  }

  if (user.isDeleted) {
    return json({ success: false, error: "Benutzer existiert nicht." });
  }

  if (user.blockedAt) {
    return json({ success: false, error: "Dieses Benutzerkonto ist gesperrt." }, { status: 403 });
  }

  let passwordMatch = false;

  if (user.cryptVersion === 1) {
    passwordMatch = await comparePassword(password, user.password);

    if (passwordMatch) {
      let newHashedPassword = await hashPasswordV2(password, user.id);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: newHashedPassword,
          cryptVersion: 2
        }
      });
    }

  } else if (user.cryptVersion === 2) {
    passwordMatch = await comparePasswordV2(password, user.password, user.id);

    // comparePasswordV2 auch im profil

  } else {
    return json({ success: false, error: "Unbekannte Passwort-Verschlüsselung." });
  }

  if (!passwordMatch) {
    return json({ success: false, error: "Ungültige Anmeldedaten. Bitte versuchen Sie es erneut." });
  }

  return createJWTResponse(user);
}

export async function register(email: string, password: string): Promise<Response> { /* | { success: false; error: string }*/
  const existingUser = await prisma.user.findUnique({ where: { email } });
  
  if (existingUser) {
    const loginResult = await login(email, password);

    if ('success' in loginResult && loginResult.success === false) {
      return json({
        success: false,
        error: "Benutzer existiert bereits, aber das Passwort ist falsch."
      });
    }

    return loginResult;
  }

  const uuid = await newUserUUID();
  const hashedPassword = await hashPasswordV2(password, uuid); // assuming hashPassword handles v2
  const cryptVersion = 2;

  const newUser = await prisma.user.create({
    data: {
      id: uuid,
      email,
      password: hashedPassword,
      cryptVersion
    }
  });

  return createJWTResponse(newUser);
}


// type ssoUser;
type ssoUser = {
  preferred_username: string;
  given_name: string;
  family_name: string;
  email: string;
};


export async function loginSso(user: ssoUser): Promise<Response> {
  
  const existingUser = await prisma.user.findFirst({
    where: {
      cryptVersion: { in: [3, 4] },
      password: user.preferred_username
    }
  });

  if (existingUser) {
    if (existingUser.isDeleted) {
      return json({ success: false, error: "Benutzer existiert nicht." }, { status: 403 });
    }

    if (existingUser.blockedAt) {
      return json({ success: false, error: "Dieses Benutzerkonto ist gesperrt." }, { status: 403 });
    }

    return createJWTResponseSSO(existingUser);
  }

  const uuid = await newUserUUID();
  // const hashedPassword = await hashPasswordV2(password, uuid); // assuming hashPassword handles v2

  const obKey = 'CO-OBFUSCATED-C-BD';
  const hasObfuscated = obKey in user && !!(user as Record<string, any>)[obKey];

  let cryptVersion = hasObfuscated ? 4 : 3; // 4: has BD, else 3

  const newUser = await prisma.user.create({
    data: {
      id: uuid,
      email: user.email,
      password: user.preferred_username,
      cryptVersion
    }
  });

  return createJWTResponseSSO(newUser);
}


export function createJWTResponse(user: { id: string; email: string; isAdmin: number }): Response {
  const token = createJWT({
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin
  });

  const SUBFOLDER = env.SUBFOLDER ?? "";
  const path = "/" + SUBFOLDER;

  // 'Set-Cookie': `jwt=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`,
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Set-Cookie': `jwt=${token}; Path=${path}; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`,
      'Content-Type': 'application/json'
    }
  });
}


export function createJWTResponseSSO(user: { id: string; email: string; isAdmin: number }): Response {
  const token = createJWT({
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin
  });

  const SUBFOLDER = env.SUBFOLDER ?? "";

  const path = "/" + SUBFOLDER;
  const pathProfil = resolve('/profil');

  // 'Set-Cookie': `jwt=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`,
  return new Response(null, {
    status: 302,
    headers: {
      'Set-Cookie': `jwt=${token}; Path=${path}; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`,
      // 'Content-Type': 'application/json',
      Location: pathProfil
    }
  });
}
