from django.contrib import admin

from packages.models import Package


@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    list_display = ("block", "apartment", "status", "created_at", "picked_up_at")
    list_filter = ("status", "block")
    search_fields = ("block", "apartment", "description")
