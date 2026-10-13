import type { TokenPairResponse, UserRole } from './types';
import { moduleFor } from './modules';

const ACCESS_KEY = 'condoflow_access_token';
const REFRESH_KEY = 'condoflow_refresh_token';

export function saveTokens(tokens: TokenPairResponse) {
  localStorage.setItem(ACCESS_KEY, tokens.access);
  localStorage.setItem(REFRESH_KEY, tokens.refresh);
  window.dispatchEvent(new Event('condoflow-session'));
}

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  window.dispatchEvent(new Event('condoflow-session'));
}

/** Rota do dashboard para cada perfil (resident, manager, doorman, provider). */
export function dashboardPathForRole(role: UserRole, isSuperuser = false): string {
  if (isSuperuser) return '/dashboard/admin';
  return `/dashboard/${role}`;
}

export function canAccessDashboard(pathname: string, role: UserRole, isSuperuser = false): boolean {
  const home = dashboardPathForRole(role, isSuperuser);
  const [, dashboard, moduleKey, id, ...rest] = pathname.split('/');
  const module = dashboard === 'dashboard' && !rest.length && (!id || /^\d+$/.test(id))
    ? moduleFor(moduleKey) : undefined;
  return pathname === '/dashboard/profile' ||
    (!isSuperuser && !!module && module.roles.includes(role)) ||
    (pathname === '/dashboard/users' && role === 'manager') ||
    pathname === home || pathname.startsWith(`${home}/`);
}
