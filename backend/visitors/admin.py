from django.contrib import admin

from visitors.models import AccessLog, Visitor


@admin.register(Visitor)
class VisitorAdmin(admin.ModelAdmin):
    list_display = ("name", "block", "apartment", "valid_from", "valid_until")
    search_fields = ("name", "document")


@admin.register(AccessLog)
class AccessLogAdmin(admin.ModelAdmin):
    list_display = ("visitor", "direction", "registered_by", "registered_at")
    list_filter = ("direction",)
