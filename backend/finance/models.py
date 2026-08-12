from django.db import models

from core.models import AuditModel


class ExpenseCategory(AuditModel):
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "Expense categories"

    def __str__(self):
        return self.name


class Expense(AuditModel):
    category = models.ForeignKey(
        ExpenseCategory, on_delete=models.CASCADE, related_name="expenses"
    )
    description = models.CharField(max_length=200, blank=True)
    reference_month = models.DateField(help_text="Any day within the reference month")
    budgeted_amount = models.DecimalField(max_digits=10, decimal_places=2)
    actual_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        ordering = ["-reference_month"]

    def __str__(self):
        return f"{self.category} - {self.reference_month:%m/%Y}"

    @property
    def difference(self):
        return self.actual_amount - self.budgeted_amount
