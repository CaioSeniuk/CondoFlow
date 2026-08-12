from django.conf import settings
from django.db import models

from core.models import AuditModel


class Announcement(AuditModel):
    class Segment(models.TextChoices):
        ALL = "all", "All residents"
        BLOCK = "block", "A specific block"
        APARTMENT = "apartment", "A specific apartment"

    title = models.CharField(max_length=200)
    message = models.TextField()
    segment = models.CharField(max_length=20, choices=Segment.choices, default=Segment.ALL)
    block = models.CharField(max_length=10, blank=True)
    apartment = models.CharField(max_length=10, blank=True)
    urgent = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.title

    def is_visible_to(self, user):
        if self.segment == self.Segment.ALL:
            return True
        if self.segment == self.Segment.BLOCK:
            return user.block == self.block
        if self.segment == self.Segment.APARTMENT:
            return user.block == self.block and user.apartment == self.apartment
        return False


class ReadConfirmation(models.Model):
    announcement = models.ForeignKey(
        Announcement, on_delete=models.CASCADE, related_name="confirmations"
    )
    resident = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    confirmed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("announcement", "resident")

    def __str__(self):
        return f"{self.resident} confirmed {self.announcement}"
