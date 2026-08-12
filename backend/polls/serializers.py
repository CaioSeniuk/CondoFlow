from rest_framework import serializers

from polls.models import Poll, PollOption, Vote


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
        options_data = validated_data.pop("options")
        poll = Poll.objects.create(**validated_data)
        for option_data in options_data:
            PollOption.objects.create(poll=poll, **option_data)
        return poll


class VoteSerializer(serializers.Serializer):
    option = serializers.IntegerField()
