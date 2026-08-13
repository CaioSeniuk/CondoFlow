from tickets.models import StatusHistory, Ticket


class TicketRepository:
    def all(self):
        return Ticket.objects.all()

    def filter_by_resident(self, user):
        return Ticket.objects.filter(resident=user)

    def filter_by_provider_user(self, user):
        return Ticket.objects.filter(provider__user=user)

    def create(self, **data):
        return Ticket.objects.create(**data)

    def save(self, ticket):
        ticket.save()
        return ticket


class StatusHistoryRepository:
    def create(self, ticket, status, changed_by, note=""):
        return StatusHistory.objects.create(
            ticket=ticket, status=status, changed_by=changed_by, note=note
        )
