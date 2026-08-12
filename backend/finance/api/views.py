from rest_framework import viewsets

from finance.api.serializers import ExpenseCategorySerializer, ExpenseSerializer
from finance.services import ExpenseCategoryService, ExpenseService
from users.permissions import IsManagerOrReadOnly


class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsManagerOrReadOnly]
    service = ExpenseCategoryService()

    def get_queryset(self):
        return self.service.list_for_user(self.request.user)

    def perform_create(self, serializer):
        serializer.instance = self.service.create(serializer.validated_data, self.request.user)


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsManagerOrReadOnly]
    service = ExpenseService()

    def get_queryset(self):
        return self.service.list_for_user(self.request.user)

    def perform_create(self, serializer):
        serializer.instance = self.service.create(serializer.validated_data, self.request.user)
