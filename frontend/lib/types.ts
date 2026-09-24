/**
 * Espelha o enum `UserRole` do Prisma usado no backend
 * (src/auth/authenticated-user.interface.ts, src/users/dto/user.dto.ts).
 */
export const UserRole = {
  resident: 'resident',
  manager: 'manager',
  doorman: 'doorman',
  provider: 'provider',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface RoleOption {
  value: UserRole;
  label: string;
}

/** Ordem e rótulos em PT-BR usados na tela de login (bate com o mockup). */
export const ROLE_OPTIONS: RoleOption[] = [
  { value: 'resident', label: 'Morador' },
  { value: 'manager', label: 'Síndico' },
  { value: 'doorman', label: 'Porteiro' },
  { value: 'provider', label: 'Prestador' },
];

/** Resposta de POST /api/v1/token e /api/v1/token/refresh (TokenPairResponse). */
export interface TokenPairResponse {
  access: string;
  refresh: string;
}

/** Formato retornado por GET /api/v1/users/me (senha excluída no backend). */
export interface AuthenticatedUser {
  id: number | string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  block: string;
  apartment: string;
  phone: string;
  isActive: boolean;
}
