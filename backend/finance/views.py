from rest_framework import viewsets

from finance.models import Expense, ExpenseCategory
from finance.serializers import ExpenseCategorySerializer, ExpenseSerializer
from users.models import User
from users.permissions import IsManagerOrReadOnly


class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsManagerOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.role in (User.Role.RESIDENT, User.Role.MANAGER):
            return ExpenseCategory.objects.all()
        return ExpenseCategory.objects.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsManagerOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.role in (User.Role.RESIDENT, User.Role.MANAGER):
            return Expense.objects.all()
        return Expense.objects.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
