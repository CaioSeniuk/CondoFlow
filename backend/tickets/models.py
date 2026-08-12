from django.conf import settings
from django.db import models

from core.models import AuditModel


class Ticket(AuditModel):
    class Urgency(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        UNDER_REVIEW = "under_review", "Under review"
        PROVIDER_ASSIGNED = "provider_assigned", "Provider assigned"
        IN_PROGRESS = "in_progress", "In progress"
        RESOLVED = "resolved", "Resolved"

    resident = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="tickets"
    )
    category = models.CharField(max_length=100)
    location = models.CharField(max_length=150)
    description = models.TextField()
    photo = models.ImageField(upload_to="tickets/", null=True, blank=True)
    urgency = models.CharField(max_length=10, choices=Urgency.choices, default=Urgency.LOW)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    provider = models.ForeignKey(
        "providers.Provider",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tickets",
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.category} - {self.get_status_display()}"


class StatusHistory(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name="status_history")
    status = models.CharField(max_length=20, choices=Ticket.Status.choices)
    changed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)
    note = models.CharField(max_length=250, blank=True)

    class Meta:
        ordering = ["changed_at"]
        verbose_name_plural = "Status histories"

    def __str__(self):
        return f"{self.ticket} -> {self.get_status_display()}"
