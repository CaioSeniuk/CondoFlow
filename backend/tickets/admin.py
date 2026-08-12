from django.contrib import admin

from tickets.models import StatusHistory, Ticket


class StatusHistoryInline(admin.TabularInline):
    model = StatusHistory
    extra = 0
    readonly_fields = ("status", "changed_by", "changed_at", "note")


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ("category", "resident", "status", "urgency", "provider", "created_at")
    list_filter = ("status", "urgency", "category")
    search_fields = ("category", "location", "description")
    inlines = [StatusHistoryInline]
