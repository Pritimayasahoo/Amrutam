from django.urls import path
from audit.views import system_overview_view, all_consultations_view, all_users_view, system_logs_view

urlpatterns = [
    path('system-overview/', system_overview_view, name='system_overview'),
    path('all-consultations/', all_consultations_view, name='all_consultations'),
    path('all-users/', all_users_view, name='all_users'),
    path('system-logs/', system_logs_view, name='system_logs'),
]
