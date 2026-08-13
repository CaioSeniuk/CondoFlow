from rest_framework import viewsets

from providers.api.serializers import EvidenceSerializer, ProviderSerializer
from providers.services import EvidenceService, ProviderService
from users.permissions import IsManager, IsProvider


class ProviderViewSet(viewsets.ModelViewSet):
    serializer_class = ProviderSerializer
    service = ProviderService()

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsManager()]
        return super().get_permissions()

    def get_queryset(self):
        return self.service.list_for_user(self.request.user)

    def perform_create(self, serializer):
        serializer.instance = self.service.create(serializer.validated_data)


class EvidenceViewSet(viewsets.ModelViewSet):
    serializer_class = EvidenceSerializer
    service = EvidenceService()

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsProvider()]
        return super().get_permissions()

    def get_queryset(self):
        return self.service.list_for_user(self.request.user)

    def perform_create(self, serializer):
        serializer.instance = self.service.create(serializer.validated_data, self.request.user)
