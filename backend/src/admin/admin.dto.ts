import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ProductPlan } from '@prisma/client';

export const provisionCondominiumSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(150)
      .transform((name) => name.replace(/\s+/g, ' ')),
    productPlan: z.nativeEnum(ProductPlan).default(ProductPlan.complete),
  })
  .strict();

export class ProvisionCondominiumDto extends createZodDto(provisionCondominiumSchema) {}

export class UpdateProductPlanDto extends createZodDto(
  z.object({ productPlan: z.nativeEnum(ProductPlan) }).strict(),
) {}
