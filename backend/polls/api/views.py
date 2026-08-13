from django.core.exceptions import ValidationError as DjangoValidationError
from drf_spectacular.utils import extend_schema_view
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from core.schema import extend_schema_for_viewset
from polls.api.serializers import PollSerializer, VoteSerializer
from polls.models import PollOption
from polls.services import PollService
from users.permissions import IsManagerOrReadOnly, IsResident

_poll_docs = {
    "list": {
        "summary": "List polls",
        "description": "Visible to residents and managers. Doormen and providers see no results.",
    },
    "retrieve": {"summary": "Retrieve a poll"},
    "create": {"summary": "Create a poll", "description": "Manager only."},
    "update": {"summary": "Replace a poll", "description": "Manager only."},
    "partial_update": {"summary": "Partially update a poll", "description": "Manager only."},
    "destroy": {"summary": "Delete a poll", "description": "Manager only."},
    "vote": {
        "summary": "Vote on a poll",
        "description": "Resident only. Each resident may vote once per poll.",
        "request": VoteSerializer,
        "responses": PollSerializer,
    },
}


@extend_schema_view(**extend_schema_for_viewset(_poll_docs))
class PollViewSet(viewsets.ModelViewSet):
    serializer_class = PollSerializer
    permission_classes = [IsManagerOrReadOnly]
    service = PollService()

    def get_queryset(self):
        return self.service.list_for_user(self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[IsResident])
    def vote(self, request, pk=None):
        poll = self.get_object()
        serializer = VoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.service.vote(poll, serializer.validated_data["option"], request.user)
        except PollOption.DoesNotExist:
            raise ValidationError({"option": "Invalid option for this poll."})
        except DjangoValidationError as exc:
            raise ValidationError({"detail": exc.message})
        return Response(PollSerializer(poll, context={"request": request}).data)
