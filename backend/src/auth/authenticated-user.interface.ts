import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: bigint;
  username: string;
  role: UserRole;
  block: string;
  apartment: string;
}
