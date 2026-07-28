import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import Page from './+page.svelte';

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
  pathname: '/admin',
  actor: {
    id: 'manager',
    email: 'manager@example.at',
    isAdmin: 6
  },
  users: [
    {
      id: 'local-user',
      email: 'local@example.at',
      isAdmin: 0,
      cryptVersion: 2,
      blockedAt: null,
      createdAt: new Date('2026-07-28T10:00:00.000Z')
    },
    {
      id: 'sso-user',
      email: 'sso@example.at',
      isAdmin: 1,
      cryptVersion: 3,
      blockedAt: null,
      createdAt: new Date('2026-07-28T10:00:00.000Z')
    },
    {
      id: 'peer-manager',
      email: 'peer@example.at',
      isAdmin: 6,
      cryptVersion: 2,
      blockedAt: null,
      createdAt: new Date('2026-07-28T10:00:00.000Z')
    }
  ],
  filters: {
    query: '',
    status: 'all',
    accountType: 'all'
  },
  pagination: {
    page: 1,
    pageCount: 1,
    pageSize: 25,
    total: 3
  }
};

describe('/admin', () => {
  it('shows account information and disables password actions for SSO users', () => {
    render(Page, { data, form: null });

    const localRow = screen.getByText('local@example.at').closest('tr');
    const ssoRow = screen.getByText('sso@example.at').closest('tr');

    expect(localRow).not.toBeNull();
    expect(ssoRow).not.toBeNull();
    expect(within(localRow!).getByRole('button', { name: 'Reset-Link' })).toBeEnabled();
    expect(within(ssoRow!).getByRole('button', { name: 'Reset-Link' })).toBeDisabled();
    expect(within(ssoRow!).getByRole('button', { name: 'Passwort' })).toBeDisabled();
  });

  it('does not offer actions for users on the manager level', () => {
    render(Page, { data, form: null });

    const peerRow = screen.getByText('peer@example.at').closest('tr');
    expect(peerRow).not.toBeNull();
    expect(within(peerRow!).getByText('Nicht verwaltbar')).toBeInTheDocument();
    expect(within(peerRow!).queryByRole('button', { name: 'Rolle' })).not.toBeInTheDocument();
  });

  it('explains the defined role levels and the four-character password limit', async () => {
    render(Page, { data, form: null });
    const localRow = screen.getByText('local@example.at').closest('tr');

    await fireEvent.click(within(localRow!).getByRole('button', { name: 'Rolle' }));

    expect(screen.getByRole('option', { name: '1 – Show Preview Courses' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '2 – Show IDs' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '6 – Manager' })).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Dialog schließen' }));
    await fireEvent.click(within(localRow!).getByRole('button', { name: 'Passwort' }));
    await fireEvent.click(
      screen.getByRole('radio', { name: 'Passwort händisch eingeben' })
    );

    expect(document.querySelector('input[name="password"]')).toHaveAttribute('minlength', '4');
  });
});
