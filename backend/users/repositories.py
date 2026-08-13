from users.models import User


class UserRepository:
    def all(self):
        return User.objects.all().order_by("first_name")

    def create(self, password, **data):
        user = User(**data)
        user.set_password(password)
        user.save()
        return user
