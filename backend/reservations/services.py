from core.services import audit_on_create
from reservations.models import Reservation
from reservations.repositories import CommonAreaRepository, ReservationRepository
from users.models import User


class CommonAreaService:
    def __init__(self, repo: CommonAreaRepository | None = None):
        self.repo = repo or CommonAreaRepository()

    def list_all(self):
        return self.repo.all()


class ReservationService:
    def __init__(self, repo: ReservationRepository | None = None):
        self.repo = repo or ReservationRepository()

    def list_for_user(self, user):
        if user.role == User.Role.RESIDENT:
            return self.repo.filter_by_resident(user)
        if user.role == User.Role.MANAGER:
            return self.repo.all()
        return Reservation.objects.none()

    def create(self, validated_data, resident):
        return self.repo.create(
            resident=resident, **validated_data, **audit_on_create(resident)
        )
