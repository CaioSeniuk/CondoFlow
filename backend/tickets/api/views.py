from drf_spectacular.utils import extend_schema_view
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.schema import extend_schema_for_viewset
from tickets.api.serializers import (
    AssignProviderSerializer,
    ChangeStatusSerializer,
    TicketSerializer,
)
from tickets.services import TicketService
from users.permissions import IsManager, IsResident

_ticket_docs = {
    "list": {
        "summary": "List tickets",
        "description": (
            "Residents see only their own tickets. Providers see only tickets assigned to "
            "them. Managers see every ticket."
        ),
    },
    "retrieve": {"summary": "Retrieve a ticket"},
    "create": {
        "summary": "Open a ticket",
        "description": "Resident only. Creates the initial status history entry.",
    },
    "update": {"summary": "Replace a ticket"},
    "partial_update": {"summary": "Partially update a ticket"},
    "destroy": {"summary": "Delete a ticket"},
    "change_status": {
        "summary": "Change a ticket's status",
        "description": "Manager only. Appends an entry to the ticket's status history.",
        "request": ChangeStatusSerializer,
        "responses": TicketSerializer,
    },
    "assign_provider": {
        "summary": "Assign a provider to a ticket",
        "description": (
            "Manager only. Sets the ticket's status to 'provider_assigned' and appends an "
            "entry to the status history."
        ),
        "request": AssignProviderSerializer,
        "responses": TicketSerializer,
    },
}


@extend_schema_view(**extend_schema_for_viewset(_ticket_docs))
class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    service = TicketService()

    def get_permissions(self):
        if self.action == "create":
            return [IsResident()]
        if self.action in ("change_status", "assign_provider"):
            return [IsManager()]
        return super().get_permissions()

    def get_queryset(self):
        return self.service.list_for_user(self.request.user)

    def perform_create(self, serializer):
        serializer.instance = self.service.create(serializer.validated_data, self.request.user)

    @action(detail=True, methods=["post"])
    def change_status(self, request, pk=None):
        serializer = ChangeStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = self.service.change_status(
            self.get_object(),
            serializer.validated_data["status"],
            serializer.validated_data.get("note", ""),
            request.user,
        )
        return Response(TicketSerializer(ticket).data)

    @action(detail=True, methods=["post"])
    def assign_provider(self, request, pk=None):
        serializer = AssignProviderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = self.service.assign_provider(
            self.get_object(), serializer.validated_data["provider"], request.user
        )
        return Response(TicketSerializer(ticket).data)
