from django.utils import timezone

from core.services import audit_on_create
from packages.models import Package
from packages.repositories import PackageRepository
from users.models import User


class PackageService:
    def __init__(self, repo: PackageRepository | None = None):
        self.repo = repo or PackageRepository()

    def list_for_user(self, user):
        if user.role == User.Role.RESIDENT:
            return self.repo.filter_by_block_apartment(user.block, user.apartment)
        if user.role in (User.Role.MANAGER, User.Role.DOORMAN):
            return self.repo.all()
        return Package.objects.none()

    def create(self, validated_data, user):
        return self.repo.create(**validated_data, **audit_on_create(user))

    def pickup(self, package, picked_up_by, actor):
        package.status = Package.Status.PICKED_UP
        package.picked_up_at = timezone.now()
        package.picked_up_by = picked_up_by
        package.released_by = actor
        package.updated_by = actor
        return self.repo.save(package)
