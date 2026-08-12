from django.contrib import admin

from announcements.models import Announcement, ReadConfirmation


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ("title", "segment", "urgent", "created_by", "created_at")
    list_filter = ("segment", "urgent")
    search_fields = ("title", "message")


@admin.register(ReadConfirmation)
class ReadConfirmationAdmin(admin.ModelAdmin):
    list_display = ("announcement", "resident", "confirmed_at")
