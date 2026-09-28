import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import {
  BudgetRecord,
  ExpenseRecord,
  FinancialReportRepository,
  FinancialReportRequest,
} from './templates';

/**
 * Adaptador que conecta o `FinancialReportTemplate` (Template Method portado
 * de design-pattern-implementation/backend) ao schema Prisma real do
 * CondoFlow, sem alterar `finance.repository.ts`/`finance.service.ts`
 * existentes. O template original trabalha com um domínio genérico
 * (`ExpenseRecord{category, amount, date}`); aqui mapeamos para o modelo
 * real `Expense{category.name, actualAmount, referenceMonth}`.
 */
@Injectable()
export class PrismaFinancialReportRepository implements FinancialReportRepository {
  constructor(private prisma: PrismaService) {}

  hasManagerPermission(actor: AuthenticatedUser): boolean {
    return actor.role === UserRole.manager;
  }

  async fetchExpenses(request: FinancialReportRequest): Promise<ExpenseRecord[]> {
    const expenses = await this.prisma.expense.findMany({
      where: {
        referenceMonth: { gte: request.startDate, lte: request.endDate },
        ...(request.category ? { category: { name: request.category } } : {}),
      },
      include: { category: { select: { name: true } } },
      orderBy: { referenceMonth: 'asc' },
    });

    // `amount` do relatório = valor realizado (actualAmount), conforme decisão do usuário.
    return expenses.map((expense) => ({
      id: expense.id,
      category: expense.category.name,
      description: expense.description,
      amount: Number(expense.actualAmount),
      date: expense.referenceMonth,
    }));
  }

  async fetchBudgets(request: FinancialReportRequest): Promise<BudgetRecord[]> {
    const expenses = await this.prisma.expense.findMany({
      where: {
        referenceMonth: { gte: request.startDate, lte: request.endDate },
        ...(request.category ? { category: { name: request.category } } : {}),
      },
      include: { category: { select: { name: true } } },
    });

    const byCategory = new Map<string, number>();
    for (const expense of expenses) {
      const current = byCategory.get(expense.category.name) ?? 0;
      byCategory.set(expense.category.name, current + Number(expense.budgetedAmount));
    }

    return Array.from(byCategory.entries()).map(([category, amount]) => ({ category, amount }));
  }
}
