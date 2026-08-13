from users.repositories import UserRepository


class UserService:
    def __init__(self, repo: UserRepository | None = None):
        self.repo = repo or UserRepository()

    def list_all(self):
        return self.repo.all()

    def register(self, validated_data):
        validated_data = dict(validated_data)
        password = validated_data.pop("password")
        return self.repo.create(password=password, **validated_data)
