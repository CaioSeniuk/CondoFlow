from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from polls.models import Poll, PollOption
from users.models import User


class PollTests(APITestCase):
    def setUp(self):
        self.manager = User.objects.create_user(
            username="manager1", password="super-secure-password-123", role=User.Role.MANAGER
        )
        self.resident = User.objects.create_user(
            username="resident1", password="super-secure-password-123", role=User.Role.RESIDENT
        )
        self.poll = Poll.objects.create(question="Paint color?", created_by=self.manager)
        self.option_a = PollOption.objects.create(poll=self.poll, text="Blue")
        self.option_b = PollOption.objects.create(poll=self.poll, text="Green")

    def test_manager_creates_poll_with_options(self):
        self.client.force_authenticate(self.manager)
        response = self.client.post(
            reverse("poll-list"),
            {"question": "New gym hours?", "options": [{"text": "6-22h"}, {"text": "24h"}]},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_resident_votes_once(self):
        self.client.force_authenticate(self.resident)
        response = self.client.post(
            reverse("poll-vote", args=[self.poll.id]), {"option": self.option_a.id}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.post(
            reverse("poll-vote", args=[self.poll.id]), {"option": self.option_b.id}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
