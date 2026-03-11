"""
Report and Project URLs.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from . import views
from .models import ReportSection

# Main router for new system
router = DefaultRouter()
router.register('projects', views.ProjectViewSet, basename='project')
router.register('contributors', views.ContributorViewSet, basename='contributor')
router.register('responses', views.ResponseViewSet, basename='response')
router.register('axis-drafts', views.AxisDraftViewSet, basename='axis-draft')
router.register('item-drafts', views.ItemDraftViewSet, basename='item-draft')
router.register('attachments', views.DraftAttachmentViewSet, basename='attachment')
router.register('output-templates', views.OutputTemplateViewSet, basename='output-template')

# Legacy router
legacy_router = DefaultRouter()
legacy_router.register('legacy', views.ReportViewSet, basename='report')


@api_view(['PATCH'])
@permission_classes([AllowAny])
def update_section(request, report_id, section_id):
    """Update a report section (legacy)"""
    try:
        section = ReportSection.objects.get(id=section_id, report_id=report_id)
        
        if 'content' in request.data:
            section.content = request.data['content']
        if 'status' in request.data:
            section.status = request.data['status']
        
        section.save()
        
        return Response({
            'id': section.id,
            'title': section.title,
            'status': section.status,
            'content': section.content,
        })
    except ReportSection.DoesNotExist:
        return Response({'error': 'Section not found'}, status=404)


urlpatterns = [
    # === تصدير التقارير === (MUST be before router to avoid conflicts)
    # تصدير التقرير إلى Word/PDF
    path('periods/<int:period_id>/export/', views.export_report, name='export-report'),
    
    # معاينة محتوى التقرير
    path('periods/<int:period_id>/export/preview/', views.export_preview, name='export-preview'),
    
    # === توليد التقارير ===
    # توليد محاور (واحد أو أكثر أو الكل)
    path('generate/', views.generate_report, name='generate-report'),
    
    # توليد بنود (واحد أو أكثر أو كل بنود محور)
    path('generate-items/', views.generate_items, name='generate-items'),
    
    # مسودات المحاور لفترة معينة
    path('periods/<int:period_id>/drafts/', views.period_drafts, name='period-drafts'),
    
    # مسودات البنود لفترة معينة
    path('periods/<int:period_id>/item-drafts/', views.period_item_drafts, name='period-item-drafts'),
    
    # حالة التوليد لفترة معينة
    path('periods/<int:period_id>/generation-status/', views.generation_status, name='generation-status'),
    
    # === المرفقات والمحتوى اليدوي ===
    # مرفقات بند معين
    path('item-drafts/<uuid:draft_id>/attachments/', views.item_draft_attachments, name='item-draft-attachments'),
    
    # تحديث المحتوى اليدوي
    path('item-drafts/<uuid:draft_id>/manual-content/', views.update_manual_content, name='update-manual-content'),
    
    # سجل التعديلات
    path('item-drafts/<uuid:draft_id>/history/', views.draft_history, {'draft_type': 'item'}, name='item-draft-history'),
    path('axis-drafts/<uuid:draft_id>/history/', views.draft_history, {'draft_type': 'axis'}, name='axis-draft-history'),
    
    # === إعدادات المخرجات ===
    # إعدادات بند واحد
    path('item-drafts/<uuid:draft_id>/output-config/', views.get_item_output_config, name='get-item-output-config'),
    path('item-drafts/<uuid:draft_id>/output-config/set/', views.set_item_output_config, name='set-item-output-config'),
    
    # إعدادات عدة بنود
    path('item-drafts/bulk-output-config/', views.set_bulk_output_config, name='bulk-output-config'),
    
    # === بيانات السنة السابقة ===
    # تحميل قالب Excel
    path('periods/<int:period_id>/previous-data/template/', views.previous_data_template, name='previous-data-template'),
    
    # استيراد من Excel
    path('periods/<int:period_id>/previous-data/import/', views.import_previous_data, name='import-previous-data'),
    
    # تصدير البيانات (مقارنة)
    path('periods/<int:period_id>/previous-data/export/', views.export_previous_data, name='export-previous-data'),
    
    # سحب من الفترة السابقة تلقائياً
    path('periods/<int:period_id>/previous-data/pull/', views.pull_previous_period_data, name='pull-previous-data'),
    
    # New system endpoints (router)
    path('', include(router.urls)),
    
    # Contribute endpoints (public - no auth)
    path('contribute/<str:token>/', views.contribute_form, name='contribute-form'),
    path('contribute/<str:token>/save/', views.contribute_save, name='contribute-save'),
    path('contribute/<str:token>/submit/', views.contribute_submit, name='contribute-submit'),
    path('contribute/<str:token>/upload/', views.contribute_upload, name='contribute-upload'),
    
    # Legacy endpoints
    path('legacy/<int:report_id>/sections/<int:section_id>/', update_section, name='update-section'),
    path('', include(legacy_router.urls)),
]
