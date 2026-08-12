from django.contrib import admin

from finance.models import Expense, ExpenseCategory


@admin.register(ExpenseCategory)
class ExpenseCategoryAdmin(admin.ModelAdmin):
    list_display = ("name",)


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("category", "reference_month", "budgeted_amount", "actual_amount", "difference")
    list_filter = ("category",)
