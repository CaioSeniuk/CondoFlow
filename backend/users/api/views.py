from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from users.api.serializers import RegisterSerializer, UserSerializer
from users.permissions import IsManager
from users.services import UserService


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    service = UserService()

    def get_queryset(self):
        return self.service.list_all()

    def get_permissions(self):
        if self.action == "create":
            return [permissions.AllowAny()]
        if self.action == "me":
            return [permissions.IsAuthenticated()]
        return [IsManager()]

    def get_serializer_class(self):
        if self.action == "create":
            return RegisterSerializer
        return UserSerializer

    @action(detail=False, methods=["get"], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)
