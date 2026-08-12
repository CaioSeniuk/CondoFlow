from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from polls.models import Poll, PollOption, Vote
from polls.serializers import PollSerializer, VoteSerializer
from users.models import User
from users.permissions import IsManagerOrReadOnly, IsResident


class PollViewSet(viewsets.ModelViewSet):
    serializer_class = PollSerializer
    permission_classes = [IsManagerOrReadOnly]

    def get_queryset(self):
        user = self.request.user
        if user.role in (User.Role.RESIDENT, User.Role.MANAGER):
            return Poll.objects.all()
        return Poll.objects.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[IsResident])
    def vote(self, request, pk=None):
        poll = self.get_object()
        serializer = VoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            option = poll.options.get(id=serializer.validated_data["option"])
        except PollOption.DoesNotExist:
            raise ValidationError({"option": "Invalid option for this poll."})

        vote = Vote(option=option, resident=request.user)
        try:
            vote.clean()
        except DjangoValidationError as exc:
            raise ValidationError({"detail": exc.message})
        vote.save()
        return Response(PollSerializer(poll, context={"request": request}).data)
