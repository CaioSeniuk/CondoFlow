from rest_framework.routers import DefaultRouter

from reservations.api.views import CommonAreaViewSet, ReservationViewSet

router = DefaultRouter()
router.register("common-areas", CommonAreaViewSet, basename="commonarea")
router.register("", ReservationViewSet, basename="reservation")

urlpatterns = router.urls
