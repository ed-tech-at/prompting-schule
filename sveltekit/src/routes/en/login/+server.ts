import { json } from '@sveltejs/kit';
import { login } from '$lib/server/pw.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { formData, action } = (await request.json()) as {
      formData?: { email?: string; password?: string };
      action?: string;
    };

    if (action !== 'login' || !formData?.email || !formData.password) {
      return json({ success: false, error: 'Invalid login request.' }, { status: 400 });
    }

    return login(formData.email, formData.password);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed.';
    return json({ success: false, error: message }, { status: 500 });
  }
};
