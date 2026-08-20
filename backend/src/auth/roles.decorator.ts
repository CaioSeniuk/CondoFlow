import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Equivalente às classes IsResident/IsManager/IsDoorman/IsProvider/IsManagerOrDoorman do Django. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
