import { Module } from '@nestjs/common';
import { ExpenseCategoriesController, ExpensesController } from './finance.controller';
import { ExpenseCategoriesService, ExpensesService } from './finance.service';
import { ExpenseCategoriesRepository, ExpensesRepository } from './finance.repository';
import { FinancialReportsController } from './financial-reports.controller';
import { FinancialReportsService } from './financial-reports.service';
import { PrismaFinancialReportRepository } from './finance-report.repository';

@Module({
  // ExpenseCategoriesController vem antes: senão `/api/v1/finance/categories` casaria
  // com a rota dinâmica `/api/v1/finance/:id`. FinancialReportsController usa o prefixo
  // dedicado `/api/v1/finance/reports`, sem conflito de segmentos com `:id`.
  controllers: [ExpenseCategoriesController, ExpensesController, FinancialReportsController],
  providers: [
    ExpenseCategoriesService,
    ExpensesService,
    ExpenseCategoriesRepository,
    ExpensesRepository,
    FinancialReportsService,
    PrismaFinancialReportRepository,
  ],
})
export class FinanceModule {}
