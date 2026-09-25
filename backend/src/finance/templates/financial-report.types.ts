import { AuthenticatedUser } from '../../auth/authenticated-user.interface';

export interface ExpenseRecord {
  id: bigint;
  category: string;
  description: string;
  amount: number;
  date: Date;
}

export interface BudgetRecord {
  category: string;
  amount: number;
}

export interface FinancialReportRequest {
  startDate: Date;
  endDate: Date;
  category?: string;
}

export interface FinancialReportData {
  expenses: ExpenseRecord[];
  budgets?: BudgetRecord[];
}

export interface FinancialReportResult {
  title: string;
  period: { startDate: Date; endDate: Date };
  generatedBy: bigint;
  generatedAt: Date;
  summary: Record<string, unknown>;
  lines: string[];
}

export interface FinancialReportRepository {
  hasManagerPermission(actor: AuthenticatedUser): boolean | Promise<boolean>;
  fetchExpenses(request: FinancialReportRequest): Promise<ExpenseRecord[]>;
  fetchBudgets?(request: FinancialReportRequest): Promise<BudgetRecord[]>;
}
