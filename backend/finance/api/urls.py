from rest_framework.routers import DefaultRouter

from finance.api.views import ExpenseCategoryViewSet, ExpenseViewSet

router = DefaultRouter()
router.register("categories", ExpenseCategoryViewSet, basename="expensecategory")
router.register("", ExpenseViewSet, basename="expense")

urlpatterns = router.urls
