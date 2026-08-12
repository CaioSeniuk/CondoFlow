from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from users.models import User
from users.permissions import IsDoorman, IsManagerOrDoorman, IsResident
from visitors.models import AccessLog, Visitor
from visitors.serializers import AccessLogSerializer, ValidateTokenSerializer, VisitorSerializer


class VisitorViewSet(viewsets.ModelViewSet):
    serializer_class = VisitorSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsResident()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        queryset = Visitor.objects.all()
        if user.role == User.Role.RESIDENT:
            return queryset.filter(block=user.block, apartment=user.apartment)
        if user.role in (User.Role.MANAGER, User.Role.DOORMAN):
            return queryset
        return Visitor.objects.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    @action(detail=False, methods=["post"], permission_classes=[IsDoorman])
    def validate_token(self, request):
        serializer = ValidateTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            visitor = Visitor.objects.get(token=serializer.validated_data["token"])
        except Visitor.DoesNotExist:
            return Response({"detail": "Visitor not found"}, status=status.HTTP_404_NOT_FOUND)

        if not visitor.is_valid():
            return Response({"detail": "QR code expired or not yet valid"}, status=status.HTTP_400_BAD_REQUEST)

        log = AccessLog.objects.create(
            visitor=visitor,
            direction=serializer.validated_data["direction"],
            registered_by=request.user,
        )
        return Response(
            {
                "visitor": VisitorSerializer(visitor).data,
                "access_log": AccessLogSerializer(log).data,
            }
        )


class AccessLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AccessLogSerializer
    permission_classes = [IsManagerOrDoorman]
    queryset = AccessLog.objects.all()
