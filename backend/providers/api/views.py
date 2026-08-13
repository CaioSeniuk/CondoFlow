from drf_spectacular.utils import extend_schema_view
from rest_framework import viewsets

from core.schema import extend_schema_for_viewset
from providers.api.serializers import EvidenceSerializer, ProviderSerializer
from providers.services import EvidenceService, ProviderService
from users.permissions import IsManager, IsProvider

_provider_docs = {
    "list": {
        "summary": "List providers",
        "description": (
            "Managers see every provider. Providers see only their own profile. Residents "
            "and doormen see no results."
        ),
    },
    "retrieve": {"summary": "Retrieve a provider"},
    "create": {"summary": "Register a provider", "description": "Manager only."},
    "update": {"summary": "Replace a provider", "description": "Manager only."},
    "partial_update": {"summary": "Partially update a provider", "description": "Manager only."},
    "destroy": {"summary": "Delete a provider", "description": "Manager only."},
}

_evidence_docs = {
    "list": {
        "summary": "List service evidence",
        "description": (
            "Providers see evidence for their own tickets. Residents see evidence for their "
            "own tickets. Managers see every evidence."
        ),
    },
    "retrieve": {"summary": "Retrieve a piece of evidence"},
    "create": {
        "summary": "Attach evidence to a ticket",
        "description": "Provider only. Before/after photos of the service performed.",
    },
    "update": {"summary": "Replace a piece of evidence", "description": "Provider only."},
    "partial_update": {
        "summary": "Partially update a piece of evidence",
        "description": "Provider only.",
    },
    "destroy": {"summary": "Delete a piece of evidence", "description": "Provider only."},
}


@extend_schema_view(**extend_schema_for_viewset(_provider_docs))
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


@extend_schema_view(**extend_schema_for_viewset(_evidence_docs))
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
