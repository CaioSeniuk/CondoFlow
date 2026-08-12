from rest_framework import viewsets

from reservations.models import CommonArea, Reservation
from reservations.serializers import CommonAreaSerializer, ReservationSerializer
from users.models import User
from users.permissions import IsManagerOrReadOnly, IsResident


class CommonAreaViewSet(viewsets.ModelViewSet):
    serializer_class = CommonAreaSerializer
    permission_classes = [IsManagerOrReadOnly]
    queryset = CommonArea.objects.all()


class ReservationViewSet(viewsets.ModelViewSet):
    serializer_class = ReservationSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsResident()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        queryset = Reservation.objects.all()
        if user.role == User.Role.RESIDENT:
            return queryset.filter(resident=user)
        if user.role == User.Role.MANAGER:
            return queryset
        return Reservation.objects.none()

    def perform_create(self, serializer):
        serializer.save(
            resident=self.request.user, created_by=self.request.user, updated_by=self.request.user
        )
