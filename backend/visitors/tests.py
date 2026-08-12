from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import User
from visitors.models import AccessLog, Visitor


class VisitorTests(APITestCase):
    def setUp(self):
        self.resident = User.objects.create_user(
            username="resident1",
            password="super-secure-password-123",
            role=User.Role.RESIDENT,
            block="A",
            apartment="101",
        )
        self.doorman = User.objects.create_user(
            username="doorman1", password="super-secure-password-123", role=User.Role.DOORMAN
        )

    def test_resident_registers_visitor(self):
        self.client.force_authenticate(self.resident)
        now = timezone.now()
        response = self.client.post(
            reverse("visitor-list"),
            {
                "name": "John Doe",
                "block": "A",
                "apartment": "101",
                "valid_from": now,
                "valid_until": now + timedelta(hours=4),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", response.data)

    def test_doorman_validates_token_and_logs_entry(self):
        now = timezone.now()
        visitor = Visitor.objects.create(
            name="John Doe",
            block="A",
            apartment="101",
            valid_from=now,
            valid_until=now + timedelta(hours=4),
            created_by=self.resident,
        )
        self.client.force_authenticate(self.doorman)
        response = self.client.post(
            reverse("visitor-validate-token"), {"token": str(visitor.token), "direction": "entry"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(AccessLog.objects.filter(visitor=visitor).count(), 1)

    def test_expired_token_is_rejected(self):
        now = timezone.now()
        visitor = Visitor.objects.create(
            name="John Doe",
            block="A",
            apartment="101",
            valid_from=now - timedelta(hours=5),
            valid_until=now - timedelta(hours=1),
            created_by=self.resident,
        )
        self.client.force_authenticate(self.doorman)
        response = self.client.post(
            reverse("visitor-validate-token"), {"token": str(visitor.token), "direction": "entry"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
