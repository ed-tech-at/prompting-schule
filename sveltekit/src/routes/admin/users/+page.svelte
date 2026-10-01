<script lang="ts">
  import Header from '$lib/Header.svelte';
  import { resolve } from '$app/paths';
  import type { ActionData, PageData } from './$types';

  export let data: PageData;
  export let form: ActionData;

  type ManagedUser = PageData['users'][number];
  type DialogAction = 'reset' | 'password' | 'role' | 'block' | 'delete';

  let dialog: HTMLDialogElement;
  let selectedUser: ManagedUser | null = null;
  let dialogAction: DialogAction | null = null;
  let passwordMode: 'random' | 'manual' = 'random';
  let copied = false;

  const roleOptions = Array.from({ length: data.actor.isAdmin + 1 }, (_, role) => role);
  const roleNames: Record<number, string> = {
    0: 'Student',
    1: 'Show Preview Courses',
    2: 'Show IDs',
    5: 'Editor',
    6: 'Manager',
    7: 'Admin'
  };

  function roleLabel(role: number): string {
    return roleNames[role] ? `${role} – ${roleNames[role]}` : `Stufe ${role}`;
  }

  function canManage(user: ManagedUser): boolean {
    return user.id !== data.actor.id && user.isAdmin < data.actor.isAdmin;
  }

  function isLocalAccount(user: ManagedUser): boolean {
    return [1, 2].includes(user.cryptVersion);
  }

  function openDialog(action: DialogAction, user: ManagedUser) {
    selectedUser = user;
    dialogAction = action;
    passwordMode = 'random';
    copied = false;
    dialog.showModal();
  }

  function closeDialog() {
    dialog.close();
    selectedUser = null;
    dialogAction = null;
  }

  function pageHref(page: number): string {
    const parameters = new URLSearchParams();
    if (data.filters.query) parameters.set('q', data.filters.query);
    if (data.filters.status !== 'all') parameters.set('status', data.filters.status);
    if (data.filters.accountType !== 'all') {
      parameters.set('accountType', data.filters.accountType);
    }
    parameters.set('page', String(page));
    return `${resolve('/admin/users')}?${parameters.toString()}`;
  }

  async function copyGeneratedPassword() {
    if (!form?.generatedPassword) return;
    await navigator.clipboard.writeText(form.generatedPassword);
    copied = true;
  }
</script>

<Header
  navItems={[
    { name: 'Startseite', href: '/' },
    { name: 'Admin', href: '/admin' },
    { name: 'Benutzerverwaltung', href: '/admin/users' }
  ]}
  user={data.actor}
/>

