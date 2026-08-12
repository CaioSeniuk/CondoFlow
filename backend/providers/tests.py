from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from providers.models import Provider
from tickets.models import Ticket
from users.models import User


class ProviderTests(APITestCase):
    def setUp(self):
        self.manager = User.objects.create_user(
            username="manager1", password="super-secure-password-123", role=User.Role.MANAGER
        )
        self.provider_user = User.objects.create_user(
            username="provider1", password="super-secure-password-123", role=User.Role.PROVIDER
        )
        self.provider = Provider.objects.create(name="Fix It Co.", user=self.provider_user)
        self.resident = User.objects.create_user(
            username="resident1", password="super-secure-password-123", role=User.Role.RESIDENT
        )
        self.ticket = Ticket.objects.create(
            resident=self.resident,
            category="Plumbing",
            location="Bathroom",
            description="Leak",
            provider=self.provider,
        )

    def test_manager_registers_provider(self):
        self.client.force_authenticate(self.manager)
        response = self.client.post(reverse("provider-list"), {"name": "Clean Co."})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_provider_uploads_evidence(self):
        self.client.force_authenticate(self.provider_user)
        response = self.client.post(
            reverse("evidence-list"), {"ticket": self.ticket.id, "notes": "Fixed the leak"}
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
