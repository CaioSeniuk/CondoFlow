from django.conf import settings
from django.db import models

from core.models import AuditModel


class Provider(AuditModel):
    name = models.CharField(max_length=150)
    contract_number = models.CharField(max_length=50, blank=True)
    contact = models.CharField(max_length=100, blank=True)
    document = models.FileField(upload_to="providers/documents/", null=True, blank=True)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="provider_profile",
        help_text="Login account used by the provider, if they access the system",
    )

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Evidence(AuditModel):
    ticket = models.ForeignKey(
        "tickets.Ticket", on_delete=models.CASCADE, related_name="evidences"
    )
    before_photo = models.ImageField(upload_to="providers/evidence/before/", null=True, blank=True)
    after_photo = models.ImageField(upload_to="providers/evidence/after/", null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name_plural = "Evidences"

    def __str__(self):
        return f"Evidence for {self.ticket}"
