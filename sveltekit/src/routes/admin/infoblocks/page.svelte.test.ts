import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import Page from './+page.svelte';

// jsdom does not implement <dialog>.
Object.defineProperties(HTMLDialogElement.prototype, {
  showModal: {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    }
  },
  close: {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.removeAttribute('open');
    }
  }
});

const data = {
  pathname: '/admin/infoblocks',
  actor: {
    id: 'editor',
    email: 'editor@example.at',
    isAdmin: 5
  },
  infoBlocks: [
    {
      id: 1,
      title: 'Wartungsfenster',
      content: '<p>Am Sonntag ist Wartung.</p>',
      variant: 'warning',
      lang: 'both',
      placements: ['startseite'],
      emailPattern: null,
      validFrom: new Date('2026-08-14T20:00:00.000Z'),
      validUntil: new Date('2026-08-15T02:00:00.000Z'),
      active: 1,
      position: 1,
      createdAt: new Date('2026-08-01T10:00:00.000Z'),
      updatedAt: new Date('2026-08-01T10:00:00.000Z')
    },
    {
      id: 2,
      title: 'Hinweis TU Graz',
      content: '<p>Im Intranet gibt es einen angepassten Kurs.</p>',
      variant: 'info',
      lang: 'de',
      placements: ['kursuebersicht'],
      emailPattern: '@tugraz\\.at$',
      validFrom: null,
      validUntil: null,
      active: 0,
      position: 2,
      createdAt: new Date('2026-08-01T10:00:00.000Z'),
      updatedAt: new Date('2026-08-01T10:00:00.000Z')
    }
  ]
};

function rowFor(title: string): HTMLTableRowElement {
  const row = screen.getByText(title).closest('tr');
  if (!row) throw new Error(`Keine Zeile für "${title}" gefunden.`);
  return row as HTMLTableRowElement;
}

describe('/admin/infoblocks/+page.svelte', () => {
  it('lists every info block with its placement, audience and status', () => {
    render(Page, { data, form: null });

    const maintenance = rowFor('Wartungsfenster');
    expect(within(maintenance).getByText('Startseite')).toBeTruthy();
    expect(within(maintenance).getByText('alle')).toBeTruthy();
    expect(within(maintenance).getByText('Aktiv')).toBeTruthy();

    const tugraz = rowFor('Hinweis TU Graz');
    expect(within(tugraz).getByText('Kursübersicht')).toBeTruthy();
    expect(within(tugraz).getByText('@tugraz\\.at$')).toBeTruthy();
    expect(within(tugraz).getByText('Deutsch')).toBeTruthy();
    expect(within(tugraz).getByText('Inaktiv')).toBeTruthy();
  });

  it('shows the time window and "unbegrenzt" when there is none', () => {
    render(Page, { data, form: null });

    expect(within(rowFor('Hinweis TU Graz')).getByText('unbegrenzt')).toBeTruthy();
    expect(within(rowFor('Wartungsfenster')).getByText(/–/)).toBeTruthy();
  });

  it('disables the reorder buttons at the edges', () => {
    render(Page, { data, form: null });

    const first = rowFor('Wartungsfenster');
    expect(within(first).getByRole('button', { name: 'Nach oben' })).toBeDisabled();
    expect(within(first).getByRole('button', { name: 'Nach unten' })).toBeEnabled();

    const last = rowFor('Hinweis TU Graz');
    expect(within(last).getByRole('button', { name: 'Nach oben' })).toBeEnabled();
    expect(within(last).getByRole('button', { name: 'Nach unten' })).toBeDisabled();
  });

  it('offers the inverse activation action per row', () => {
    render(Page, { data, form: null });

    expect(within(rowFor('Wartungsfenster')).getByRole('button', { name: 'Deaktivieren' })).toBeTruthy();
    expect(within(rowFor('Hinweis TU Graz')).getByRole('button', { name: 'Aktivieren' })).toBeTruthy();
  });

  it('opens the delete dialog for the chosen block', async () => {
    render(Page, { data, form: null });

    await fireEvent.click(within(rowFor('Hinweis TU Graz')).getByRole('button', { name: 'Löschen' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Infoblock löschen' })).toBeTruthy();
    expect(within(dialog).getByText('Hinweis TU Graz')).toBeTruthy();
    expect(dialog.querySelector('input[name="infoBlockId"]')).toHaveValue('2');
  });

  it('renders an empty state without blocks', () => {
    render(Page, { data: { ...data, infoBlocks: [] }, form: null });
    expect(screen.getByText('Noch keine Infoblöcke vorhanden.')).toBeTruthy();
  });
});
