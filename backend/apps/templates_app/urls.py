"""
Template URLs.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('templates', views.TemplateViewSet, basename='template')
router.register('axes', views.AxisViewSet, basename='axis')
router.register('items', views.ItemViewSet, basename='item')
router.register('entities', views.EntityViewSet, basename='entity')
router.register('table-definitions', views.TableDefinitionViewSet, basename='table-definition')
router.register('chart-definitions', views.ChartDefinitionViewSet, basename='chart-definition')
router.register('item-components', views.ItemComponentViewSet, basename='item-component')

# Legacy
router.register('sections', views.TemplateSectionViewSet, basename='section')

urlpatterns = [
    path('', include(router.urls)),
]
