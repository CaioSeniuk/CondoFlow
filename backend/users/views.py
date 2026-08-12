from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from users.models import User
from users.permissions import IsManager
from users.serializers import RegisterSerializer, UserSerializer


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("first_name")
    serializer_class = UserSerializer

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
