from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from announcements.api.serializers import AnnouncementSerializer, ConfirmReadResponseSerializer
from announcements.services import AnnouncementService
from users.permissions import IsManagerOrReadOnly


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

    @extend_schema(request=None, responses=ConfirmReadResponseSerializer)
    @action(detail=True, methods=["post"])
    def confirm_read(self, request, pk=None):
        announcement = self.get_object()
        self.service.confirm_read(announcement, request.user)
        return Response(ConfirmReadResponseSerializer({"status": "read confirmed"}).data)
