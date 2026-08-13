from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from tickets.api.serializers import (
    AssignProviderSerializer,
    ChangeStatusSerializer,
    TicketSerializer,
)
from tickets.services import TicketService
from users.permissions import IsManager, IsResident


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

    @extend_schema(request=ChangeStatusSerializer, responses=TicketSerializer)
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

    @extend_schema(request=AssignProviderSerializer, responses=TicketSerializer)
    @action(detail=True, methods=["post"])
    def assign_provider(self, request, pk=None):
        serializer = AssignProviderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ticket = self.service.assign_provider(
            self.get_object(), serializer.validated_data["provider"], request.user
        )
        return Response(TicketSerializer(ticket).data)
