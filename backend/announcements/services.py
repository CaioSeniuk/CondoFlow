from announcements.models import Announcement
from announcements.repositories import AnnouncementRepository, ReadConfirmationRepository
from core.services import audit_on_create
from users.models import User


class AnnouncementService:
    def __init__(
        self,
        repo: AnnouncementRepository | None = None,
        confirmation_repo: ReadConfirmationRepository | None = None,
    ):
        self.repo = repo or AnnouncementRepository()
        self.confirmation_repo = confirmation_repo or ReadConfirmationRepository()

    def list_for_user(self, user):
        queryset = self.repo.all()
        if user.role == User.Role.RESIDENT:
            visible_ids = [a.id for a in queryset if a.is_visible_to(user)]
            return queryset.filter(id__in=visible_ids)
        if user.role == User.Role.MANAGER:
            return queryset
        return Announcement.objects.none()

    def create(self, validated_data, user):
        return self.repo.create(**validated_data, **audit_on_create(user))

    def update(self, announcement, validated_data, user):
        for field, value in validated_data.items():
            setattr(announcement, field, value)
        announcement.updated_by = user
        return self.repo.save(announcement)

    def confirm_read(self, announcement, resident):
        self.confirmation_repo.get_or_create(announcement, resident)
