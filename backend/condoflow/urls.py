from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    path("api/v1/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/users/", include("users.api.urls")),
    path("api/v1/announcements/", include("announcements.api.urls")),
    path("api/v1/packages/", include("packages.api.urls")),
    path("api/v1/visitors/", include("visitors.api.urls")),
    path("api/v1/tickets/", include("tickets.api.urls")),
    path("api/v1/providers/", include("providers.api.urls")),
    path("api/v1/reservations/", include("reservations.api.urls")),
    path("api/v1/polls/", include("polls.api.urls")),
    path("api/v1/finance/", include("finance.api.urls")),
]
