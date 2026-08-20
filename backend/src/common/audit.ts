import { AuthenticatedUser } from '../auth/authenticated-user.interface';

export function auditOnCreate(user: AuthenticatedUser) {
  return { createdById: user.id, updatedById: user.id };
}

export function auditOnUpdate(user: AuthenticatedUser) {
  return { updatedById: user.id };
}
