from rest_framework.routers import DefaultRouter

from announcements.api.views import AnnouncementViewSet

router = DefaultRouter()
router.register("", AnnouncementViewSet, basename="announcement")

urlpatterns = router.urls
