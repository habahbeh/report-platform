"""
Export admin.
"""

from django.contrib import admin
from .models import ExportJob, ExportTemplate


@admin.register(ExportJob)
class ExportJobAdmin(admin.ModelAdmin):
    list_display = ['report', 'format', 'status', 'progress', 'created_at', 'completed_at']
    list_filter = ['format', 'status', 'created_at']
    search_fields = ['report__title']
    readonly_fields = ['created_at', 'started_at', 'completed_at']


@admin.register(ExportTemplate)
class ExportTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'page_size', 'orientation', 'is_default', 'is_active']
    list_filter = ['organization', 'is_default', 'is_active']
    search_fields = ['name', 'description']
