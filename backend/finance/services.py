from core.services import audit_on_create
from finance.models import Expense, ExpenseCategory
from finance.repositories import ExpenseCategoryRepository, ExpenseRepository
from users.models import User


class ExpenseCategoryService:
    def __init__(self, repo: ExpenseCategoryRepository | None = None):
        self.repo = repo or ExpenseCategoryRepository()

    def list_for_user(self, user):
        if user.role in (User.Role.RESIDENT, User.Role.MANAGER):
            return self.repo.all()
        return ExpenseCategory.objects.none()

    def create(self, validated_data, user):
        return self.repo.create(**validated_data, **audit_on_create(user))


class ExpenseService:
    def __init__(self, repo: ExpenseRepository | None = None):
        self.repo = repo or ExpenseRepository()

    def list_for_user(self, user):
        if user.role in (User.Role.RESIDENT, User.Role.MANAGER):
            return self.repo.all()
        return Expense.objects.none()

    def create(self, validated_data, user):
        return self.repo.create(**validated_data, **audit_on_create(user))
