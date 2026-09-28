import { BadRequestException, Body, Controller, Param, Post, Req } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { FinancialReportsService, FinancialReportType } from './financial-reports.service';
import { GenerateFinancialReportDto } from './dto/finance-report.dto';

const VALID_REPORT_TYPES: FinancialReportType[] = ['category-expense', 'budget-vs-actual'];

/**
 * Controller isolado (não substitui `ExpenseCategoriesController`/
 * `ExpensesController`) que expõe o Template Method de relatórios
 * financeiros portado de design-pattern-implementation/backend. Protegido
 * apenas pelo `JwtAuthGuard` global; a permissão de manager é verificada
 * dentro do próprio template (`checkPermission`).
 */
@ApiTags('finance')
@Controller('api/v1/finance/reports')
export class FinancialReportsController {
  constructor(private service: FinancialReportsService) {}

  @Post(':type')
  @ApiOperation({
    summary: 'Generate a financial report',
    description:
      "Design pattern: Template Method. type is 'category-expense' or 'budget-vs-actual'. " +
      'Manager only (checked inside the template); other roles receive 403.',
  })
  @ApiBody({
    type: GenerateFinancialReportDto,
    examples: {
      default: {
        summary: 'Exemplo de período',
        value: { startDate: '2025-01-01', endDate: '2025-12-31', category: 'Manutenção' },
      },
    },
  })
  generate(
    @Param('type') type: string,
    @Body() dto: GenerateFinancialReportDto,
    @Req() req: { user: AuthenticatedUser },
  ) {
    if (!VALID_REPORT_TYPES.includes(type as FinancialReportType)) {
      throw new BadRequestException(
        `Invalid report type '${type}'. Expected one of: ${VALID_REPORT_TYPES.join(', ')}`,
      );
    }
    return this.service.generateReport(type as FinancialReportType, dto, req.user);
  }
}
