from rest_framework import serializers

from visitors.models import AccessLog, Visitor


class VisitorSerializer(serializers.ModelSerializer):
    is_valid = serializers.SerializerMethodField()

    class Meta:
        model = Visitor
        fields = (
            "id",
            "name",
            "document",
            "block",
            "apartment",
            "token",
            "valid_from",
            "valid_until",
            "is_valid",
            "created_by",
            "created_at",
        )
        read_only_fields = ("id", "token", "created_by", "created_at")

    def get_is_valid(self, obj):
        return obj.is_valid()


class AccessLogSerializer(serializers.ModelSerializer):
    visitor_name = serializers.CharField(source="visitor.name", read_only=True)

    class Meta:
        model = AccessLog
        fields = ("id", "visitor", "visitor_name", "direction", "registered_by", "registered_at")
        read_only_fields = ("id", "registered_by", "registered_at")


class ValidateTokenSerializer(serializers.Serializer):
    token = serializers.UUIDField()
    direction = serializers.ChoiceField(choices=AccessLog.Direction.choices)
