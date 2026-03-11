"""
URL configuration for Report Platform.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API
    path('api/', include([
        path('auth/', include('rest_framework.urls')),
        path('accounts/', include('apps.accounts.urls')),
        path('organizations/', include('apps.organizations.urls')),
        path('templates/', include('apps.templates_app.urls')),
        path('reports/', include('apps.reports.urls')),
        path('data/', include('apps.data_collection.urls')),
        path('ai/', include('apps.ai_engine.urls')),
        path('export/', include('apps.export.urls')),
    ])),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)


# Admin site configuration
admin.site.site_header = 'منصة توليد التقارير'
admin.site.site_title = 'Report Platform'
admin.site.index_title = 'لوحة التحكم'
