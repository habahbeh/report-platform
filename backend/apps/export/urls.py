"""
Export API URLs
"""

from django.urls import path
from .views import (
    GenerateItemReportView, 
    DownloadReportView, 
    ListItemsView,
    GenerateFullReportView,
)

app_name = 'export'

urlpatterns = [
    path('items/', ListItemsView.as_view(), name='list-items'),
    path('generate/', GenerateItemReportView.as_view(), name='generate'),
    path('generate-full/', GenerateFullReportView.as_view(), name='generate-full'),
    path('download/<str:project_id>/<str:filename>/', DownloadReportView.as_view(), name='download'),
]
