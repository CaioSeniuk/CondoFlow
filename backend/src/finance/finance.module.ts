import { Module } from '@nestjs/common';
import { ExpenseCategoriesController, ExpensesController } from './finance.controller';
import { ExpenseCategoriesService, ExpensesService } from './finance.service';
import { ExpenseCategoriesRepository, ExpensesRepository } from './finance.repository';

@Module({
  // ExpenseCategoriesController vem antes: senão `/api/v1/finance/categories` casaria
  // com a rota dinâmica `/api/v1/finance/:id`.
  controllers: [ExpenseCategoriesController, ExpensesController],
  providers: [
    ExpenseCategoriesService,
    ExpensesService,
    ExpenseCategoriesRepository,
    ExpensesRepository,
  ],
})
export class FinanceModule {}
