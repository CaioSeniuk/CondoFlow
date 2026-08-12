from rest_framework import viewsets

from providers.models import Evidence, Provider
from providers.serializers import EvidenceSerializer, ProviderSerializer
from users.models import User
from users.permissions import IsManager, IsProvider


class ProviderViewSet(viewsets.ModelViewSet):
    serializer_class = ProviderSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsManager()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        if user.role == User.Role.MANAGER:
            return Provider.objects.all()
        if user.role == User.Role.PROVIDER:
            return Provider.objects.filter(user=user)
        return Provider.objects.none()


class EvidenceViewSet(viewsets.ModelViewSet):
    serializer_class = EvidenceSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsProvider()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        queryset = Evidence.objects.all()
        if user.role == User.Role.PROVIDER:
            return queryset.filter(ticket__provider__user=user)
        if user.role == User.Role.RESIDENT:
            return queryset.filter(ticket__resident=user)
        if user.role == User.Role.MANAGER:
            return queryset
        return Evidence.objects.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)
