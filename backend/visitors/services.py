from core.services import audit_on_create
from users.models import User
from visitors.models import Visitor
from visitors.repositories import AccessLogRepository, VisitorRepository


class VisitorNotFound(Exception):
    pass


class VisitorTokenInvalid(Exception):
    pass


class VisitorService:
    def __init__(
        self,
        repo: VisitorRepository | None = None,
        access_log_repo: AccessLogRepository | None = None,
    ):
        self.repo = repo or VisitorRepository()
        self.access_log_repo = access_log_repo or AccessLogRepository()

    def list_for_user(self, user):
        if user.role == User.Role.RESIDENT:
            return self.repo.filter_by_block_apartment(user.block, user.apartment)
        if user.role in (User.Role.MANAGER, User.Role.DOORMAN):
            return self.repo.all()
        return Visitor.objects.none()

    def create(self, validated_data, user):
        return self.repo.create(**validated_data, **audit_on_create(user))

    def validate_token(self, token, direction, actor):
        try:
            visitor = self.repo.get_by_token(token)
        except Visitor.DoesNotExist:
            raise VisitorNotFound

        if not visitor.is_valid():
            raise VisitorTokenInvalid

        access_log = self.access_log_repo.create(
            visitor=visitor, direction=direction, registered_by=actor
        )
        return visitor, access_log
