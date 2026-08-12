from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from tickets.models import StatusHistory, Ticket
from tickets.serializers import AssignProviderSerializer, ChangeStatusSerializer, TicketSerializer
from users.models import User
from users.permissions import IsManager, IsResident


class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsResident()]
        if self.action in ("change_status", "assign_provider"):
            return [IsManager()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        queryset = Ticket.objects.all()
        if user.role == User.Role.RESIDENT:
            return queryset.filter(resident=user)
        if user.role == User.Role.PROVIDER:
            return queryset.filter(provider__user=user)
        if user.role == User.Role.MANAGER:
            return queryset
        return Ticket.objects.none()

    def perform_create(self, serializer):
        ticket = serializer.save(
            resident=self.request.user, created_by=self.request.user, updated_by=self.request.user
        )
        StatusHistory.objects.create(
            ticket=ticket, status=ticket.status, changed_by=self.request.user
        )

    @action(detail=True, methods=["post"])
    def change_status(self, request, pk=None):
        ticket = self.get_object()
        serializer = ChangeStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket.status = serializer.validated_data["status"]
        ticket.updated_by = request.user
        ticket.save()
        StatusHistory.objects.create(
            ticket=ticket,
            status=ticket.status,
            changed_by=request.user,
            note=serializer.validated_data.get("note", ""),
        )
        return Response(TicketSerializer(ticket).data)

    @action(detail=True, methods=["post"])
    def assign_provider(self, request, pk=None):
        ticket = self.get_object()
        serializer = AssignProviderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket.provider_id = serializer.validated_data["provider"]
        ticket.status = Ticket.Status.PROVIDER_ASSIGNED
        ticket.updated_by = request.user
        ticket.save()
        StatusHistory.objects.create(
            ticket=ticket, status=ticket.status, changed_by=request.user, note="Provider assigned"
        )
        return Response(TicketSerializer(ticket).data)
