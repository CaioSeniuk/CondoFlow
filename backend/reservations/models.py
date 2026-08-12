from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from core.models import AuditModel


class CommonArea(AuditModel):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Reservation(AuditModel):
    class Status(models.TextChoices):
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"

    common_area = models.ForeignKey(
        CommonArea, on_delete=models.CASCADE, related_name="reservations"
    )
    resident = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reservations"
    )
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.CONFIRMED)

    class Meta:
        ordering = ["start_time"]

    def __str__(self):
        return f"{self.common_area} - {self.start_time:%d/%m/%Y %H:%M}"

    def clean(self):
        if self.start_time >= self.end_time:
            raise ValidationError("start_time must be before end_time.")

        conflicts = Reservation.objects.filter(
            common_area=self.common_area,
            status=self.Status.CONFIRMED,
            start_time__lt=self.end_time,
            end_time__gt=self.start_time,
        ).exclude(pk=self.pk)
        if conflicts.exists():
            raise ValidationError("This common area is already reserved for the selected period.")
