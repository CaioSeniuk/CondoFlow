from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from users.models import User


@admin.register(User)
class CondoFlowUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ("Condo data", {"fields": ("role", "block", "apartment", "phone")}),
    )
    list_display = ("username", "first_name", "last_name", "role", "block", "apartment")
    list_filter = UserAdmin.list_filter + ("role",)
