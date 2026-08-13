from polls.models import Poll, PollOption, Vote


class PollRepository:
    def all(self):
        return Poll.objects.all()

    def create(self, **data):
        return Poll.objects.create(**data)

    def create_option(self, poll, **data):
        return PollOption.objects.create(poll=poll, **data)

    def get_option(self, poll, option_id):
        return poll.options.get(id=option_id)


class VoteRepository:
    def create(self, option, resident):
        vote = Vote(option=option, resident=resident)
        vote.clean()
        vote.save()
        return vote
