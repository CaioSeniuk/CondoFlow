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
  isSuperuser?: boolean;
  condominiumId: string;
  condominium?: { id: string; name: string };
  id: string;
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

export interface AdminCondominium {
  id: string;
  name: string;
  registrationCode: string | null;
  codeUpdatedAt: string | null;
}

export interface ProvisionCondominiumInput {
  name: string;
}

export interface PaginatedResult<T> {
  count: number;
  next: number | null;
  previous: number | null;
  results: T[];
}

export interface UserInput {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  block: string;
  apartment: string;
  phone: string;
}

export interface RegisterUserInput extends UserInput {
  password: string;
}

export interface PublicRegisterUserInput extends Omit<RegisterUserInput, 'role'> {
  role: Exclude<UserRole, 'manager'>;
  condominiumCode: string;
}

export interface CondominiumInfo {
  id: string;
  name: string;
  codeEnabled: boolean;
  codeUpdatedAt: string | null;
}
