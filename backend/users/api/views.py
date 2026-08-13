from drf_spectacular.utils import extend_schema_view
from rest_framework import permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.schema import extend_schema_for_viewset
from users.api.serializers import RegisterSerializer, UserSerializer
from users.permissions import IsManager
from users.services import UserService

_user_docs = {
    "list": {"summary": "List users", "description": "Manager only."},
    "retrieve": {"summary": "Retrieve a user", "description": "Manager only."},
    "create": {
        "summary": "Register a user",
        "description": "Public endpoint. Creates the account with the given role and hashed password.",
    },
    "update": {"summary": "Replace a user", "description": "Manager only."},
    "partial_update": {"summary": "Partially update a user", "description": "Manager only."},
    "destroy": {"summary": "Delete a user", "description": "Manager only."},
    "me": {
        "summary": "Retrieve the authenticated user's profile",
        "request": None,
        "responses": UserSerializer,
    },
}


@extend_schema_view(**extend_schema_for_viewset(_user_docs))
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
