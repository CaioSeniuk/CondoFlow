from django.contrib import admin

from reservations.models import CommonArea, Reservation


@admin.register(CommonArea)
class CommonAreaAdmin(admin.ModelAdmin):
    list_display = ("name",)


@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = ("common_area", "resident", "start_time", "end_time", "status")
    list_filter = ("status", "common_area")
