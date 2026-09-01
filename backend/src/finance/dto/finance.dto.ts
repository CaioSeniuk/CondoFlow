import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

export class CreateCategoryDto extends createZodDto(createCategorySchema) {}

export const updateCategorySchema = createCategorySchema.partial();

export class UpdateCategoryDto extends createZodDto(updateCategorySchema) {}

export const createExpenseSchema = z.object({
  category: z.coerce.number().int(),
  description: z.string().max(200).default(''),
  referenceMonth: z.coerce.date(),
  budgetedAmount: z.coerce.number(),
  actualAmount: z.coerce.number().default(0),
});

export class CreateExpenseDto extends createZodDto(createExpenseSchema) {}

export const updateExpenseSchema = createExpenseSchema.partial();

export class UpdateExpenseDto extends createZodDto(updateExpenseSchema) {}
