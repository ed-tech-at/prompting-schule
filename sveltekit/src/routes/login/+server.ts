import { json } from '@sveltejs/kit';
import { login } from '$lib/server/pw';

export async function POST({ request }) {
  try {
    const { formData, action } = await request.json();

    if (action !== 'login' || !formData?.email || !formData.password) {
      return json({ success: false, error: 'Ungültige Anfrage.' }, { status: 400 });
    }

    return login(formData.email, formData.password);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'Ein Fehler ist aufgetreten.';
    return json({ success: false, error: message }, { status: 500 });
  }
}