<main>
  <div class="page-heading">
    <div>
      <h1>Benutzerverwaltung</h1>
      <p>Konten suchen, Rollen verwalten und sichere Passwortaktionen durchführen.</p>
    </div>
    <span class="manager-level">Ihre Rollenstufe: {roleLabel(data.actor.isAdmin)}</span>
  </div>

  {#if form?.message}
    <div class:success={form.success} class:error={!form.success} class="message" role="status">
      {form.message}
      {#if form.warning}
        <div class="warning">{form.warning}</div>
      {/if}
    </div>
  {/if}

  {#if form?.generatedPassword}
    <section class="generated-password" aria-labelledby="generated-password-title">
      <h2 id="generated-password-title">Zufälliges Passwort</h2>
      <p>Dieses Passwort wird nur in dieser Antwort angezeigt. Kopieren Sie es jetzt und geben Sie es sicher weiter.</p>
      <div class="password-value">
        <code>{form.generatedPassword}</code>
        <button type="button" class="secondary" on:click={copyGeneratedPassword}>
          {copied ? 'Kopiert' : 'Kopieren'}
        </button>
      </div>
    </section>
  {/if}

  <form method="GET" class="filters" aria-label="Benutzer filtern">
    <label>
      E-Mail suchen
      <input
        type="search"
        name="q"
        value={data.filters.query}
        placeholder="name@beispiel.at"
        maxlength="200"
      />
    </label>
    <label>
      Status
      <select name="status" value={data.filters.status}>
        <option value="all">Alle</option>
        <option value="active">Aktiv</option>
        <option value="blocked">Gesperrt</option>
      </select>
    </label>
    <label>
      Kontotyp
      <select name="accountType" value={data.filters.accountType}>
        <option value="all">Alle</option>
        <option value="local">Lokal</option>
        <option value="sso">SSO</option>
      </select>
    </label>
    <div class="filter-actions">
      <button type="submit">Filtern</button>
      <a class="button-link secondary" href={resolve('/admin/users')}>Zurücksetzen</a>
    </div>
  </form>

  <div class="result-summary">
    {data.pagination.total}
    {data.pagination.total === 1 ? 'Benutzer' : 'Benutzer'} gefunden
  </div>

  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th>E-Mail</th>
          <th>Stufe</th>
          <th>Kontotyp</th>
          <th>Status</th>
          <th>Erstellt</th>
          <th><span class="visually-hidden">Aktionen</span></th>
        </tr>
      </thead>
      <tbody>
        {#each data.users as user}
          <tr>
            <td>
              <strong>{user.email}</strong>
              {#if user.id === data.actor.id}
                <span class="self-label">Sie</span>
              {/if}
            </td>
            <td>{roleLabel(user.isAdmin)}</td>
            <td>
              <span class:sso={!isLocalAccount(user)} class="badge">
                {isLocalAccount(user) ? 'Lokal' : 'SSO'}
              </span>
            </td>
            <td>
              <span class:blocked={Boolean(user.blockedAt)} class="status">
                {user.blockedAt ? 'Gesperrt' : 'Aktiv'}
              </span>
            </td>
            <td>
              {user.createdAt
                ? new Intl.DateTimeFormat('de-AT').format(new Date(user.createdAt))
                : '–'}
            </td>
            <td>
              {#if canManage(user)}
                <div class="actions">
                  <button
                    type="button"
                    class="compact"
                    disabled={!isLocalAccount(user) || Boolean(user.blockedAt)}
                    title={!isLocalAccount(user)
                      ? 'Für SSO-Konten nicht verfügbar'
                      : user.blockedAt
                        ? 'Konto zuerst entsperren'
                        : 'Reset-Link senden'}
                    on:click={() => openDialog('reset', user)}
                  >
                    Reset-Link
                  </button>
                  <button
                    type="button"
                    class="compact"
                    disabled={!isLocalAccount(user)}
                    title={!isLocalAccount(user) ? 'Für SSO-Konten nicht verfügbar' : 'Passwort setzen'}
                    on:click={() => openDialog('password', user)}
                  >
                    Passwort
                  </button>
                  <button type="button" class="compact" on:click={() => openDialog('role', user)}>
                    Rolle
                  </button>
                  <button type="button" class="compact" on:click={() => openDialog('block', user)}>
                    {user.blockedAt ? 'Entsperren' : 'Sperren'}
                  </button>
                  <button type="button" class="compact danger" on:click={() => openDialog('delete', user)}>
                    Löschen
                  </button>
                </div>
              {:else}
                <span class="not-manageable">Nicht verwaltbar</span>
              {/if}
            </td>
          </tr>
        {:else}
          <tr>
            <td colspan="6" class="empty">Keine Benutzer entsprechen den gewählten Filtern.</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if data.pagination.pageCount > 1}
    <nav class="pagination" aria-label="Seitennavigation">
      {#if data.pagination.page > 1}
        <a href={pageHref(data.pagination.page - 1)}>← Zurück</a>
      {:else}
        <span></span>
      {/if}
      <span>Seite {data.pagination.page} von {data.pagination.pageCount}</span>
      {#if data.pagination.page < data.pagination.pageCount}
        <a href={pageHref(data.pagination.page + 1)}>Weiter →</a>
      {:else}
        <span></span>
      {/if}
    </nav>
  {/if}
</main>

<dialog bind:this={dialog} on:close={() => { selectedUser = null; dialogAction = null; }}>
  {#if selectedUser && dialogAction}
    <div class="dialog-heading">
      <div>
        <h2>
          {dialogAction === 'reset'
            ? 'Reset-Link senden'
            : dialogAction === 'password'
              ? 'Passwort setzen'
              : dialogAction === 'role'
                ? 'Rolle ändern'
                : dialogAction === 'block'
                  ? selectedUser.blockedAt
                    ? 'Konto entsperren'
                    : 'Konto sperren'
                  : 'Benutzer löschen'}
        </h2>
        <p>{selectedUser.email}</p>
      </div>
      <button type="button" class="close" aria-label="Dialog schließen" on:click={closeDialog}>×</button>
    </div>

    {#if dialogAction === 'reset'}
      <p>Der Benutzer erhält einen Link, der 60 Minuten gültig ist. Ältere offene Reset-Links werden ungültig.</p>
      <form method="POST" action="?/resetLink" class="dialog-form">
        <input type="hidden" name="targetUserId" value={selectedUser.id} />
        <button type="submit">Reset-Link senden</button>
        <button type="button" class="secondary" on:click={closeDialog}>Abbrechen</button>
      </form>
    {:else if dialogAction === 'password'}
      <form method="POST" action="?/setPassword" class="dialog-form">
        <input type="hidden" name="targetUserId" value={selectedUser.id} />
        <fieldset>
          <legend>Passwort wählen</legend>
          <label class="radio">
            <input type="radio" name="mode" value="random" bind:group={passwordMode} />
            Sicheres, zufälliges Passwort erzeugen
          </label>
          <label class="radio">
            <input type="radio" name="mode" value="manual" bind:group={passwordMode} />
            Passwort händisch eingeben
          </label>
        </fieldset>
        {#if passwordMode === 'manual'}
          <label>
            Neues Passwort
            <input type="password" name="password" minlength="4" maxlength="128" required />
            <small>4 bis 128 Zeichen</small>
          </label>
        {/if}
        <label class="checkbox">
          <input type="checkbox" name="notifyUser" />
          Benutzer per E-Mail über die Änderung informieren
        </label>
        <p class="hint">Die Benachrichtigungsmail enthält niemals das Passwort.</p>
        <button type="submit">Passwort setzen</button>
        <button type="button" class="secondary" on:click={closeDialog}>Abbrechen</button>
      </form>
    {:else if dialogAction === 'role'}
      <form method="POST" action="?/changeRole" class="dialog-form">
        <input type="hidden" name="targetUserId" value={selectedUser.id} />
        <label>
          Neue Rollenstufe
          <select name="role" value={selectedUser.isAdmin}>
            {#each roleOptions as role}
              <option value={role}>{roleLabel(role)}</option>
            {/each}
          </select>
        </label>
        <p class="hint">Sie können Rollen bis einschließlich Ihrer eigenen Stufe vergeben.</p>
        <button type="submit">Rolle ändern</button>
        <button type="button" class="secondary" on:click={closeDialog}>Abbrechen</button>
      </form>
    {:else if dialogAction === 'block'}
      <p>
        {selectedUser.blockedAt
          ? 'Der Benutzer kann sich danach wieder neu anmelden.'
          : 'Neue Anmeldungen werden verhindert. Bereits bestehende Sitzungen bleiben bis zu ihrem Ablauf gültig.'}
      </p>
      <form method="POST" action="?/setBlocked" class="dialog-form">
        <input type="hidden" name="targetUserId" value={selectedUser.id} />
        <input type="hidden" name="blocked" value={selectedUser.blockedAt ? 'false' : 'true'} />
        <button type="submit">{selectedUser.blockedAt ? 'Konto entsperren' : 'Konto sperren'}</button>
        <button type="button" class="secondary" on:click={closeDialog}>Abbrechen</button>
      </form>
    {:else}
      <p class="danger-text">
        Das Konto wird irreversibel anonymisiert. Lernfortschritt, Quizversuche und Badges bleiben erhalten.
      </p>
      <form method="POST" action="?/deleteUser" class="dialog-form">
        <input type="hidden" name="targetUserId" value={selectedUser.id} />
        <label>
          Zur Bestätigung E-Mail-Adresse eingeben
          <input
            type="email"
            name="confirmation"
            autocomplete="off"
            placeholder={selectedUser.email}
            required
          />
        </label>
        <button type="submit" class="danger">Konto anonymisieren und löschen</button>
        <button type="button" class="secondary" on:click={closeDialog}>Abbrechen</button>
      </form>
    {/if}
  {/if}
</dialog>

<style>
  .page-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .manager-level,
  .badge,
  .status,
  .self-label {
    display: inline-block;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    font-size: 0.85rem;
    white-space: nowrap;
  }

  .manager-level {
    background: var(--color-primary-darkest);
    color: white;
  }

  .filters {
    display: grid;
    grid-template-columns: minmax(15rem, 2fr) minmax(9rem, 1fr) minmax(9rem, 1fr) auto;
    align-items: end;
    gap: 1rem;
    padding: 1rem;
    margin-bottom: 1rem;
    background: white;
    border: 1px solid var(--color-primary-lightest);
    border-radius: 0.75rem;
  }

  label {
    display: grid;
    gap: 0.35rem;
    font-weight: 600;
  }

  input,
  select,
  button,
  .button-link {
    min-height: 2.7rem;
    padding: 0.55rem 0.75rem;
    border: 1px solid var(--color-primary-dark);
    border-radius: 0.4rem;
    font: inherit;
  }

  input,
  select {
    width: 100%;
    background: white;
  }

  button,
  .button-link {
    background: var(--color-primary-dark);
    color: white;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
  }

  button:hover,
  .button-link:hover {
    background: var(--color-primary-darkest);
    color: white;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.45;
  }

  button.secondary,
  .button-link.secondary {
    background: white;
    color: var(--color-primary-darkest);
  }

  button.danger {
    border-color: var(--color-red-dark);
    background: var(--color-red-dark);
  }

  .filter-actions {
    display: flex;
    gap: 0.5rem;
  }

  .result-summary {
    margin: 0.75rem 0;
    color: #39484a;
  }

  .table-wrapper {
    overflow-x: auto;
    background: white;
    border: 1px solid #c5d7d9;
    border-radius: 0.75rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  th,
  td {
    padding: 0.8rem;
    border-bottom: 1px solid #dce7e8;
    text-align: left;
    vertical-align: middle;
  }

  th {
    background: #eff8f9;
    color: var(--color-primary-darkest);
  }

  tr:last-child td {
    border-bottom: 0;
  }

  .badge {
    background: #e4f3f5;
    color: var(--color-primary-darkest);
  }

  .badge.sso {
    background: #f3eafd;
    color: #5f2b88;
  }

  .status {
    background: var(--color-green-lightest);
    color: var(--color-green-darkest);
  }

  .status.blocked {
    background: var(--color-red-lightest);
    color: var(--color-red-darkest);
  }

  .self-label {
    margin-left: 0.35rem;
    background: var(--color-secondary-lightest);
    color: #684600;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.35rem;
    min-width: 23rem;
  }

  button.compact {
    min-height: 2rem;
    padding: 0.3rem 0.55rem;
    font-size: 0.85rem;
  }

  .not-manageable {
    display: block;
    color: #5b6667;
    text-align: right;
    white-space: nowrap;
  }

  .empty {
    padding: 2rem;
    text-align: center;
  }

  .pagination {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    margin: 1.5rem 0;
  }

  .pagination a:last-child {
    justify-self: end;
  }

  .message,
  .generated-password {
    padding: 1rem;
    margin: 1rem 0;
    border-left: 5px solid var(--color-red-dark);
    background: #fff;
  }

  .message.success,
  .generated-password {
    border-left-color: var(--color-green-dark);
  }

  .warning {
    margin-top: 0.5rem;
    color: #704800;
  }

  .generated-password h2 {
    margin-bottom: 0.25rem;
  }

  .password-value {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  code {
    padding: 0.8rem;
    overflow-wrap: anywhere;
    background: #edf4f5;
    border-radius: 0.3rem;
    font-size: 1.05rem;
  }

  dialog {
    width: min(36rem, calc(100vw - 2rem));
    padding: 1.5rem;
    border: 0;
    border-radius: 0.75rem;
    box-shadow: 0 1rem 3rem #0005;
  }

  dialog::backdrop {
    background: #002f34b8;
  }

  .dialog-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .dialog-heading h2 {
    margin-bottom: 0.25rem;
  }

  button.close {
    width: 2.5rem;
    min-height: 2.5rem;
    padding: 0;
    border: 0;
    background: transparent;
    color: #333;
    font-size: 2rem;
    line-height: 1;
  }

  .dialog-form {
    display: grid;
    gap: 0.9rem;
    margin-top: 1rem;
  }

  fieldset {
    display: grid;
    gap: 0.5rem;
    border: 1px solid #b7cacc;
    border-radius: 0.4rem;
  }

  .radio,
  .checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 400;
  }

  .radio input,
  .checkbox input {
    width: auto;
    min-height: auto;
  }

  .hint,
  small {
    color: #4c5e60;
    font-weight: 400;
  }

  .danger-text {
    padding: 0.75rem;
    border-left: 4px solid var(--color-red-dark);
    background: var(--color-red-lightest);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (max-width: 850px) {
    .filters {
      grid-template-columns: 1fr 1fr;
    }

    .page-heading {
      flex-direction: column;
    }
  }

  @media (max-width: 560px) {
    .filters {
      grid-template-columns: 1fr;
    }

    .filter-actions,
    .password-value {
      align-items: stretch;
      flex-direction: column;
    }
  }
</style>
