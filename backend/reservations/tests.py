from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from reservations.models import CommonArea, Reservation
from users.models import User


class ReservationTests(APITestCase):
    def setUp(self):
        self.resident = User.objects.create_user(
            username="resident1", password="super-secure-password-123", role=User.Role.RESIDENT
        )
        self.common_area = CommonArea.objects.create(name="Party room")
        self.start = timezone.now() + timedelta(days=1)
        self.end = self.start + timedelta(hours=2)

    def test_resident_creates_reservation(self):
        self.client.force_authenticate(self.resident)
        response = self.client.post(
            reverse("reservation-list"),
            {"common_area": self.common_area.id, "start_time": self.start, "end_time": self.end},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_conflicting_reservation_is_rejected(self):
        Reservation.objects.create(
            common_area=self.common_area,
            resident=self.resident,
            start_time=self.start,
            end_time=self.end,
        )
        self.client.force_authenticate(self.resident)
        response = self.client.post(
            reverse("reservation-list"),
            {
                "common_area": self.common_area.id,
                "start_time": self.start + timedelta(minutes=30),
                "end_time": self.end + timedelta(minutes=30),
            },
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
