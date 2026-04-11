"""
Report and Project URLs.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from . import views

# Main router
router = DefaultRouter()
router.register('projects', views.ProjectViewSet, basename='project')
router.register('contributors', views.ContributorViewSet, basename='contributor')
router.register('responses', views.ResponseViewSet, basename='response')
router.register('structures', views.ItemStructureViewSet, basename='item-structure')
router.register('generated-contents', views.GeneratedContentViewSet, basename='generated-content')
router.register('table-data', views.TableDataViewSet, basename='table-data')


urlpatterns = [
    # === Skeleton-First Workflow ===
    path('build-skeleton/', views.build_skeleton, name='build-skeleton'),
    path('generate-text/', views.generate_text, name='generate-text'),
    path('projects/<uuid:project_id>/skeleton-status/', views.project_skeleton_status, name='skeleton-status'),
    path('analyze-report/', views.analyze_previous_report, name='analyze-report'),

    # Router endpoints
    path('', include(router.urls)),

    # Contribute endpoints (public - no auth)
    path('contribute/<str:token>/', views.contribute_form, name='contribute-form'),
    path('contribute/<str:token>/save/', views.contribute_save, name='contribute-save'),
    path('contribute/<str:token>/submit/', views.contribute_submit, name='contribute-submit'),
    path('contribute/<str:token>/upload/', views.contribute_upload, name='contribute-upload'),
    path('contribute/<str:token>/excel-template/<int:item_id>/', views.contribute_excel_template, name='contribute-excel-template'),
]
