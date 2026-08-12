from django.contrib import admin

from polls.models import Poll, PollOption, Vote


class PollOptionInline(admin.TabularInline):
    model = PollOption
    extra = 1


@admin.register(Poll)
class PollAdmin(admin.ModelAdmin):
    list_display = ("question", "closes_at", "created_at")
    inlines = [PollOptionInline]


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    list_display = ("option", "resident", "voted_at")
