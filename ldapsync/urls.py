from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r"sync-logs", views.SyncLogViewSet)
router.register(r"ldap-mappings", views.LDAPMappingViewSet)

urlpatterns = [
    path("", include(router.urls)),
    path("sync/trigger/", views.trigger_sync, name="ldap-sync-trigger"),
    path("sync/status/", views.ldap_status, name="ldap-status"),
]
