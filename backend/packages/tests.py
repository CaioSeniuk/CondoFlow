from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from packages.models import Package
from users.models import User


class PackageTests(APITestCase):
    def setUp(self):
        self.doorman = User.objects.create_user(
            username="doorman1", password="super-secure-password-123", role=User.Role.DOORMAN
        )
        self.resident = User.objects.create_user(
            username="resident1",
            password="super-secure-password-123",
            role=User.Role.RESIDENT,
            block="A",
            apartment="101",
        )
        self.photo = SimpleUploadedFile("photo.jpg", b"fake-image-bytes", content_type="image/jpeg")

    def test_doorman_registers_package(self):
        self.client.force_authenticate(self.doorman)
        response = self.client.post(
            reverse("package-list"),
            {"block": "A", "apartment": "101", "photo": self.photo},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_resident_only_sees_own_apartment_packages(self):
        Package.objects.create(
            block="A", apartment="101", photo=self.photo, created_by=self.doorman
        )
        Package.objects.create(
            block="B", apartment="202", photo=self.photo, created_by=self.doorman
        )
        self.client.force_authenticate(self.resident)
        response = self.client.get(reverse("package-list"))
        self.assertEqual(response.data["count"], 1)

    def test_doorman_registers_pickup(self):
        package = Package.objects.create(
            block="A", apartment="101", photo=self.photo, created_by=self.doorman
        )
        self.client.force_authenticate(self.doorman)
        response = self.client.post(
            reverse("package-pickup", args=[package.id]), {"picked_up_by": "Ana Silva"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        package.refresh_from_db()
        self.assertEqual(package.status, Package.Status.PICKED_UP)
        self.assertEqual(package.picked_up_by, "Ana Silva")
