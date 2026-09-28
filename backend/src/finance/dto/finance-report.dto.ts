import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Payload da rota de relatórios financeiros (Template Method, portado de
 * design-pattern-implementation/backend). `category` é opcional — quando
 * omitido, o relatório considera todas as categorias no período.
 */
export const generateFinancialReportSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  category: z.string().min(1).max(100).optional(),
});

export class GenerateFinancialReportDto extends createZodDto(generateFinancialReportSchema) {}
