from providers.models import Evidence, Provider


class ProviderRepository:
    def all(self):
        return Provider.objects.all()

    def filter_by_user(self, user):
        return Provider.objects.filter(user=user)

    def create(self, **data):
        return Provider.objects.create(**data)


class EvidenceRepository:
    def all(self):
        return Evidence.objects.all()

    def filter_by_provider_user(self, user):
        return Evidence.objects.filter(ticket__provider__user=user)

    def filter_by_resident(self, user):
        return Evidence.objects.filter(ticket__resident=user)

    def create(self, **data):
        return Evidence.objects.create(**data)
