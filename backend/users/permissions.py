from rest_framework.permissions import SAFE_METHODS, BasePermission

from users.models import User


class HasRole(BasePermission):
    """Base permission: only grants access to authenticated users whose
    role is in `allowed_roles`. Subclasses define the allowed role(s)."""

    allowed_roles: tuple[str, ...] = ()

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in self.allowed_roles
        )


class IsResident(HasRole):
    allowed_roles = (User.Role.RESIDENT,)


class IsManager(HasRole):
    allowed_roles = (User.Role.MANAGER,)


class IsDoorman(HasRole):
    allowed_roles = (User.Role.DOORMAN,)


class IsProvider(HasRole):
    allowed_roles = (User.Role.PROVIDER,)


class IsManagerOrDoorman(HasRole):
    allowed_roles = (User.Role.MANAGER, User.Role.DOORMAN)


class IsManagerOrReadOnly(BasePermission):
    """Any authenticated user can read; only the property manager can
    create/update/delete."""

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role == User.Role.MANAGER
