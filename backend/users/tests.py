from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import User


class RegisterLoginTests(APITestCase):
    def test_user_registration(self):
        url = reverse("user-list")
        payload = {
            "username": "resident1",
            "password": "super-secure-password-123",
            "first_name": "Ana",
            "last_name": "Silva",
            "email": "ana@example.com",
            "role": User.Role.RESIDENT,
            "block": "A",
            "apartment": "101",
        }
        response = self.client.post(url, payload)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(username="resident1")
        self.assertTrue(user.check_password("super-secure-password-123"))
        self.assertTrue(user.groups.filter(name=User.Role.RESIDENT).exists())

    def test_login_returns_jwt_tokens(self):
        User.objects.create_user(
            username="manager1", password="super-secure-password-123", role=User.Role.MANAGER
        )
        response = self.client.post(
            reverse("token_obtain_pair"),
            {"username": "manager1", "password": "super-secure-password-123"},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_me_endpoint_requires_authentication(self):
        response = self.client.get(reverse("user-me"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
