'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { usersApi, errorMessage } from '@/lib/api';
import { canAccessDashboard, clearTokens, dashboardPathForRole, getAccessToken } from '@/lib/auth';
import type { AuthenticatedUser } from '@/lib/types';
import styles from './Workspace.module.css';

const SessionContext = createContext<{
  user: AuthenticatedUser;
  reloadUser: () => Promise<void>;
  logout: () => void;
} | null>(null);

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useSession requires SessionProvider');
  return session;
}

export function SessionProvider({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const reloadUser = useCallback(async () => {
    const me = await usersApi.me();
    if (getAccessToken()) setUser(me);
  }, []);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await reloadUser();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [reloadUser]);

  useEffect(() => {
    const checkSession = () => {
      if (!getAccessToken()) {
        setUser(null);
        router.replace('/login');
      }
    };
    const syncSession = (event: StorageEvent) => {
      if (event.key === null || event.key === 'condoflow_access_token' || event.key === 'condoflow_refresh_token') {
        checkSession();
        if (getAccessToken()) void load();
      }
    };
    checkSession();
    void load();
    window.addEventListener('storage', syncSession);
    window.addEventListener('condoflow-session', checkSession);
    return () => {
      window.removeEventListener('storage', syncSession);
      window.removeEventListener('condoflow-session', checkSession);
    };
  }, [load, router]);

  const destination = user ? dashboardPathForRole(user.role, user.isSuperuser) : null;
  const allowed = !!user && canAccessDashboard(pathname, user.role, user.isSuperuser);
  useEffect(() => {
    if (user && !allowed && destination) router.replace(destination);
  }, [user, allowed, destination, router]);

  const logout = useCallback(() => {
    clearTokens();
    router.replace('/login');
  }, [router]);
  const session = useMemo(() => user ? { user, reloadUser, logout } : null, [user, reloadUser, logout]);

  if (loading) return <main className={styles.state}><output>Carregando sua conta...</output></main>;
  if (error) return (
    <main className={styles.state}>
      <p role="alert">{error}</p>
      <button className={styles.primary} onClick={() => void load()}>Tentar novamente</button>
    </main>
  );
  if (!user || !allowed) return <main className={styles.state}><output>Redirecionando...</output></main>;
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  );
}
