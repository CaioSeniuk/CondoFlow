from reservations.models import CommonArea, Reservation


class CommonAreaRepository:
    def all(self):
        return CommonArea.objects.all()


class ReservationRepository:
    def all(self):
        return Reservation.objects.all()

    def filter_by_resident(self, user):
        return Reservation.objects.filter(resident=user)

    def create(self, **data):
        return Reservation.objects.create(**data)
