import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import AuditModel


class Visitor(AuditModel):
    name = models.CharField(max_length=150)
    document = models.CharField(max_length=30, blank=True)
    block = models.CharField(max_length=10)
    apartment = models.CharField(max_length=10)
    token = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    valid_from = models.DateTimeField()
    valid_until = models.DateTimeField()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} -> {self.block}/{self.apartment}"

    def is_valid(self):
        now = timezone.now()
        return self.valid_from <= now <= self.valid_until


class AccessLog(models.Model):
    class Direction(models.TextChoices):
        ENTRY = "entry", "Entry"
        EXIT = "exit", "Exit"

    visitor = models.ForeignKey(Visitor, on_delete=models.CASCADE, related_name="access_logs")
    direction = models.CharField(max_length=10, choices=Direction.choices)
    registered_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    registered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-registered_at"]

    def __str__(self):
        return f"{self.visitor.name} - {self.get_direction_display()}"
