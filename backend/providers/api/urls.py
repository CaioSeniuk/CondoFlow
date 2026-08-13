from rest_framework.routers import DefaultRouter

from providers.api.views import EvidenceViewSet, ProviderViewSet

router = DefaultRouter()
router.register("evidences", EvidenceViewSet, basename="evidence")
router.register("", ProviderViewSet, basename="provider")

urlpatterns = router.urls
