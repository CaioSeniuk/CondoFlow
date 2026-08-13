from visitors.models import AccessLog, Visitor


class VisitorRepository:
    def all(self):
        return Visitor.objects.all()

    def filter_by_block_apartment(self, block, apartment):
        return Visitor.objects.filter(block=block, apartment=apartment)

    def create(self, **data):
        return Visitor.objects.create(**data)

    def get_by_token(self, token):
        return Visitor.objects.get(token=token)


class AccessLogRepository:
    def all(self):
        return AccessLog.objects.all()

    def create(self, **data):
        return AccessLog.objects.create(**data)
