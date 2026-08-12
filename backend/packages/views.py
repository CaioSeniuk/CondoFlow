from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from packages.models import Package
from packages.serializers import PackagePickupSerializer, PackageSerializer
from users.models import User
from users.permissions import IsDoorman


class PackageViewSet(viewsets.ModelViewSet):
    serializer_class = PackageSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy", "pickup"):
            return [IsDoorman()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        queryset = Package.objects.all()
        if user.role == User.Role.RESIDENT:
            return queryset.filter(block=user.block, apartment=user.apartment)
        if user.role in (User.Role.MANAGER, User.Role.DOORMAN):
            return queryset
        return Package.objects.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    @action(detail=True, methods=["post"])
    def pickup(self, request, pk=None):
        package = self.get_object()
        serializer = PackagePickupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        package.status = Package.Status.PICKED_UP
        package.picked_up_at = timezone.now()
        package.picked_up_by = serializer.validated_data["picked_up_by"]
        package.released_by = request.user
        package.updated_by = request.user
        package.save()
        return Response(PackageSerializer(package).data)
