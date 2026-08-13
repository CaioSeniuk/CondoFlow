from rest_framework import serializers

from announcements.models import Announcement, ReadConfirmation


class AnnouncementSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source="created_by.get_full_name", read_only=True)
    confirmed_by_me = serializers.SerializerMethodField()

    class Meta:
        model = Announcement
        fields = (
            "id",
            "title",
            "message",
            "segment",
            "block",
            "apartment",
            "urgent",
            "created_by",
            "created_by_name",
            "created_at",
            "confirmed_by_me",
        )
        read_only_fields = ("id", "created_by", "created_at")

    def get_confirmed_by_me(self, obj):
        user = self.context["request"].user
        if not user.is_authenticated:
            return False
        return obj.confirmations.filter(resident=user).exists()


class ReadConfirmationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReadConfirmation
        fields = ("id", "announcement", "resident", "confirmed_at")
        read_only_fields = ("id", "resident", "confirmed_at")


class ConfirmReadResponseSerializer(serializers.Serializer):
    status = serializers.CharField()
