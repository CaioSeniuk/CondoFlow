from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from announcements.models import Announcement
from users.models import User


class AnnouncementTests(APITestCase):
    def setUp(self):
        self.manager = User.objects.create_user(
            username="manager1", password="super-secure-password-123", role=User.Role.MANAGER
        )
        self.resident = User.objects.create_user(
            username="resident1",
            password="super-secure-password-123",
            role=User.Role.RESIDENT,
            block="A",
            apartment="101",
        )

    def test_manager_can_create_announcement(self):
        self.client.force_authenticate(self.manager)
        response = self.client.post(
            reverse("announcement-list"),
            {"title": "Maintenance", "message": "Elevator under maintenance", "segment": "all"},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_resident_cannot_create_announcement(self):
        self.client.force_authenticate(self.resident)
        response = self.client.post(
            reverse("announcement-list"),
            {"title": "Maintenance", "message": "Elevator under maintenance", "segment": "all"},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_resident_confirms_read(self):
        announcement = Announcement.objects.create(
            title="Assembly", message="General assembly", created_by=self.manager
        )
        self.client.force_authenticate(self.resident)
        url = reverse("announcement-confirm-read", args=[announcement.id])
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(announcement.confirmations.filter(resident=self.resident).exists())
