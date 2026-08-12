from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from reservations.models import CommonArea, Reservation


class CommonAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommonArea
        fields = ("id", "name", "description")
        read_only_fields = ("id",)


class ReservationSerializer(serializers.ModelSerializer):
    common_area_name = serializers.CharField(source="common_area.name", read_only=True)
    resident_name = serializers.CharField(source="resident.get_full_name", read_only=True)

    class Meta:
        model = Reservation
        fields = (
            "id",
            "common_area",
            "common_area_name",
            "resident",
            "resident_name",
            "start_time",
            "end_time",
            "status",
            "created_at",
        )
        read_only_fields = ("id", "resident", "status", "created_at")

    def validate(self, attrs):
        instance = Reservation(
            id=self.instance.id if self.instance else None,
            common_area=attrs.get("common_area", getattr(self.instance, "common_area", None)),
            start_time=attrs.get("start_time", getattr(self.instance, "start_time", None)),
            end_time=attrs.get("end_time", getattr(self.instance, "end_time", None)),
        )
        try:
            instance.clean()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message)
        return attrs
