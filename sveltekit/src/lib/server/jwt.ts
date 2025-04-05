// /src/lib/server/jwt.ts
import jwt from 'jsonwebtoken';
import { env } from '$env/dynamic/private';
import { redirect, type Cookies } from '@sveltejs/kit';

const JWT_SECRET = env.JWT_SECRET;

export interface JwtUserPayload {
  id: string;
  email: string;
  isAdmin: number;
}

export function createJWT(payload: JwtUserPayload, expiresIn = '7d') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyJWT(token: string): JwtUserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtUserPayload;
  } catch {
    return null;
  }
}


export function requireLogin (cookies: Cookies): JwtUserPayload {
  const token = cookies.get('jwt');

  if (!token) throw redirect(302, '/login');

  const user = verifyJWT(token);

  if (!user) throw redirect(302, '/login');

  return user;
}

export function requireLoginAdmin (cookies: Cookies): JwtUserPayload {
  const token = cookies.get('jwt');

  if (!token) throw redirect(302, '/login');

  const user = verifyJWT(token);

  if (!user) throw redirect(302, '/login');

  if (user.isAdmin < 1) throw redirect(302, '/login');

  return user;
}

export function checkLogin (cookies: Cookies): JwtUserPayload | null {
  const token = cookies.get('jwt');

  if (!token) return null;
  
  const user = verifyJWT(token);
  
  if (!user) return null;
  
  return user;
}