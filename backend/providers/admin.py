from django.contrib import admin

from providers.models import Evidence, Provider


@admin.register(Provider)
class ProviderAdmin(admin.ModelAdmin):
    list_display = ("name", "contract_number", "contact", "user")
    search_fields = ("name", "contract_number")


@admin.register(Evidence)
class EvidenceAdmin(admin.ModelAdmin):
    list_display = ("ticket", "created_by", "created_at")
