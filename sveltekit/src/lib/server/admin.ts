import { randomInt } from 'node:crypto';
import { error, type Cookies } from '@sveltejs/kit';
import { prisma } from '$lib/server/db';
import { requireLogin } from '$lib/server/jwt';

export const ADMIN_MANAGER_LEVEL = 6;
export const MIN_MANAGED_PASSWORD_LENGTH = 4;
export const MAX_MANAGED_PASSWORD_LENGTH = 128;

export type AdminActor = {
  id: string;
  email: string;
  isAdmin: number;
};

export const ADMIN_AUDIT_ACTIONS = {
  PASSWORD_RESET_LINK: 'PASSWORD_RESET_LINK',
  PASSWORD_SET_MANUAL: 'PASSWORD_SET_MANUAL',
  PASSWORD_SET_RANDOM: 'PASSWORD_SET_RANDOM',
  ROLE_CHANGED: 'ROLE_CHANGED',
  USER_BLOCKED: 'USER_BLOCKED',
  USER_UNBLOCKED: 'USER_UNBLOCKED',
  USER_DELETED: 'USER_DELETED'
} as const;

export async function requireAdminManager(
  cookies: Cookies,
  minimumLevel = ADMIN_MANAGER_LEVEL
): Promise<AdminActor> {
  const jwtUser = requireLogin(cookies);
  const actor = await prisma.user.findUnique({
    where: { id: jwtUser.id },
    select: {
      id: true,
      email: true,
      isAdmin: true,
      isDeleted: true,
      blockedAt: true
    }
  });

  if (!actor || actor.isDeleted || actor.blockedAt || actor.isAdmin < minimumLevel) {
    throw error(403, 'Für die Benutzerverwaltung ist mindestens Rollenstufe 6 erforderlich.');
  }

  return {
    id: actor.id,
    email: actor.email,
    isAdmin: actor.isAdmin
  };
}

export async function requireManageableTarget(actor: AdminActor, targetUserId: string) {
  const target = await prisma.user.findUnique({
    where: { id: targetUserId }
  });

  if (!target || target.isDeleted) {
    throw error(404, 'Benutzer wurde nicht gefunden.');
  }

  if (target.id === actor.id) {
    throw error(403, 'Das eigene Konto kann hier nicht verwaltet werden.');
  }

  if (target.isAdmin >= actor.isAdmin) {
    throw error(403, 'Benutzer mit gleicher oder höherer Rollenstufe können nicht verwaltet werden.');
  }

  return target;
}

export function validateManagedPassword(password: string): string | null {
  if (password.length < MIN_MANAGED_PASSWORD_LENGTH) {
    return `Das Passwort muss mindestens ${MIN_MANAGED_PASSWORD_LENGTH} Zeichen lang sein.`;
  }

  if (password.length > MAX_MANAGED_PASSWORD_LENGTH) {
    return `Das Passwort darf höchstens ${MAX_MANAGED_PASSWORD_LENGTH} Zeichen lang sein.`;
  }

  return null;
}

function randomCharacter(characters: string): string {
  return characters[randomInt(characters.length)];
}

export function generateManagedPassword(length = 20): string {
  if (length < 4) {
    throw new Error('Das zufällige Passwort muss mindestens vier Zeichen lang sein.');
  }

  const characterGroups = [
    'ABCDEFGHJKLMNPQRSTUVWXYZ',
    'abcdefghijkmnopqrstuvwxyz',
    '23456789',
    '!@#$%&*+-=?'
  ];
  const allCharacters = characterGroups.join('');
  const password = characterGroups.map(randomCharacter);

  while (password.length < length) {
    password.push(randomCharacter(allCharacters));
  }

  for (let index = password.length - 1; index > 0; index -= 1) {
    const otherIndex = randomInt(index + 1);
    [password[index], password[otherIndex]] = [password[otherIndex], password[index]];
  }

  return password.join('');
}

export async function writeAdminAuditLog(input: {
  actorUserId: string;
  targetUserId: string;
  action: string;
  outcome: 'SUCCESS' | 'FAILED';
  metadata?: Record<string, string | number | boolean | null>;
}) {
  await prisma.adminAuditLog.create({
    data: {
      actorUserId: input.actorUserId,
      targetUserId: input.targetUserId,
      action: input.action,
      outcome: input.outcome,
      metadata: input.metadata
    }
  });
}
