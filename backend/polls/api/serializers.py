from rest_framework import serializers

from polls.models import Poll, PollOption, Vote
from polls.services import PollService


class PollOptionSerializer(serializers.ModelSerializer):
    total_votes = serializers.IntegerField(read_only=True)

    class Meta:
        model = PollOption
        fields = ("id", "text", "total_votes")
        read_only_fields = ("id",)


class PollSerializer(serializers.ModelSerializer):
    options = PollOptionSerializer(many=True)
    voted_by_me = serializers.SerializerMethodField()

    class Meta:
        model = Poll
        fields = ("id", "question", "closes_at", "options", "voted_by_me", "created_at")
        read_only_fields = ("id", "created_at")

    def get_voted_by_me(self, obj):
        user = self.context["request"].user
        if not user.is_authenticated:
            return False
        return Vote.objects.filter(option__poll=obj, resident=user).exists()

    def create(self, validated_data):
        user = self.context["request"].user
        return PollService().create_poll(validated_data, user)


class VoteSerializer(serializers.Serializer):
    option = serializers.IntegerField()
