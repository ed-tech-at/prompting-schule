import { error, fail, isHttpError, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Prisma } from '@prisma/client';
import { prisma } from '$lib/server/db';
import {
  ADMIN_AUDIT_ACTIONS,
  generateManagedPassword,
  requireAdminManager,
  requireManageableTarget,
  validateManagedPassword,
  writeAdminAuditLog
} from '$lib/server/admin';
import { hashPasswordV2 } from '$lib/server/pw';
import {
  sendManagerPasswordChangedNotice,
  sendPasswordResetLink
} from '$lib/server/passwordReset';

const PAGE_SIZE = 25;

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function errorMessage(caught: unknown): string {
  if (isHttpError(caught)) {
    return caught.body.message;
  }

  if (caught instanceof Error && caught.message) {
    return caught.message;
  }

  return 'Die Aktion konnte nicht ausgeführt werden.';
}

async function auditFailure(
  actorUserId: string,
  targetUserId: string,
  action: string,
  caught: unknown
) {
  try {
    await writeAdminAuditLog({
      actorUserId,
      targetUserId,
      action,
      outcome: 'FAILED',
      metadata: {
        reason: isHttpError(caught) ? `HTTP_${caught.status}` : 'ACTION_FAILED'
      }
    });
  } catch (auditError) {
    console.error('Failed to write admin audit log:', auditError);
  }
}

export const load: PageServerLoad = async ({ cookies, url }) => {
  const actor = await requireAdminManager(cookies);
  const query = (url.searchParams.get('q') ?? '').trim().slice(0, 200);
  const requestedStatus = url.searchParams.get('status') ?? 'all';
  const requestedAccountType = url.searchParams.get('accountType') ?? 'all';
  const status = ['all', 'active', 'blocked'].includes(requestedStatus)
    ? requestedStatus
    : 'all';
  const accountType = ['all', 'local', 'sso'].includes(requestedAccountType)
    ? requestedAccountType
    : 'all';
  const requestedPage = Number.parseInt(url.searchParams.get('page') ?? '1', 10);

  const where: Prisma.UserWhereInput = {
    isDeleted: 0,
    ...(query
      ? {
          email: {
            contains: query,
            mode: 'insensitive'
          }
        }
      : {}),
    ...(status === 'active'
      ? { blockedAt: null }
      : status === 'blocked'
        ? { blockedAt: { not: null } }
        : {}),
    ...(accountType === 'local'
      ? { cryptVersion: { in: [1, 2] } }
      : accountType === 'sso'
        ? { cryptVersion: { in: [3, 4] } }
        : {})
  };

  const total = await prisma.user.count({ where });
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Number.isFinite(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), pageCount)
    : 1;

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      email: true,
      isAdmin: true,
      cryptVersion: true,
      blockedAt: true,
      createdAt: true
    },
    orderBy: [{ email: 'asc' }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE
  });

  return {
    actor,
    users,
    filters: {
      query,
      status,
      accountType
    },
    pagination: {
      page,
      pageCount,
      pageSize: PAGE_SIZE,
      total
    }
  };
};

