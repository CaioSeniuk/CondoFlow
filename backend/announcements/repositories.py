from announcements.models import Announcement, ReadConfirmation


class AnnouncementRepository:
    def all(self):
        return Announcement.objects.all()

    def create(self, **data):
        return Announcement.objects.create(**data)

    def save(self, announcement):
        announcement.save()
        return announcement


class ReadConfirmationRepository:
    def get_or_create(self, announcement, resident):
        return ReadConfirmation.objects.get_or_create(
            announcement=announcement, resident=resident
        )
