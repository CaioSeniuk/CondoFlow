from drf_spectacular.utils import extend_schema_view
from rest_framework import viewsets

from finance.api.serializers import ExpenseCategorySerializer, ExpenseSerializer
from finance.services import ExpenseCategoryService, ExpenseService
from core.schema import extend_schema_for_viewset
from users.permissions import IsManagerOrReadOnly

_category_docs = {
    "list": {
        "summary": "List expense categories",
        "description": "Visible to residents and managers. Doormen and providers see no results.",
    },
    "retrieve": {"summary": "Retrieve an expense category"},
    "create": {
        "summary": "Create an expense category",
        "description": "Manager only.",
    },
    "update": {"summary": "Replace an expense category", "description": "Manager only."},
    "partial_update": {"summary": "Partially update an expense category", "description": "Manager only."},
    "destroy": {"summary": "Delete an expense category", "description": "Manager only."},
}

_expense_docs = {
    "list": {
        "summary": "List expenses",
        "description": (
            "Visible to residents and managers. Each expense shows budgeted vs. actual "
            "amount for a reference month. Doormen and providers see no results."
        ),
    },
    "retrieve": {"summary": "Retrieve an expense"},
    "create": {"summary": "Register an expense", "description": "Manager only."},
    "update": {"summary": "Replace an expense", "description": "Manager only."},
    "partial_update": {"summary": "Partially update an expense", "description": "Manager only."},
    "destroy": {"summary": "Delete an expense", "description": "Manager only."},
}


@extend_schema_view(**extend_schema_for_viewset(_category_docs))
class ExpenseCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsManagerOrReadOnly]
    service = ExpenseCategoryService()

    def get_queryset(self):
        return self.service.list_for_user(self.request.user)

    def perform_create(self, serializer):
        serializer.instance = self.service.create(serializer.validated_data, self.request.user)


@extend_schema_view(**extend_schema_for_viewset(_expense_docs))
class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    permission_classes = [IsManagerOrReadOnly]
    service = ExpenseService()

    def get_queryset(self):
        return self.service.list_for_user(self.request.user)

    def perform_create(self, serializer):
        serializer.instance = self.service.create(serializer.validated_data, self.request.user)
