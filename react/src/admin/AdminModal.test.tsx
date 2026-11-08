import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { AccessControlProvider } from '../context/AccessControlProvider.js';
import { AccessButton } from '../components/AccessButton.js';
import { createTestServer } from '../test/mswServer.js';

const { server } = await createTestServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

async function openAdmin() {
  const user = userEvent.setup();
  render(
    <AccessControlProvider
      config={{
        apiBaseUrl: 'http://localhost',
        userId: 'alex-admin',
        accessClientId: 'storefront',
        pollIntervalMs: 0,
      }}
    >
      <AccessButton label="Admin" />
    </AccessControlProvider>,
  );
  await waitFor(() => expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument());
  await user.click(screen.getByRole('button', { name: 'Admin' }));
  await waitFor(() => expect(screen.getByText('Gateflag admin')).toBeInTheDocument());
  return user;
}

describe('AdminModal', () => {
  it('auto-uppercases flag keys and creates a flag', async () => {
    const user = await openAdmin();
    await user.click(screen.getByRole('button', { name: 'Create flag' }));
    const key = screen.getByLabelText('Flag key');
    await user.type(key, 'new_feature_x');
    expect(key).toHaveValue('NEW_FEATURE_X');
    await user.type(screen.getByLabelText('Flag description'), 'Demo flag');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(screen.getByText('NEW_FEATURE_X')).toBeInTheDocument());
  });

  it('requires confirm when switching to RELEASED', async () => {
    const user = await openAdmin();
    await user.click(screen.getByRole('button', { name: 'Create flag' }));
    await user.click(screen.getByRole('button', { name: 'RELEASED' }));
    expect(screen.getByRole('alertdialog', { name: 'Confirm release' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm' }));
    expect(screen.queryByRole('alertdialog', { name: 'Confirm release' })).not.toBeInTheDocument();
  });

  it('shows conflict toast on 409', async () => {
    server.use(
      http.put('http://localhost/api/v1/admin/flags/:key', () =>
        HttpResponse.json(
          { error: { code: 'VERSION_CONFLICT', message: 'conflict', details: [] } },
          { status: 409 },
        ),
      ),
    );
    const user = await openAdmin();
    const editButtons = await screen.findAllByRole('button', { name: 'Edit' });
    await user.click(editButtons[0]!);
    await waitFor(() => expect(screen.getByLabelText('Flag description')).toBeInTheDocument());
    await user.clear(screen.getByLabelText('Flag description'));
    await user.type(screen.getByLabelText('Flag description'), 'changed');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(
        screen.getByText('This flag changed since you opened it. Reload to see the latest version.'),
      ).toBeInTheDocument(),
    );
  });

  it('shows developer toggles and excludes developers from group member pickers', async () => {
    const user = await openAdmin();
    await user.click(screen.getByRole('tab', { name: 'Users' }));
    const danaEdit = await screen.findAllByRole('button', { name: 'Edit' });
    // dana is second seeded user alphabetically after alex in list? list is sorted by email
    const danaRow = screen.getByText('dana@example.com').closest('li');
    expect(danaRow).toBeTruthy();
    await user.click(within(danaRow as HTMLElement).getByRole('button', { name: 'Edit' }));
    await waitFor(() =>
      expect(screen.getByText('Developer auto-granted flags')).toBeInTheDocument(),
    );
    expect(screen.getByLabelText('Toggle BETA_SEARCH')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Groups' }));
    await user.click(screen.getByRole('button', { name: 'Create group' }));
    const picker = await screen.findByTestId('group-member-picker');
    expect(within(picker).queryByText('dana@example.com')).not.toBeInTheDocument();
    expect(within(picker).queryByText('alex@example.com')).not.toBeInTheDocument();
    expect(within(picker).getByText('pat@example.com')).toBeInTheDocument();
    void danaEdit;
  });
});
