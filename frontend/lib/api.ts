import type {
  AdminCondominium, AuthenticatedUser, CondominiumInfo, PaginatedResult, ProvisionCondominiumInput, PublicRegisterUserInput, RegisterUserInput, TokenPairResponse, UserInput,
} from './types';
import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.message === 'string') return body.message;
    if (Array.isArray(body?.message)) return body.message.join(', ');
  } catch {
    // resposta sem corpo JSON
  }
  return 'Não foi possível completar a operação. Tente novamente.';
}

export async function login(username: string, password: string): Promise<TokenPairResponse> {
  const res = await fetch(`${API_URL}/api/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new ApiError(401, 'Usuário ou senha inválidos.');
    }
    throw new ApiError(res.status, await parseErrorMessage(res));
  }

  return res.json();
}

export async function registerUser(input: PublicRegisterUserInput): Promise<AuthenticatedUser> {
  const res = await fetch(`${API_URL}/api/v1/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ApiError(res.status, await parseErrorMessage(res));
  return res.json();
}

/** POST /api/v1/token/refresh */
export async function refreshTokenPair(refresh: string): Promise<TokenPairResponse> {
  const res = await fetch(`${API_URL}/api/v1/token/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) {
    throw new ApiError(res.status, await parseErrorMessage(res));
  }

  return res.json();
}

/** GET /api/v1/users/me — usado logo após o login para saber o perfil (role) real. */
export async function fetchCurrentUser(accessToken: string): Promise<AuthenticatedUser> {
  const res = await fetch(`${API_URL}/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new ApiError(res.status, await parseErrorMessage(res));
  }

  return res.json();
}

let renewal: Promise<string> | null = null;

async function renewAccess(): Promise<string> {
  if (renewal) return renewal;
  const refresh = getRefreshToken();
  if (!refresh) {
    clearTokens();
    throw new ApiError(401, 'Sua sessão expirou. Entre novamente.');
  }
  renewal = (async () => {
    try {
      const tokens = await refreshTokenPair(refresh);
      if (getRefreshToken() !== refresh) {
        throw new ApiError(401, 'A sessão foi alterada. Entre novamente.');
      }
      saveTokens(tokens);
      return tokens.access;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && getRefreshToken() === refresh) {
        clearTokens();
      }
      throw error;
    } finally {
      renewal = null;
    }
  })();
  return renewal;
}

export async function authenticatedRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let access = getAccessToken();
  if (!access) {
    clearTokens();
    throw new ApiError(401, 'Entre para continuar.');
  }
  const send = (token: string) => {
    const headers = new Headers(init.headers);
    if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    headers.set('Authorization', `Bearer ${token}`);
    return fetch(`${API_URL}/api/v1${path}`, { cache: 'no-store', ...init, headers });
  };
  let res = await send(access);
  if (res.status === 401) {
    const latest = getAccessToken();
    if (!latest) throw new ApiError(401, 'Entre para continuar.');
    access = latest !== access ? latest : await renewAccess();
    res = await send(access);
  }
  if (getAccessToken() !== access) throw new ApiError(401, 'A sessão foi alterada. Entre novamente.');
  if (!res.ok) {
    if (res.status === 401) {
      if (getAccessToken() === access) clearTokens();
      throw new ApiError(401, 'Sua sessão expirou. Entre novamente.');
    }
    if (res.status === 403) throw new ApiError(403, 'Você não tem permissão para esta ação.');
    throw new ApiError(res.status, await parseErrorMessage(res));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Não foi possível conectar ao servidor. Tente novamente.';
}

export const usersApi = {
  me: () => authenticatedRequest<AuthenticatedUser>('/users/me'),
  list: (page: number) => authenticatedRequest<PaginatedResult<AuthenticatedUser>>(`/users?page=${page}`),
  get: (id: string) => authenticatedRequest<AuthenticatedUser>(`/users/${encodeURIComponent(id)}`),
  create: (input: RegisterUserInput) => authenticatedRequest<AuthenticatedUser>('/users/managed', {
    method: 'POST', body: JSON.stringify(input),
  }),
  update: (id: string, input: UserInput) => authenticatedRequest<AuthenticatedUser>(`/users/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: JSON.stringify(input),
  }),
  remove: (id: string) => authenticatedRequest<unknown>(`/users/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export const condominiumApi = {
  me: () => authenticatedRequest<CondominiumInfo>('/condominiums/me'),
  replaceCode: () => authenticatedRequest<CondominiumInfo & { code: string }>('/condominiums/me/registration-code', { method: 'POST' }),
  revokeCode: () => authenticatedRequest<CondominiumInfo>('/condominiums/me/registration-code', { method: 'DELETE' }),
};

export const adminApi = {
  remove: (id: string) => authenticatedRequest<{ message: string }>(`/admin/condominiums/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  list: (page: number) => authenticatedRequest<PaginatedResult<AdminCondominium>>(`/admin/condominiums?page=${page}`),
  provision: (input: ProvisionCondominiumInput) => authenticatedRequest<{ id: string; name: string; code: string }>('/admin/condominiums', {
    method: 'POST', body: JSON.stringify(input),
  }),
  replaceCode: (id: string) => authenticatedRequest<CondominiumInfo & { code: string }>(`/admin/condominiums/${encodeURIComponent(id)}/registration-code`, { method: 'POST' }),
  revokeCode: (id: string) => authenticatedRequest<CondominiumInfo>(`/admin/condominiums/${encodeURIComponent(id)}/registration-code`, { method: 'DELETE' }),
};
