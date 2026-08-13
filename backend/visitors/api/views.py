from drf_spectacular.utils import extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.schema import extend_schema_for_viewset
from users.permissions import IsDoorman, IsManagerOrDoorman, IsResident
from visitors.api.serializers import (
    AccessLogSerializer,
    ValidateTokenResponseSerializer,
    ValidateTokenSerializer,
    VisitorSerializer,
)
from visitors.models import AccessLog
from visitors.services import VisitorNotFound, VisitorService, VisitorTokenInvalid

_visitor_docs = {
    "list": {
        "summary": "List visitors",
        "description": (
            "Residents see only visitors registered for their own block/apartment. Managers "
            "and doormen see every visitor."
        ),
    },
    "retrieve": {"summary": "Retrieve a visitor"},
    "create": {
        "summary": "Register a visitor",
        "description": (
            "Resident only. Generates a QR Code token valid only between valid_from and "
            "valid_until."
        ),
    },
    "update": {"summary": "Replace a visitor", "description": "Resident only."},
    "partial_update": {"summary": "Partially update a visitor", "description": "Resident only."},
    "destroy": {"summary": "Delete a visitor", "description": "Resident only."},
    "validate_token": {
        "summary": "Validate a visitor's QR Code",
        "description": (
            "Doorman only. Checks the QR Code token's validity window and registers an "
            "entry/exit access log entry."
        ),
        "request": ValidateTokenSerializer,
        "responses": ValidateTokenResponseSerializer,
    },
}


@extend_schema_view(**extend_schema_for_viewset(_visitor_docs))
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


_access_log_docs = {
    "list": {
        "summary": "List access logs",
        "description": "Manager or doorman only. History of visitor entries and exits.",
    },
    "retrieve": {
        "summary": "Retrieve an access log entry",
        "description": "Manager or doorman only.",
    },
}


@extend_schema_view(**extend_schema_for_viewset(_access_log_docs))
class AccessLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AccessLogSerializer
    permission_classes = [IsManagerOrDoorman]
    queryset = AccessLog.objects.all()
