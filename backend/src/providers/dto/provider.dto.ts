import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createProviderSchema = z.object({
  name: z.string().min(1).max(150),
  contractNumber: z.string().max(50).default(''),
  contact: z.string().max(100).default(''),
  user: z.coerce.number().int().optional(),
});

export class CreateProviderDto extends createZodDto(createProviderSchema) {}

export const updateProviderSchema = createProviderSchema.partial();

export class UpdateProviderDto extends createZodDto(updateProviderSchema) {}

export const createEvidenceSchema = z.object({
  ticket: z.coerce.number().int(),
  notes: z.string().default(''),
});

export class CreateEvidenceDto extends createZodDto(createEvidenceSchema) {}

export const updateEvidenceSchema = z.object({
  notes: z.string().optional(),
});

export class UpdateEvidenceDto extends createZodDto(updateEvidenceSchema) {}
