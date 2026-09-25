import { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { FinancialReportTemplate } from './financial-report.template';
import {
  FinancialReportData,
  FinancialReportRequest,
  FinancialReportResult,
} from './financial-report.types';

export class CategoryExpenseReport extends FinancialReportTemplate {
  protected calculate(data: FinancialReportData): Record<string, unknown> {
    const byCategory: Record<string, number> = {};

    for (const expense of data.expenses) {
      byCategory[expense.category] = (byCategory[expense.category] ?? 0) + expense.amount;
    }

    const total = Object.values(byCategory).reduce((sum, value) => sum + value, 0);

    return {
      byCategory,
      total,
      expenseCount: data.expenses.length,
    };
  }

  protected formatResponse(
    calculated: Record<string, unknown>,
    request: FinancialReportRequest,
    actor: AuthenticatedUser,
  ): FinancialReportResult {
    const byCategory = calculated.byCategory as Record<string, number>;
    const lines = Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)
      .map(([category, amount]) => `${category}: R$ ${amount.toFixed(2)}`);

    return {
      title: 'Despesas por categoria',
      period: { startDate: request.startDate, endDate: request.endDate },
      generatedBy: actor.id,
      generatedAt: new Date(),
      summary: calculated,
      lines,
    };
  }
}
