import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AccessButton } from './components/AccessButton.js';
import { ProtectedFeature } from './components/ProtectedFeature.js';
import { AccessControlProvider, useAccessControl } from './context/AccessControlProvider.js';
import { useFeatureFlag } from './hooks/useFeatureFlag.js';
import { createTestServer } from './test/mswServer.js';

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

function FlagProbe({ flag }: { flag: string }) {
  const granted = useFeatureFlag(flag);
  return <div data-testid="flag">{granted ? 'yes' : 'no'}</div>;
}

function AdminProbe() {
  const { permissions } = useAccessControl();
  return <div data-testid="admin">{permissions?.isAdmin ? 'yes' : 'no'}</div>;
}

function ErrorProbe() {
  const { error, permissions } = useAccessControl();
  return (
    <div>
      <div data-testid="perms">{permissions ? 'loaded' : 'null'}</div>
      <div data-testid="error">{error ? error.message : 'none'}</div>
    </div>
  );
}

describe('AccessControlProvider', () => {
  it('loads Sam permissions and ProtectedFeature falls back', async () => {
    render(
      <AccessControlProvider
        config={{
          apiBaseUrl: 'http://localhost',
          userId: 'sam-none',
          accessClientId: 'storefront',
          pollIntervalMs: 0,
        }}
      >
        <ProtectedFeature flag="PRODUCT_RECOMMENDATIONS" fallback={<div>locked</div>}>
          <div>unlocked</div>
        </ProtectedFeature>
        <FlagProbe flag="DARK_MODE" />
      </AccessControlProvider>,
    );

    expect(screen.getByText('locked')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('flag')).toHaveTextContent('yes');
    });
    expect(screen.getByText('locked')).toBeInTheDocument();
    expect(screen.queryByText('unlocked')).not.toBeInTheDocument();
  });

  it('hides AccessButton for non-admins and shows it for Alex', async () => {
    const { rerender } = render(
      <AccessControlProvider
        config={{
          apiBaseUrl: 'http://localhost',
          userId: 'sam-none',
          accessClientId: 'storefront',
          pollIntervalMs: 0,
        }}
      >
        <AccessButton label="Admin" />
        <AdminProbe />
      </AccessControlProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin')).toHaveTextContent('no');
    });
    expect(screen.queryByRole('button', { name: 'Admin' })).not.toBeInTheDocument();

    rerender(
      <AccessControlProvider
        config={{
          apiBaseUrl: 'http://localhost',
          userId: 'alex-admin',
          accessClientId: 'storefront',
          pollIntervalMs: 0,
        }}
      >
        <AccessButton label="Admin" />
        <AdminProbe />
      </AccessControlProvider>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Admin' })).toBeInTheDocument();
    });
  });

  it('fails closed on 500', async () => {
    const onError = vi.fn();
    server.use(
      http.get('http://localhost/api/v1/permissions', () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL', message: 'boom', details: [] } },
          { status: 500 },
        ),
      ),
    );

    render(
      <AccessControlProvider
        config={{
          apiBaseUrl: 'http://localhost',
          userId: 'sam-none',
          accessClientId: 'storefront',
          pollIntervalMs: 0,
          onError,
        }}
      >
        <ErrorProbe />
        <FlagProbe flag="DARK_MODE" />
      </AccessControlProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('perms')).toHaveTextContent('null');
      expect(screen.getByTestId('flag')).toHaveTextContent('no');
    });
    expect(onError).toHaveBeenCalled();
  });

  it('fails closed on network error', async () => {
    server.use(
      http.get('http://localhost/api/v1/permissions', () => HttpResponse.error()),
    );

    render(
      <AccessControlProvider
        config={{
          apiBaseUrl: 'http://localhost',
          userId: 'sam-none',
          accessClientId: 'storefront',
          pollIntervalMs: 0,
        }}
      >
        <ErrorProbe />
        <FlagProbe flag="DARK_MODE" />
      </AccessControlProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('perms')).toHaveTextContent('null');
      expect(screen.getByTestId('flag')).toHaveTextContent('no');
    });
  });

  it('refreshes on focus and visibility change', async () => {
    let calls = 0;
    server.use(
      http.get('http://localhost/api/v1/permissions', () => {
        calls += 1;
        return HttpResponse.json({
          email: 'sam@example.com',
          role: 'none',
          isAdmin: false,
          isAdminManagedByIdp: true,
          flags: ['DARK_MODE'],
          evaluations: {},
          evaluatedAt: new Date().toISOString(),
        });
      }),
    );

    render(
      <AccessControlProvider
        config={{
          apiBaseUrl: 'http://localhost',
          userId: 'sam-none',
          accessClientId: 'storefront',
          pollIntervalMs: 0,
        }}
      >
        <FlagProbe flag="DARK_MODE" />
      </AccessControlProvider>,
    );

    await waitFor(() => expect(calls).toBeGreaterThanOrEqual(1));
    const afterMount = calls;

    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(calls).toBeGreaterThan(afterMount));

    const afterFocus = calls;
    act(() => {
      Object.defineProperty(document, 'visibilityState', {
        configurable: true,
        get: () => 'visible',
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitFor(() => expect(calls).toBeGreaterThan(afterFocus));
  });

  it('ignores stale responses when identity changes', async () => {
    let resolveSam: ((value: Response) => void) | undefined;
    const samGate = new Promise<Response>((resolve) => {
      resolveSam = resolve;
    });

    server.use(
      http.get('http://localhost/api/v1/permissions', async ({ request }) => {
        const user = request.headers.get('X-Demo-User');
        if (user === 'sam-none') {
          await samGate;
          return HttpResponse.json({
            email: 'sam@example.com',
            role: 'none',
            isAdmin: false,
            isAdminManagedByIdp: true,
            flags: ['DARK_MODE'],
            evaluations: {},
            evaluatedAt: '2026-01-01T00:00:00.000Z',
          });
        }
        return HttpResponse.json({
          email: 'alex@example.com',
          role: 'developer',
          isAdmin: true,
          isAdminManagedByIdp: true,
          flags: ['DARK_MODE', 'BETA_SEARCH'],
          evaluations: {},
          evaluatedAt: '2026-01-01T00:00:01.000Z',
        });
      }),
    );

    const { rerender } = render(
      <AccessControlProvider
        config={{
          apiBaseUrl: 'http://localhost',
          userId: 'sam-none',
          accessClientId: 'storefront',
          pollIntervalMs: 0,
        }}
      >
        <AdminProbe />
      </AccessControlProvider>,
    );

    rerender(
      <AccessControlProvider
        config={{
          apiBaseUrl: 'http://localhost',
          userId: 'alex-admin',
          accessClientId: 'storefront',
          pollIntervalMs: 0,
        }}
      >
        <AdminProbe />
      </AccessControlProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('admin')).toHaveTextContent('yes');
    });

    await act(async () => {
      resolveSam?.(new Response());
    });

    await waitFor(() => {
      expect(screen.getByTestId('admin')).toHaveTextContent('yes');
    });
  });
});
