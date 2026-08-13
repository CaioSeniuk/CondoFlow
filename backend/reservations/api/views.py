from rest_framework import viewsets

from reservations.api.serializers import CommonAreaSerializer, ReservationSerializer
from reservations.services import CommonAreaService, ReservationService
from users.permissions import IsManagerOrReadOnly, IsResident


class CommonAreaViewSet(viewsets.ModelViewSet):
    serializer_class = CommonAreaSerializer
    permission_classes = [IsManagerOrReadOnly]
    service = CommonAreaService()

    def get_queryset(self):
        return self.service.list_all()


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