export const actions: Actions = {
  resetLink: async ({ cookies, request }) => {
    const actor = await requireAdminManager(cookies);
    const formData = await request.formData();
    const targetUserId = readString(formData, 'targetUserId');

    try {
      const target = await requireManageableTarget(actor, targetUserId);

      if (![1, 2].includes(target.cryptVersion)) {
        throw error(400, 'Für SSO-Konten kann kein Passwort-Reset-Link versendet werden.');
      }

      if (target.blockedAt) {
        throw error(400, 'Entsperren Sie das Konto, bevor Sie einen Reset-Link versenden.');
      }

      await sendPasswordResetLink(target);
      await writeAdminAuditLog({
        actorUserId: actor.id,
        targetUserId,
        action: ADMIN_AUDIT_ACTIONS.PASSWORD_RESET_LINK,
        outcome: 'SUCCESS'
      });

      return {
        success: true,
        action: 'resetLink',
        targetUserId,
        message: `Der Reset-Link wurde an ${target.email} gesendet.`
      };
    } catch (caught) {
      await auditFailure(
        actor.id,
        targetUserId,
        ADMIN_AUDIT_ACTIONS.PASSWORD_RESET_LINK,
        caught
      );
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'resetLink',
        targetUserId,
        message: errorMessage(caught)
      });
    }
  },

  setPassword: async ({ cookies, request }) => {
    const actor = await requireAdminManager(cookies);
    const formData = await request.formData();
    const targetUserId = readString(formData, 'targetUserId');
    const mode = readString(formData, 'mode');
    const notifyUser = formData.get('notifyUser') === 'on';
    let password = '';

    try {
      const target = await requireManageableTarget(actor, targetUserId);

      if (![1, 2].includes(target.cryptVersion)) {
        throw error(400, 'Für SSO-Konten kann kein lokales Passwort gesetzt werden.');
      }

      if (mode === 'random') {
        password = generateManagedPassword();
      } else if (mode === 'manual') {
        password = readString(formData, 'password');
      } else {
        throw error(400, 'Wählen Sie ein zufälliges oder manuelles Passwort.');
      }

      const passwordError = validateManagedPassword(password);
      if (passwordError) {
        throw error(400, passwordError);
      }

      const hashedPassword = await hashPasswordV2(password, target.id);
      const now = new Date();

      await prisma.$transaction([
        prisma.user.update({
          where: { id: target.id },
          data: {
            password: hashedPassword,
            cryptVersion: 2
          }
        }),
        prisma.userPasswordReset.updateMany({
          where: {
            userId: target.id,
            finishedAt: null
          },
          data: {
            finishedAt: now
          }
        }),
        prisma.adminAuditLog.create({
          data: {
            actorUserId: actor.id,
            targetUserId,
            action:
              mode === 'random'
                ? ADMIN_AUDIT_ACTIONS.PASSWORD_SET_RANDOM
                : ADMIN_AUDIT_ACTIONS.PASSWORD_SET_MANUAL,
            outcome: 'SUCCESS',
            metadata: {
              notificationRequested: notifyUser
            }
          }
        })
      ]);

      let warning: string | undefined;
      if (notifyUser) {
        try {
          await sendManagerPasswordChangedNotice(target.email);
        } catch (mailError) {
          console.error('Password changed notification failed:', mailError);
          warning = 'Das Passwort wurde gesetzt, die Benachrichtigungsmail konnte aber nicht gesendet werden.';
        }
      }

      return {
        success: true,
        action: 'setPassword',
        targetUserId,
        message: 'Das Passwort wurde erfolgreich gesetzt.',
        warning,
        generatedPassword: mode === 'random' ? password : undefined
      };
    } catch (caught) {
      password = '';
      await auditFailure(
        actor.id,
        targetUserId,
        mode === 'random'
          ? ADMIN_AUDIT_ACTIONS.PASSWORD_SET_RANDOM
          : ADMIN_AUDIT_ACTIONS.PASSWORD_SET_MANUAL,
        caught
      );
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'setPassword',
        targetUserId,
        message: errorMessage(caught)
      });
    }
  },

  changeRole: async ({ cookies, request }) => {
    const actor = await requireAdminManager(cookies);
    const formData = await request.formData();
    const targetUserId = readString(formData, 'targetUserId');
    const requestedRole = Number(readString(formData, 'role'));

    try {
      const target = await requireManageableTarget(actor, targetUserId);

      if (
        !Number.isInteger(requestedRole) ||
        requestedRole < 0 ||
        requestedRole > actor.isAdmin
      ) {
        throw error(400, `Die Rollenstufe muss zwischen 0 und ${actor.isAdmin} liegen.`);
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: target.id },
          data: { isAdmin: requestedRole }
        }),
        prisma.adminAuditLog.create({
          data: {
            actorUserId: actor.id,
            targetUserId,
            action: ADMIN_AUDIT_ACTIONS.ROLE_CHANGED,
            outcome: 'SUCCESS',
            metadata: {
              previousRole: target.isAdmin,
              newRole: requestedRole
            }
          }
        })
      ]);

      return {
        success: true,
        action: 'changeRole',
        targetUserId,
        message: `Die Rollenstufe wurde auf ${requestedRole} geändert.`
      };
    } catch (caught) {
      await auditFailure(actor.id, targetUserId, ADMIN_AUDIT_ACTIONS.ROLE_CHANGED, caught);
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'changeRole',
        targetUserId,
        message: errorMessage(caught)
      });
    }
  },

  setBlocked: async ({ cookies, request }) => {
    const actor = await requireAdminManager(cookies);
    const formData = await request.formData();
    const targetUserId = readString(formData, 'targetUserId');
    const blocked = readString(formData, 'blocked') === 'true';

    try {
      const target = await requireManageableTarget(actor, targetUserId);
      const action = blocked
        ? ADMIN_AUDIT_ACTIONS.USER_BLOCKED
        : ADMIN_AUDIT_ACTIONS.USER_UNBLOCKED;

      await prisma.$transaction([
        prisma.user.update({
          where: { id: target.id },
          data: { blockedAt: blocked ? new Date() : null }
        }),
        prisma.adminAuditLog.create({
          data: {
            actorUserId: actor.id,
            targetUserId,
            action,
            outcome: 'SUCCESS'
          }
        })
      ]);

      return {
        success: true,
        action: 'setBlocked',
        targetUserId,
        message: blocked ? 'Das Konto wurde gesperrt.' : 'Das Konto wurde entsperrt.'
      };
    } catch (caught) {
      await auditFailure(
        actor.id,
        targetUserId,
        blocked ? ADMIN_AUDIT_ACTIONS.USER_BLOCKED : ADMIN_AUDIT_ACTIONS.USER_UNBLOCKED,
        caught
      );
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'setBlocked',
        targetUserId,
        message: errorMessage(caught)
      });
    }
  },

  deleteUser: async ({ cookies, request }) => {
    const actor = await requireAdminManager(cookies);
    const formData = await request.formData();
    const targetUserId = readString(formData, 'targetUserId');
    const confirmation = readString(formData, 'confirmation');

    try {
      const target = await requireManageableTarget(actor, targetUserId);

      if (confirmation !== target.email) {
        throw error(400, 'Die eingegebene E-Mail-Adresse stimmt nicht überein.');
      }

      const deletedPassword = await hashPasswordV2(generateManagedPassword(32), target.id);
      const now = new Date();

      await prisma.$transaction([
        prisma.user.update({
          where: { id: target.id },
          data: {
            email: `_deleted_${target.id}@deleted.invalid`,
            password: deletedPassword,
            cryptVersion: 2,
            isAdmin: 0,
            isDeleted: 1,
            blockedAt: now
          }
        }),
        prisma.userPasswordReset.updateMany({
          where: {
            userId: target.id,
            finishedAt: null
          },
          data: {
            finishedAt: now
          }
        }),
        prisma.adminAuditLog.create({
          data: {
            actorUserId: actor.id,
            targetUserId,
            action: ADMIN_AUDIT_ACTIONS.USER_DELETED,
            outcome: 'SUCCESS',
            metadata: {
              previousRole: target.isAdmin,
              accountType: [1, 2].includes(target.cryptVersion) ? 'local' : 'sso'
            }
          }
        })
      ]);

      return {
        success: true,
        action: 'deleteUser',
        targetUserId,
        message: 'Das Konto wurde anonymisiert und gelöscht.'
      };
    } catch (caught) {
      await auditFailure(actor.id, targetUserId, ADMIN_AUDIT_ACTIONS.USER_DELETED, caught);
      return fail(isHttpError(caught) ? caught.status : 500, {
        success: false,
        action: 'deleteUser',
        targetUserId,
        message: errorMessage(caught)
      });
    }
  }
};
