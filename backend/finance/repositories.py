from finance.models import Expense, ExpenseCategory


class ExpenseCategoryRepository:
    def all(self):
        return ExpenseCategory.objects.all()

    def create(self, **data):
        return ExpenseCategory.objects.create(**data)


class ExpenseRepository:
    def all(self):
        return Expense.objects.all()

    def create(self, **data):
        return Expense.objects.create(**data)
