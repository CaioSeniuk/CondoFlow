import type { TokenPairResponse } from './types';

const ACCESS_KEY = 'condoflow_access_token';
const REFRESH_KEY = 'condoflow_refresh_token';

export function saveTokens(tokens: TokenPairResponse) {
  localStorage.setItem(ACCESS_KEY, tokens.access);
  localStorage.setItem(REFRESH_KEY, tokens.refresh);
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
}

/** Rota do dashboard para cada perfil (resident, manager, doorman, provider). */
export function dashboardPathForRole(role: string): string {
  return `/dashboard/${role}`;
}
