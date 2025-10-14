// import { PrismaClient } from '@prisma/client';
import { error, json } from '@sveltejs/kit';

// const prisma = new PrismaClient();
import { prisma } from '$lib/server/db';


export async function load({ params }) {
    const { email, pwToken } = params;

    try {
        // Check if the password reset token exists and is not yet used
        const resetEntry = await prisma.userPasswordReset.findFirst({
            where: {
                token: pwToken,
                user: {
                    email: email
                },
                finishedAt: null // Ensure it hasn't been used yet
            }
        });

        if (!resetEntry) {
            throw error(404, 'Ungültiger oder abgelaufener Token.');
        }

        // Return the reset entry to the frontend
        return {
            resetEntry
        };
    } catch (err) {
        
        if (err.status == "404") {
            throw error(404, 'Ungültiger oder abgelaufener Token.');
        }

        throw error(500, 'Ein Fehler ist aufgetreten.');
    }
}