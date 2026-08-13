from drf_spectacular.utils import extend_schema_view
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.schema import extend_schema_for_viewset
from packages.api.serializers import PackagePickupSerializer, PackageSerializer
from packages.services import PackageService
from users.permissions import IsDoorman

_package_docs = {
    "list": {
        "summary": "List packages",
        "description": (
            "Residents see only packages addressed to their own block/apartment. Managers "
            "and doormen see every package."
        ),
    },
    "retrieve": {"summary": "Retrieve a package"},
    "create": {"summary": "Register a package", "description": "Doorman only."},
    "update": {"summary": "Replace a package", "description": "Doorman only."},
    "partial_update": {"summary": "Partially update a package", "description": "Doorman only."},
    "destroy": {"summary": "Delete a package", "description": "Doorman only."},
    "pickup": {
        "summary": "Register package pickup",
        "description": (
            "Doorman only. Records who picked up the package, the timestamp, and the "
            "doorman who released it, for traceability."
        ),
        "request": PackagePickupSerializer,
        "responses": PackageSerializer,
    },
}


@extend_schema_view(**extend_schema_for_viewset(_package_docs))
class PackageViewSet(viewsets.ModelViewSet):
    serializer_class = PackageSerializer
    service = PackageService()

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy", "pickup"):
            return [IsDoorman()]
        return super().get_permissions()

    def get_queryset(self):
        return self.service.list_for_user(self.request.user)

    def perform_create(self, serializer):
        serializer.instance = self.service.create(serializer.validated_data, self.request.user)

    @action(detail=True, methods=["post"])
    def pickup(self, request, pk=None):
        package = self.get_object()
        serializer = PackagePickupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        package = self.service.pickup(
            package, serializer.validated_data["picked_up_by"], request.user
        )
        return Response(PackageSerializer(package).data)
