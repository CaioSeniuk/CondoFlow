import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpenseCategoriesRepository {
  constructor(private prisma: PrismaService) {}

  all() {
    return this.prisma.expenseCategory.findMany({ orderBy: { name: 'asc' } });
  }

  findById(id: bigint) {
    return this.prisma.expenseCategory.findUnique({ where: { id } });
  }

  create(data: Prisma.ExpenseCategoryUncheckedCreateInput) {
    return this.prisma.expenseCategory.create({ data });
  }

  update(id: bigint, data: Prisma.ExpenseCategoryUncheckedUpdateInput) {
    return this.prisma.expenseCategory.update({ where: { id }, data });
  }

  remove(id: bigint) {
    return this.prisma.expenseCategory.delete({ where: { id } });
  }
}

const includeCategoryName = {
  category: { select: { name: true } },
} satisfies Prisma.ExpenseInclude;

export type ExpenseWithCategory = Prisma.ExpenseGetPayload<{
  include: typeof includeCategoryName;
}>;

@Injectable()
export class ExpensesRepository {
  constructor(private prisma: PrismaService) {}

  all() {
    return this.prisma.expense.findMany({
      include: includeCategoryName,
      orderBy: { referenceMonth: 'desc' },
    });
  }

  findById(id: bigint) {
    return this.prisma.expense.findUnique({ where: { id }, include: includeCategoryName });
  }

  create(data: Prisma.ExpenseUncheckedCreateInput) {
    return this.prisma.expense.create({ data, include: includeCategoryName });
  }

  update(id: bigint, data: Prisma.ExpenseUncheckedUpdateInput) {
    return this.prisma.expense.update({ where: { id }, data, include: includeCategoryName });
  }

  remove(id: bigint) {
    return this.prisma.expense.delete({ where: { id } });
  }
}
