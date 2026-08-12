from rest_framework import serializers

from packages.models import Package


class PackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Package
        fields = (
            "id",
            "block",
            "apartment",
            "description",
            "photo",
            "status",
            "picked_up_at",
            "picked_up_by",
            "released_by",
            "created_by",
            "created_at",
        )
        read_only_fields = ("id", "status", "picked_up_at", "released_by", "created_by", "created_at")


class PackagePickupSerializer(serializers.Serializer):
    picked_up_by = serializers.CharField(max_length=150)
