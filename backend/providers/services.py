from core.services import audit_on_create
from providers.models import Evidence, Provider
from providers.repositories import EvidenceRepository, ProviderRepository
from users.models import User


class ProviderService:
    def __init__(self, repo: ProviderRepository | None = None):
        self.repo = repo or ProviderRepository()

    def list_for_user(self, user):
        if user.role == User.Role.MANAGER:
            return self.repo.all()
        if user.role == User.Role.PROVIDER:
            return self.repo.filter_by_user(user)
        return Provider.objects.none()

    def create(self, validated_data):
        return self.repo.create(**validated_data)


class EvidenceService:
    def __init__(self, repo: EvidenceRepository | None = None):
        self.repo = repo or EvidenceRepository()

    def list_for_user(self, user):
        if user.role == User.Role.PROVIDER:
            return self.repo.filter_by_provider_user(user)
        if user.role == User.Role.RESIDENT:
            return self.repo.filter_by_resident(user)
        if user.role == User.Role.MANAGER:
            return self.repo.all()
        return Evidence.objects.none()

    def create(self, validated_data, user):
        return self.repo.create(**validated_data, **audit_on_create(user))
