import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { PermissionsClient } from '../api/PermissionsClient.js';
import type { AccessControlConfig, AccessControlState, PermissionsResponse } from '../types.js';

const AccessControlContext = createContext<AccessControlState | null>(null);

const DEFAULT_POLL_MS = 30_000;

type LoadOptions = { force?: boolean };

export function AccessControlProvider({
  config,
  children,
}: {
  config: AccessControlConfig;
  children: ReactNode;
}) {
  const [permissions, setPermissions] = useState<PermissionsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sequenceRef = useRef(0);
  const inFlightKeyRef = useRef<string | null>(null);
  const inFlightPromiseRef = useRef<Promise<void> | null>(null);
  const loadRef = useRef<(options?: LoadOptions) => Promise<void>>(async () => undefined);

  useEffect(() => {
    loadRef.current = async (options?: LoadOptions) => {
      if (config.userId === null) {
        sequenceRef.current += 1;
        setPermissions(null);
        setError(null);
        setLoading(false);
        inFlightKeyRef.current = null;
        inFlightPromiseRef.current = null;
        return;
      }

      const requestKey = `${config.apiBaseUrl}|${config.userId}|${config.accessClientId ?? ''}`;
      if (
        !options?.force &&
        inFlightPromiseRef.current &&
        inFlightKeyRef.current === requestKey
      ) {
        return inFlightPromiseRef.current;
      }

      const sequence = ++sequenceRef.current;
      setLoading(true);
      const client = new PermissionsClient(config.apiBaseUrl);

      const run = (async () => {
        try {
          const authHeaders = config.getAuthHeaders
            ? await config.getAuthHeaders()
            : { 'X-Demo-User': config.userId! };
          const result = await client.getPermissions({
            headers: authHeaders,
            accessClientId: config.accessClientId,
          });
          if (sequence !== sequenceRef.current) {
            return;
          }
          setPermissions(result);
          setError(null);
        } catch (cause) {
          if (sequence !== sequenceRef.current) {
            return;
          }
          const err = cause instanceof Error ? cause : new Error(String(cause));
          setPermissions(null);
          setError(err);
          config.onError?.(err);
        } finally {
          if (sequence === sequenceRef.current) {
            setLoading(false);
          }
          if (inFlightKeyRef.current === requestKey) {
            inFlightKeyRef.current = null;
            inFlightPromiseRef.current = null;
          }
        }
      })();

      inFlightKeyRef.current = requestKey;
      inFlightPromiseRef.current = run;
      return run;
    };
  }, [config]);

  useEffect(() => {
    void loadRef.current({ force: true });
  }, [config.userId, config.accessClientId, config.apiBaseUrl]);

  useEffect(() => {
    const onFocus = () => {
      void loadRef.current();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void loadRef.current();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [config.userId, config.accessClientId]);

  useEffect(() => {
    const pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_MS;
    if (pollIntervalMs <= 0 || config.userId === null) {
      return;
    }
    const id = window.setInterval(() => {
      void loadRef.current();
    }, pollIntervalMs);
    return () => window.clearInterval(id);
  }, [config.pollIntervalMs, config.userId, config.accessClientId]);

  const value: AccessControlState = {
    permissions,
    loading,
    error,
    refresh: () => loadRef.current({ force: true }),
    notifyAdminClosed: () => {
      void loadRef.current({ force: true });
    },
    config,
  };

  return (
    <AccessControlContext.Provider value={value}>{children}</AccessControlContext.Provider>
  );
}

export function useAccessControl(): AccessControlState {
  const value = useContext(AccessControlContext);
  if (!value) {
    throw new Error('useAccessControl must be used within AccessControlProvider');
  }
  return value;
}
