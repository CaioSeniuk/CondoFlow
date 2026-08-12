from rest_framework.routers import DefaultRouter

from packages.views import PackageViewSet

router = DefaultRouter()
router.register("", PackageViewSet, basename="package")

urlpatterns = router.urls
