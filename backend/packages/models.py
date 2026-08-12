from django.conf import settings
from django.db import models

from core.models import AuditModel


class Package(AuditModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Awaiting pickup"
        PICKED_UP = "picked_up", "Picked up"

    block = models.CharField(max_length=10)
    apartment = models.CharField(max_length=10)
    description = models.CharField(max_length=200, blank=True)
    photo = models.ImageField(upload_to="packages/")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    picked_up_at = models.DateTimeField(null=True, blank=True)
    picked_up_by = models.CharField(
        max_length=150, blank=True, help_text="Name of who collected the package"
    )
    released_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="packages_released",
        help_text="Doorman responsible for handing over the package",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Package for {self.block}/{self.apartment} ({self.get_status_display()})"
