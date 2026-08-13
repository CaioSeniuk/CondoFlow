from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from users.permissions import IsDoorman, IsManagerOrDoorman, IsResident
from visitors.api.serializers import AccessLogSerializer, ValidateTokenSerializer, VisitorSerializer
from visitors.models import AccessLog
from visitors.services import VisitorNotFound, VisitorService, VisitorTokenInvalid


class VisitorViewSet(viewsets.ModelViewSet):
    serializer_class = VisitorSerializer
    service = VisitorService()

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsResident()]
        return super().get_permissions()

    def get_queryset(self):
        return self.service.list_for_user(self.request.user)

    def perform_create(self, serializer):
        serializer.instance = self.service.create(serializer.validated_data, self.request.user)

    @action(detail=False, methods=["post"], permission_classes=[IsDoorman])
    def validate_token(self, request):
        serializer = ValidateTokenSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            visitor, log = self.service.validate_token(
                serializer.validated_data["token"],
                serializer.validated_data["direction"],
                request.user,
            )
        except VisitorNotFound:
            return Response({"detail": "Visitor not found"}, status=status.HTTP_404_NOT_FOUND)
        except VisitorTokenInvalid:
            return Response(
                {"detail": "QR code expired or not yet valid"},
                status=status.HTTP_400_BAD_REQUEST,
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
