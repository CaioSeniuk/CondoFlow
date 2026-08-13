from core.services import audit_on_create
from tickets.models import Ticket
from tickets.repositories import StatusHistoryRepository, TicketRepository
from users.models import User


class TicketService:
    def __init__(
        self,
        repo: TicketRepository | None = None,
        status_history_repo: StatusHistoryRepository | None = None,
    ):
        self.repo = repo or TicketRepository()
        self.status_history_repo = status_history_repo or StatusHistoryRepository()

    def list_for_user(self, user):
        if user.role == User.Role.RESIDENT:
            return self.repo.filter_by_resident(user)
        if user.role == User.Role.PROVIDER:
            return self.repo.filter_by_provider_user(user)
        if user.role == User.Role.MANAGER:
            return self.repo.all()
        return Ticket.objects.none()

    def create(self, validated_data, resident):
        ticket = self.repo.create(
            resident=resident, **validated_data, **audit_on_create(resident)
        )
        self.status_history_repo.create(ticket, ticket.status, resident)
        return ticket

    def change_status(self, ticket, status, note, actor):
        ticket.status = status
        ticket.updated_by = actor
        self.repo.save(ticket)
        self.status_history_repo.create(ticket, status, actor, note)
        return ticket

    def assign_provider(self, ticket, provider_id, actor):
        ticket.provider_id = provider_id
        ticket.status = Ticket.Status.PROVIDER_ASSIGNED
        ticket.updated_by = actor
        self.repo.save(ticket)
        self.status_history_repo.create(
            ticket, ticket.status, actor, "Provider assigned"
        )
        return ticket
