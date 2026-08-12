from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from core.models import AuditModel


class Poll(AuditModel):
    question = models.CharField(max_length=200)
    closes_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return self.question


class PollOption(models.Model):
    poll = models.ForeignKey(Poll, on_delete=models.CASCADE, related_name="options")
    text = models.CharField(max_length=150)

    def __str__(self):
        return self.text

    @property
    def total_votes(self):
        return self.votes.count()


class Vote(models.Model):
    option = models.ForeignKey(PollOption, on_delete=models.CASCADE, related_name="votes")
    resident = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    voted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("option", "resident")

    def __str__(self):
        return f"{self.resident} voted {self.option}"

    def clean(self):
        already_voted = Vote.objects.filter(
            option__poll=self.option.poll, resident=self.resident
        ).exclude(pk=self.pk)
        if already_voted.exists():
            raise ValidationError("This resident has already voted on this poll.")
