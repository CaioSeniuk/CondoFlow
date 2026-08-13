from rest_framework.routers import DefaultRouter

from visitors.api.views import AccessLogViewSet, VisitorViewSet

router = DefaultRouter()
router.register("access-logs", AccessLogViewSet, basename="accesslog")
router.register("", VisitorViewSet, basename="visitor")

urlpatterns = router.urls
