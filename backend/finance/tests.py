from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from finance.models import ExpenseCategory
from users.models import User


class FinanceTests(APITestCase):
    def setUp(self):
        self.manager = User.objects.create_user(
            username="manager1", password="super-secure-password-123", role=User.Role.MANAGER
        )
        self.resident = User.objects.create_user(
            username="resident1", password="super-secure-password-123", role=User.Role.RESIDENT
        )
        self.category = ExpenseCategory.objects.create(name="Cleaning")

    def test_manager_registers_expense(self):
        self.client.force_authenticate(self.manager)
        response = self.client.post(
            reverse("expense-list"),
            {
                "category": self.category.id,
                "reference_month": "2026-08-01",
                "budgeted_amount": "1000.00",
                "actual_amount": "1200.00",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["difference"], "200.00")

    def test_resident_can_only_read_expenses(self):
        self.client.force_authenticate(self.resident)
        response = self.client.post(
            reverse("expense-list"),
            {
                "category": self.category.id,
                "reference_month": "2026-08-01",
                "budgeted_amount": "1000.00",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
