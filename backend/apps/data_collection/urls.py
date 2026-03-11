"""
Data Collection URLs.
مسارات جمع البيانات
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('sources', views.DataSourceViewSet, basename='datasource')
router.register('requests', views.DataRequestViewSet, basename='datarequest')
router.register('files', views.DataFileViewSet, basename='datafile')
router.register('periods', views.DataCollectionPeriodViewSet, basename='period')
router.register('submissions', views.EntitySubmissionViewSet, basename='submission')
router.register('logs', views.ReviewLogViewSet, basename='reviewlog')

urlpatterns = [
    path('', include(router.urls)),
    # Statistics endpoint
    path('stats/', views.data_collection_stats, name='data-stats'),
    
    # Entity Portal (public access via token)
    path('entity-portal/<str:token>/', views.entity_portal_view, name='entity-portal'),
    path('entity-portal/<str:token>/upload/', views.entity_portal_upload, name='entity-portal-upload'),
    path('entity-portal/<str:token>/submit/', views.entity_portal_submit, name='entity-portal-submit'),
    
    # Previous Period Data
    path('periods/<int:period_id>/copy-previous/', views.copy_previous_period_values, name='copy-previous'),
    path('periods/<int:period_id>/import-previous/', views.import_previous_values_excel, name='import-previous'),
    path('periods/<int:period_id>/previous-template/', views.export_previous_template, name='previous-template'),
]
