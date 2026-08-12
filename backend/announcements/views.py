from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from announcements.models import Announcement, ReadConfirmation
from announcements.serializers import AnnouncementSerializer
from users.models import User
from users.permissions import IsManagerOrReadOnly


class AnnouncementViewSet(viewsets.ModelViewSet):
    serializer_class = AnnouncementSerializer
    permission_classes = [IsManagerOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        queryset = Announcement.objects.all()
        if user.role == User.Role.RESIDENT:
            visible_ids = [a.id for a in queryset if a.is_visible_to(user)]
            return queryset.filter(id__in=visible_ids)
        if user.role == User.Role.MANAGER:
            return queryset
        return Announcement.objects.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(detail=True, methods=["post"])
    def confirm_read(self, request, pk=None):
        announcement = self.get_object()
        ReadConfirmation.objects.get_or_create(announcement=announcement, resident=request.user)
        return Response({"status": "read confirmed"})
