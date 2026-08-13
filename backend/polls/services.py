from core.services import audit_on_create
from polls.models import Poll
from polls.repositories import PollRepository, VoteRepository
from users.models import User


class PollService:
    def __init__(
        self,
        repo: PollRepository | None = None,
        vote_repo: VoteRepository | None = None,
    ):
        self.repo = repo or PollRepository()
        self.vote_repo = vote_repo or VoteRepository()

    def list_for_user(self, user):
        if user.role in (User.Role.RESIDENT, User.Role.MANAGER):
            return self.repo.all()
        return Poll.objects.none()

    def create_poll(self, validated_data, user):
        validated_data = dict(validated_data)
        options_data = validated_data.pop("options")
        poll = self.repo.create(**validated_data, **audit_on_create(user))
        for option_data in options_data:
            self.repo.create_option(poll, **option_data)
        return poll

    def vote(self, poll, option_id, resident):
        option = self.repo.get_option(poll, option_id)
        return self.vote_repo.create(option, resident)
