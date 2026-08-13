from drf_spectacular.utils import extend_schema
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from packages.api.serializers import PackagePickupSerializer, PackageSerializer
from packages.services import PackageService
from users.permissions import IsDoorman


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

    @extend_schema(request=PackagePickupSerializer, responses=PackageSerializer)
    @action(detail=True, methods=["post"])
    def pickup(self, request, pk=None):
        package = self.get_object()
        serializer = PackagePickupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        package = self.service.pickup(
            package, serializer.validated_data["picked_up_by"], request.user
        )
        return Response(PackageSerializer(package).data)
