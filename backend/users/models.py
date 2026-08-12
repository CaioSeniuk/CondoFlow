from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Condo user. Passwords are always hashed by Django (PBKDF2),
    never stored in plain text."""

    class Role(models.TextChoices):
        RESIDENT = "resident", "Resident"
        MANAGER = "manager", "Property manager"
        DOORMAN = "doorman", "Doorman"
        PROVIDER = "provider", "Service provider"

    role = models.CharField(max_length=20, choices=Role.choices)
    block = models.CharField(max_length=10, blank=True)
    apartment = models.CharField(max_length=10, blank=True)
    phone = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"
