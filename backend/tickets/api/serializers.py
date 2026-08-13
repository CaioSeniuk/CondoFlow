from rest_framework import serializers

from tickets.models import StatusHistory, Ticket


class StatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source="changed_by.get_full_name", read_only=True)

    class Meta:
        model = StatusHistory
        fields = ("id", "status", "changed_by", "changed_by_name", "changed_at", "note")
        read_only_fields = ("id", "changed_by", "changed_at")


class TicketSerializer(serializers.ModelSerializer):
    resident_name = serializers.CharField(source="resident.get_full_name", read_only=True)
    provider_name = serializers.CharField(source="provider.name", read_only=True)
    status_history = StatusHistorySerializer(many=True, read_only=True)

    class Meta:
        model = Ticket
        fields = (
            "id",
            "resident",
            "resident_name",
            "category",
            "location",
            "description",
            "photo",
            "urgency",
            "status",
            "provider",
            "provider_name",
            "status_history",
            "created_at",
        )
        read_only_fields = ("id", "resident", "status", "provider", "created_at")


class ChangeStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Ticket.Status.choices)
    note = serializers.CharField(max_length=250, required=False, allow_blank=True)


class AssignProviderSerializer(serializers.Serializer):
    provider = serializers.IntegerField()
