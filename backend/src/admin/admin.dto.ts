import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const provisionCondominiumSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(150)
      .transform((name) => name.replace(/\s+/g, ' ')),
  })
  .strict();

export class ProvisionCondominiumDto extends createZodDto(provisionCondominiumSchema) {}
