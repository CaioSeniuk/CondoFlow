from rest_framework import serializers

from finance.models import Expense, ExpenseCategory


class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = ("id", "name")
        read_only_fields = ("id",)


class ExpenseSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    difference = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Expense
        fields = (
            "id",
            "category",
            "category_name",
            "description",
            "reference_month",
            "budgeted_amount",
            "actual_amount",
            "difference",
            "created_at",
        )
        read_only_fields = ("id", "created_at")
