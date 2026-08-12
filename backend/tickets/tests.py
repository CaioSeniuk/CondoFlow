from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from tickets.models import Ticket
from users.models import User


class TicketTests(APITestCase):
    def setUp(self):
        self.resident = User.objects.create_user(
            username="resident1", password="super-secure-password-123", role=User.Role.RESIDENT
        )
        self.manager = User.objects.create_user(
            username="manager1", password="super-secure-password-123", role=User.Role.MANAGER
        )

    def test_resident_opens_ticket(self):
        self.client.force_authenticate(self.resident)
        response = self.client.post(
            reverse("ticket-list"),
            {
                "category": "Plumbing",
                "location": "Bathroom",
                "description": "Leaking pipe",
                "urgency": "high",
            },
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        ticket = Ticket.objects.get(id=response.data["id"])
        self.assertEqual(ticket.status_history.count(), 1)

    def test_manager_changes_status(self):
        ticket = Ticket.objects.create(
            resident=self.resident, category="Plumbing", location="Bathroom", description="Leak"
        )
        self.client.force_authenticate(self.manager)
        response = self.client.post(
            reverse("ticket-change-status", args=[ticket.id]), {"status": "under_review"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ticket.refresh_from_db()
        self.assertEqual(ticket.status, Ticket.Status.UNDER_REVIEW)
        self.assertEqual(ticket.status_history.count(), 1)

    def test_resident_only_sees_own_tickets(self):
        Ticket.objects.create(
            resident=self.resident, category="Plumbing", location="Bathroom", description="Leak"
        )
        other = User.objects.create_user(
            username="resident2", password="super-secure-password-123", role=User.Role.RESIDENT
        )
        Ticket.objects.create(resident=other, category="Electrical", location="Hall", description="No light")
        self.client.force_authenticate(self.resident)
        response = self.client.get(reverse("ticket-list"))
        self.assertEqual(response.data["count"], 1)
