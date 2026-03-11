"""
AI Engine URLs.
"""

from django.urls import path
from . import views

urlpatterns = [
    path('generate/', views.generate_custom, name='ai-generate'),
    path('generate/test/', views.generate_test, name='ai-generate-test'),
    path('generate/custom/', views.generate_custom, name='ai-generate-custom'),
    path('generate/intro/', views.generate_intro_view, name='ai-generate-intro'),
    path('generate/research/', views.generate_research_view, name='ai-generate-research'),
    path('generate/conclusion/', views.generate_conclusion_view, name='ai-generate-conclusion'),
    path('generate/section/<int:section_id>/', views.generate_report_section, name='ai-generate-section'),
    path('generate/report/<int:report_id>/', views.generate_full_report, name='ai-generate-report'),
]
