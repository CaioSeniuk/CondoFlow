from rest_framework import serializers

from providers.models import Evidence, Provider


class ProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Provider
        fields = (
            "id",
            "name",
            "contract_number",
            "contact",
            "document",
            "user",
            "created_at",
        )
        read_only_fields = ("id", "created_at")


class EvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evidence
        fields = (
            "id",
            "ticket",
            "before_photo",
            "after_photo",
            "notes",
            "created_by",
            "created_at",
        )
        read_only_fields = ("id", "created_by", "created_at")
