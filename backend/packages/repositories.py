from packages.models import Package


class PackageRepository:
    def all(self):
        return Package.objects.all()

    def filter_by_block_apartment(self, block, apartment):
        return Package.objects.filter(block=block, apartment=apartment)

    def create(self, **data):
        return Package.objects.create(**data)

    def save(self, package):
        package.save()
        return package
