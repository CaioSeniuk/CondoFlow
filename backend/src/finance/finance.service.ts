import { Injectable } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { auditOnCreate, auditOnUpdate } from '../common/audit';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import {
  ExpenseCategoriesRepository,
  ExpenseWithCategory,
  ExpensesRepository,
} from './finance.repository';
import {
  CreateCategoryDto,
  CreateExpenseDto,
  UpdateCategoryDto,
  UpdateExpenseDto,
} from './dto/finance.dto';

function isResidentOrManager(user: AuthenticatedUser) {
  return user.role === UserRole.resident || user.role === UserRole.manager;
}

@Injectable()
export class ExpenseCategoriesService {
  constructor(private repo: ExpenseCategoriesRepository) {}

  listForUser(user: AuthenticatedUser) {
    return isResidentOrManager(user) ? this.repo.all() : Promise.resolve([]);
  }

  /** Mesmo escopo do `listForUser` — porteiro e prestador não enxergam o financeiro. */
  findByIdForUser(id: bigint, user: AuthenticatedUser) {
    return isResidentOrManager(user) ? this.repo.findById(id) : Promise.resolve(null);
  }

  create(dto: CreateCategoryDto, user: AuthenticatedUser) {
    return this.repo.create({ ...dto, ...auditOnCreate(user) });
  }

  update(id: bigint, dto: UpdateCategoryDto, user: AuthenticatedUser) {
    return this.repo.update(id, { ...dto, ...auditOnUpdate(user) });
  }

  remove(id: bigint) {
    return this.repo.remove(id);
  }
}

@Injectable()
export class ExpensesService {
  constructor(private repo: ExpensesRepository) {}

  listForUser(user: AuthenticatedUser) {
    return isResidentOrManager(user) ? this.repo.all() : Promise.resolve([]);
  }

  /** Mesmo escopo do `listForUser` — porteiro e prestador não enxergam o financeiro. */
  findByIdForUser(id: bigint, user: AuthenticatedUser) {
    return isResidentOrManager(user) ? this.repo.findById(id) : Promise.resolve(null);
  }

  create(dto: CreateExpenseDto, user: AuthenticatedUser) {
    const { category, budgetedAmount, actualAmount, ...rest } = dto;
    return this.repo.create({
      ...rest,
      categoryId: BigInt(category),
      budgetedAmount: new Prisma.Decimal(budgetedAmount),
      actualAmount: new Prisma.Decimal(actualAmount),
      ...auditOnCreate(user),
    });
  }

  update(id: bigint, dto: UpdateExpenseDto, user: AuthenticatedUser) {
    const { category, budgetedAmount, actualAmount, ...rest } = dto;
    return this.repo.update(id, {
      ...rest,
      ...(category !== undefined ? { categoryId: BigInt(category) } : {}),
      ...(budgetedAmount !== undefined
        ? { budgetedAmount: new Prisma.Decimal(budgetedAmount) }
        : {}),
      ...(actualAmount !== undefined ? { actualAmount: new Prisma.Decimal(actualAmount) } : {}),
      ...auditOnUpdate(user),
    });
  }

  remove(id: bigint) {
    return this.repo.remove(id);
  }

  serialize(expense: ExpenseWithCategory) {
    return { ...expense, difference: expense.actualAmount.minus(expense.budgetedAmount) };
  }
}
