// import { PrismaClient } from '@prisma/client';
import { json } from '@sveltejs/kit';
import { hashPasswordV2, login } from '$lib/server/pw.js';

// const prisma = new PrismaClient();
import { prisma } from '$lib/server/db';
import { isPasswordResetExpired } from '$lib/server/passwordReset';


export async function POST({ request }) {
    try {
        const { formData, action } = await request.json();

        // console.log('action', action);

        if (action == 'passwortReset') {
        // Validate input
        if (!formData.token || !formData.password || !formData.userId ) {
            return json({ success: false, error: 'Token und neues Passwort sind erforderlich.' }, { status: 400 });
        }

        // Find the password reset entry
        const resetEntry = await prisma.userPasswordReset.findUnique({
            where: { token: formData.token, userId: formData.userId },
            include: { user: true }
        });

        if (
            !resetEntry ||
            resetEntry.finishedAt ||
            isPasswordResetExpired(resetEntry) ||
            resetEntry.user.isDeleted ||
            resetEntry.user.blockedAt ||
            ![1, 2].includes(resetEntry.user.cryptVersion)
        ) {
            return json({ success: false, error: 'Ungültiger oder abgelaufener Token.' }, { status: 400 });
        }

        // Hash the new password
        const hashedPassword = await hashPasswordV2(formData.password, resetEntry.userId);

        // console.log('hashedPassword', hashedPassword);

        // Update the user's password and mark the token as used
        await prisma.$transaction(async (transaction) => {
            const claimedReset = await transaction.userPasswordReset.updateMany({
                where: {
                    token: resetEntry.token,
                    userId: resetEntry.userId,
                    finishedAt: null,
                    OR: [
                        { expiresAt: { gt: new Date() } },
                        {
                            expiresAt: null,
                            createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) }
                        }
                    ]
                },
                data: { finishedAt: new Date() }
            });

            if (claimedReset.count !== 1) {
                throw new Error('RESET_TOKEN_INVALID');
            }

            await transaction.user.update({
                where: { id: resetEntry.userId },
                data: { password: hashedPassword, cryptVersion: 2 }
            });
        });

        return login(resetEntry.user.email, formData.password);
        
        return json({ success: true, message: 'Passwort erfolgreich zurückgesetzt.' });
      }
    } catch (error) {
        if (error instanceof Error && error.message === 'RESET_TOKEN_INVALID') {
            return json({ success: false, error: 'Ungültiger oder abgelaufener Token.' }, { status: 400 });
        }
        console.error('Error resetting password:', error);
        return json({ success: false, error: 'Ein Fehler ist aufgetreten.' }, { status: 500 });
    }
    
}
