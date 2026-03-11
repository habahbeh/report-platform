"""
Export URLs.
"""

from django.urls import path
from . import views

urlpatterns = [
    # Legacy (Report model)
    path('<int:report_id>/export/', views.export_report_view, name='export'),
    path('<int:report_id>/preview/', views.preview_report_view, name='preview'),
    
    # New (DataCollectionPeriod)
    path('period/<int:period_id>/html/', views.generate_period_html_view, name='period-html'),
    path('period/<int:period_id>/item/<int:item_id>/preview/', views.preview_item_html_view, name='item-preview'),
]
