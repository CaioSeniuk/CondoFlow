from django.contrib.auth.models import Group
from django.db.models.signals import post_save
from django.dispatch import receiver

from users.models import User


@receiver(post_save, sender=User)
def sync_group_with_role(sender, instance, **kwargs):
    """Keeps the user in the Django group matching their role, so the
    built-in Django groups/permissions system can be reused."""
    if not instance.role:
        return
    group, _ = Group.objects.get_or_create(name=instance.role)
    if group not in instance.groups.all():
        instance.groups.add(group)
