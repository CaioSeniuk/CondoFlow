import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  condominiumId: bigint;
  isSuperuser?: boolean;
  id: bigint;
  username: string;
  role: UserRole;
  block: string;
  apartment: string;
}
