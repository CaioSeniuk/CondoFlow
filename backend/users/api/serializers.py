from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from users.models import User
from users.services import UserService


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "role",
            "block",
            "apartment",
            "phone",
        )
        read_only_fields = ("id",)


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "password",
            "first_name",
            "last_name",
            "email",
            "role",
            "block",
            "apartment",
            "phone",
        )
        read_only_fields = ("id",)

    def create(self, validated_data):
        return UserService().register(validated_data)
