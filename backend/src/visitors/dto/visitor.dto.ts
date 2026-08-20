import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { AccessDirection } from '@prisma/client';

export const createVisitorSchema = z.object({
  name: z.string().min(1).max(150),
  document: z.string().max(30).default(''),
  block: z.string().min(1).max(10),
  apartment: z.string().min(1).max(10),
  validFrom: z.coerce.date(),
  validUntil: z.coerce.date(),
});

export class CreateVisitorDto extends createZodDto(createVisitorSchema) {}

export const updateVisitorSchema = createVisitorSchema.partial();

export class UpdateVisitorDto extends createZodDto(updateVisitorSchema) {}

export const validateTokenSchema = z.object({
  token: z.string().uuid(),
  direction: z.nativeEnum(AccessDirection),
});

export class ValidateTokenDto extends createZodDto(validateTokenSchema) {}
