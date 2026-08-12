from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/users/", include("users.urls")),
    path("api/announcements/", include("announcements.urls")),
    path("api/packages/", include("packages.urls")),
    path("api/visitors/", include("visitors.urls")),
    path("api/tickets/", include("tickets.urls")),
    path("api/providers/", include("providers.urls")),
    path("api/reservations/", include("reservations.urls")),
    path("api/polls/", include("polls.urls")),
    path("api/finance/", include("finance.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
