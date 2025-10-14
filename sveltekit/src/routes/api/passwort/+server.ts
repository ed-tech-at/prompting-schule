// import { PrismaClient } from '@prisma/client';
import { json } from '@sveltejs/kit';
import { hashPasswordV2, login } from '$lib/server/pw.js';

// const prisma = new PrismaClient();
import { prisma } from '$lib/server/db';


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

        if (!resetEntry || resetEntry.finishedAt) {
            return json({ success: false, error: 'Ungültiger oder abgelaufener Token.' }, { status: 400 });
        }

        // Hash the new password
        const hashedPassword = await hashPasswordV2(formData.password, resetEntry.userId);

        // console.log('hashedPassword', hashedPassword);

        // Update the user's password and mark the token as used
        await prisma.$transaction([
            prisma.user.update({
                where: { id: resetEntry.userId },
                data: { password: hashedPassword, cryptVersion: 2 }
            }),
            prisma.userPasswordReset.update({
                where: { token: formData.token },
                data: { finishedAt: new Date() }
            })
        ]);

        return login(resetEntry.user.email, formData.password);
        
        return json({ success: true, message: 'Passwort erfolgreich zurückgesetzt.' });
      }
    } catch (error) {
        console.error('Error resetting password:', error);
        return json({ success: false, error: 'Ein Fehler ist aufgetreten.' }, { status: 500 });
    }
    
}