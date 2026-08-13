from drf_spectacular.utils import extend_schema_view
from rest_framework import viewsets

from core.schema import extend_schema_for_viewset
from reservations.api.serializers import CommonAreaSerializer, ReservationSerializer
from reservations.services import CommonAreaService, ReservationService
from users.permissions import IsManagerOrReadOnly, IsResident

_common_area_docs = {
    "list": {
        "summary": "List common areas",
        "description": "Visible to any authenticated user.",
    },
    "retrieve": {"summary": "Retrieve a common area"},
    "create": {"summary": "Create a common area", "description": "Manager only."},
    "update": {"summary": "Replace a common area", "description": "Manager only."},
    "partial_update": {
        "summary": "Partially update a common area",
        "description": "Manager only.",
    },
    "destroy": {"summary": "Delete a common area", "description": "Manager only."},
}

_reservation_docs = {
    "list": {
        "summary": "List reservations",
        "description": (
            "Residents see only their own reservations. Managers see every reservation."
        ),
    },
    "retrieve": {"summary": "Retrieve a reservation"},
    "create": {
        "summary": "Create a reservation",
        "description": (
            "Resident only. The backend rejects any reservation that overlaps an existing "
            "confirmed reservation for the same common area."
        ),
    },
    "update": {"summary": "Replace a reservation"},
    "partial_update": {"summary": "Partially update a reservation"},
    "destroy": {"summary": "Delete a reservation"},
}


@extend_schema_view(**extend_schema_for_viewset(_common_area_docs))
class CommonAreaViewSet(viewsets.ModelViewSet):
    serializer_class = CommonAreaSerializer
    permission_classes = [IsManagerOrReadOnly]
    service = CommonAreaService()

    def get_queryset(self):
        return self.service.list_all()


@extend_schema_view(**extend_schema_for_viewset(_reservation_docs))
class ReservationViewSet(viewsets.ModelViewSet):
    serializer_class = ReservationSerializer
    service = ReservationService()

    def get_permissions(self):
        if self.action == "create":
            return [IsResident()]
        return super().get_permissions()

    def get_queryset(self):
        return self.service.list_for_user(self.request.user)

    def perform_create(self, serializer):
        serializer.instance = self.service.create(serializer.validated_data, self.request.user)
