import { AuthenticatedUser } from '../../auth/authenticated-user.interface';
import { FinancialReportTemplate } from './financial-report.template';
import {
  FinancialReportData,
  FinancialReportRequest,
  FinancialReportResult,
} from './financial-report.types';

export class BudgetVsActualReport extends FinancialReportTemplate {
  protected async fetchData(request: FinancialReportRequest): Promise<FinancialReportData> {
    const expenses = await this.repo.fetchExpenses(request);

    if (!this.repo.fetchBudgets) {
      throw new Error('Financial repository must provide budgets for this report');
    }

    const budgets = await this.repo.fetchBudgets(request);
    return { expenses, budgets };
  }

  protected calculate(data: FinancialReportData): Record<string, unknown> {
    const actualByCategory: Record<string, number> = {};

    for (const expense of data.expenses) {
      actualByCategory[expense.category] =
        (actualByCategory[expense.category] ?? 0) + expense.amount;
    }

    const budgets = data.budgets ?? [];
    const comparison = budgets.map((budget) => {
      const actual = actualByCategory[budget.category] ?? 0;
      const variance = budget.amount - actual;
      const percentageUsed = budget.amount === 0 ? 0 : (actual / budget.amount) * 100;

      return {
        category: budget.category,
        budget: budget.amount,
        actual,
        variance,
        percentageUsed,
      };
    });

    return {
      comparison,
      budgetTotal: budgets.reduce((sum, item) => sum + item.amount, 0),
      actualTotal: data.expenses.reduce((sum, item) => sum + item.amount, 0),
    };
  }

  protected formatResponse(
    calculated: Record<string, unknown>,
    request: FinancialReportRequest,
    actor: AuthenticatedUser,
  ): FinancialReportResult {
    const comparison = calculated.comparison as Array<{
      category: string;
      budget: number;
      actual: number;
      variance: number;
      percentageUsed: number;
    }>;

    return {
      title: 'Orçado x realizado',
      period: { startDate: request.startDate, endDate: request.endDate },
      generatedBy: actor.id,
      generatedAt: new Date(),
      summary: calculated,
      lines: comparison.map(
        (item) =>
          `${item.category}: orçamento R$ ${item.budget.toFixed(2)} | ` +
          `realizado R$ ${item.actual.toFixed(2)} | ` +
          `variação R$ ${item.variance.toFixed(2)} | ` +
          `${item.percentageUsed.toFixed(1)}% utilizado`,
      ),
    };
  }
}
