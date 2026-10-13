import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const managedUserSchema = z.object({
  username: z.string().min(1).max(150),
  password: z.string().min(8),
  firstName: z.string().max(150).default(''),
  lastName: z.string().max(150).default(''),
  email: z.string().email().default(''),
  role: z.nativeEnum(UserRole),
  block: z.string().max(10).default(''),
  apartment: z.string().max(10).default(''),
  phone: z.string().max(20).default(''),
});

export const registerSchema = managedUserSchema.extend({
  role: z.enum(['resident', 'doorman', 'provider']),
  condominiumCode: z
    .string()
    .trim()
    .regex(/^[a-fA-F0-9]{32}$/, 'Invalid condominium code'),
});

export class RegisterDto extends createZodDto(registerSchema) {}
export class CreateManagedUserDto extends createZodDto(managedUserSchema) {}

export const updateUserSchema = managedUserSchema.omit({ password: true }).partial();

export class UpdateUserDto extends createZodDto(updateUserSchema) {}
