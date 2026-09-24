import type { AuthenticatedUser, TokenPairResponse } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

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

/**
 * POST /api/v1/token
 * O backend (TokenObtainDto) espera `username`, não `email`. O campo da tela
 * é rotulado "E-mail" para seguir o layout combinado, mas o valor digitado é
 * enviado como `username` — confirme com o time se o login deve aceitar
 * e-mail ou se o usuário deve digitar o username mesmo.
 */
export async function login(username: string, password: string): Promise<TokenPairResponse> {
  const res = await fetch(`${API_URL}/api/v1/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new ApiError(401, 'E-mail/usuário ou senha inválidos.');
    }
    throw new ApiError(res.status, await parseErrorMessage(res));
  }

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
