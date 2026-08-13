from drf_spectacular.utils import extend_schema_view
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from announcements.api.serializers import AnnouncementSerializer, ConfirmReadResponseSerializer
from announcements.services import AnnouncementService
from core.schema import extend_schema_for_viewset
from users.permissions import IsManagerOrReadOnly

_announcement_docs = {
    "list": {
        "summary": "List announcements",
        "description": (
            "Residents see only announcements targeted at their segment (all, their block, "
            "or their apartment). Managers see every announcement."
        ),
    },
    "retrieve": {"summary": "Retrieve an announcement"},
    "create": {"summary": "Create an announcement", "description": "Manager only."},
    "update": {"summary": "Replace an announcement", "description": "Manager only."},
    "partial_update": {
        "summary": "Partially update an announcement",
        "description": "Manager only.",
    },
    "destroy": {"summary": "Delete an announcement", "description": "Manager only."},
    "confirm_read": {
        "summary": "Confirm the announcement was read",
        "description": (
            "Registers that the authenticated resident read this announcement. Used to "
            "track read confirmation on urgent communications."
        ),
        "request": None,
        "responses": ConfirmReadResponseSerializer,
    },
}


@extend_schema_view(**extend_schema_for_viewset(_announcement_docs))
class AnnouncementViewSet(viewsets.ModelViewSet):
    serializer_class = AnnouncementSerializer
    permission_classes = [IsManagerOrReadOnly]
    service = AnnouncementService()

    def get_queryset(self):
        return self.service.list_for_user(self.request.user)

    def perform_create(self, serializer):
        serializer.instance = self.service.create(serializer.validated_data, self.request.user)

    def perform_update(self, serializer):
        serializer.instance = self.service.update(
            serializer.instance, serializer.validated_data, self.request.user
        )

    @action(detail=True, methods=["post"])
    def confirm_read(self, request, pk=None):
        announcement = self.get_object()
        self.service.confirm_read(announcement, request.user)
        return Response(ConfirmReadResponseSerializer({"status": "read confirmed"}).data)
