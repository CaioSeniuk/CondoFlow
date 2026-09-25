import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PrismaFinancialReportRepository } from './finance-report.repository';
import {
  BudgetVsActualReport,
  CategoryExpenseReport,
  FinancialReportRequest,
  FinancialReportTemplate,
} from './templates';

export type FinancialReportType = 'category-expense' | 'budget-vs-actual';

/**
 * Serviço isolado (não substitui `ExpensesService`/`ExpenseCategoriesService`)
 * que expõe os relatórios financeiros construídos com o Template Method
 * portado de design-pattern-implementation/backend.
 */
@Injectable()
export class FinancialReportsService {
  private readonly reports: Record<FinancialReportType, FinancialReportTemplate>;

  constructor(repo: PrismaFinancialReportRepository) {
    this.reports = {
      'category-expense': new CategoryExpenseReport(repo),
      'budget-vs-actual': new BudgetVsActualReport(repo),
    };
  }

  generateReport(
    type: FinancialReportType,
    request: FinancialReportRequest,
    actor: AuthenticatedUser,
  ) {
    return this.reports[type].generate(request, actor);
  }
}
