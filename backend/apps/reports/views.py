"""
Report and Project views.
"""

from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response as DRFResponse
from rest_framework.parsers import MultiPartParser, FormParser

from apps.templates_app.models import Item
from .models import (
    Project, Contributor, Response, TableData, GeneratedReport,
    Report, ReportSection, ReportImage, ReportChart,
    OutputTemplate, OutputComponent, ItemDraft
)
from .serializers import (
    ProjectSerializer, ProjectDetailSerializer, ProjectCreateSerializer,
    ProjectStatsSerializer, AggregatedDataSerializer,
    ContributorSerializer, ContributorDetailSerializer, ContributorFormSerializer,
    ResponseSerializer, ResponseCreateSerializer,
    TableDataSerializer, GeneratedReportSerializer,
    ReportSerializer, ReportDetailSerializer,
    ReportSectionSerializer, ReportImageSerializer,
    OutputTemplateSerializer, OutputTemplateCreateSerializer,
    OutputComponentSerializer, ItemOutputConfigSerializer, BulkOutputConfigSerializer
)


# ============================================
# Project ViewSet (New System)
# ============================================

class ProjectViewSet(viewsets.ModelViewSet):
    """API for Projects"""
    permission_classes = [permissions.AllowAny]  # For demo
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ProjectDetailSerializer
        if self.action == 'create':
            return ProjectCreateSerializer
        return ProjectSerializer
    
    def get_queryset(self):
        queryset = Project.objects.all()
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by organization
        org_id = self.request.query_params.get('organization')
        if org_id:
            queryset = queryset.filter(organization_id=org_id)
        
        # Filter by template
        template_id = self.request.query_params.get('template')
        if template_id:
            queryset = queryset.filter(template_id=template_id)
        
        return queryset.select_related('template', 'organization')
    
    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get project statistics"""
        project = self.get_object()
        
        total_items = Item.objects.filter(axis__template=project.template).count()
        completed_items = project.responses.values('item').distinct().count()
        
        contributors = project.contributors.all()
        
        data = {
            'total_items': total_items,
            'completed_items': completed_items,
            'items_progress': project.items_progress,
            
            'total_contributors': contributors.count(),
            'contributors_completed': contributors.filter(status='completed').count(),
            'contributors_in_progress': contributors.filter(status='in_progress').count(),
            'contributors_pending': contributors.filter(status__in=['pending', 'invited']).count(),
            
            'deadline': project.deadline,
            'days_remaining': project.days_remaining,
            'status': project.status,
        }
        
        return DRFResponse(data)
    
    @action(detail=True, methods=['get'])
    def contributors(self, request, pk=None):
        """List project contributors"""
        project = self.get_object()
        contributors = project.contributors.all()
        serializer = ContributorSerializer(contributors, many=True)
        return DRFResponse(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_contributor(self, request, pk=None):
        """Add a contributor to the project"""
        project = self.get_object()
        
        serializer = ContributorSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(project=project)
            return DRFResponse(serializer.data, status=status.HTTP_201_CREATED)
        return DRFResponse(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def invite(self, request, pk=None):
        """Send invitations to contributors"""
        project = self.get_object()
        
        contributor_ids = request.data.get('contributor_ids', 'all')
        
        if contributor_ids == 'all':
            contributors = project.contributors.filter(status='pending')
        else:
            contributors = project.contributors.filter(id__in=contributor_ids)
        
        # Update status and sent time
        now = timezone.now()
        for contributor in contributors:
            contributor.status = 'invited'
            contributor.invite_sent_at = now
            contributor.save(update_fields=['status', 'invite_sent_at'])
        
        # TODO: Actually send emails
        
        return DRFResponse({
            'status': 'success',
            'message': f'تم إرسال {contributors.count()} دعوة',
            'invited_count': contributors.count()
        })
    
    @action(detail=True, methods=['post'])
    def remind(self, request, pk=None):
        """Send reminders to incomplete contributors"""
        project = self.get_object()
        
        contributor_ids = request.data.get('contributor_ids', 'incomplete')
        
        if contributor_ids == 'incomplete':
            contributors = project.contributors.exclude(status='completed')
        else:
            contributors = project.contributors.filter(id__in=contributor_ids)
        
        now = timezone.now()
        for contributor in contributors:
            contributor.last_reminder_at = now
            contributor.reminder_count += 1
            contributor.save(update_fields=['last_reminder_at', 'reminder_count'])
        
        # TODO: Actually send reminder emails
        
        return DRFResponse({
            'status': 'success',
            'message': f'تم إرسال {contributors.count()} تذكير'
        })
    
    @action(detail=True, methods=['get'])
    def aggregated(self, request, pk=None):
        """Get aggregated data for all items"""
        project = self.get_object()
        
        items_data = []
        for axis in project.template.axes.all():
            for item in axis.items.all():
                responses = project.responses.filter(item=item)
                
                # Aggregate based on item's aggregation type
                if responses.exists():
                    if item.aggregation == 'sum':
                        value = sum(r.get_simple_value() or 0 for r in responses)
                    elif item.aggregation == 'average':
                        values = [r.get_simple_value() for r in responses if r.get_simple_value()]
                        value = sum(values) / len(values) if values else 0
                    elif item.aggregation == 'count':
                        value = responses.count()
                    elif item.aggregation == 'latest':
                        value = responses.order_by('-updated_at').first().get_simple_value()
                    else:
                        # Default: take first response
                        value = responses.first().get_simple_value()
                else:
                    value = None
                
                items_data.append({
                    'id': str(item.id),
                    'code': item.code,
                    'name': item.name,
                    'axis': axis.name,
                    'value': value,
                    'unit': item.unit,
                    'field_type': item.field_type,
                    'responses_count': responses.count(),
                })
        
        return DRFResponse({
            'items': items_data,
            'tables': [],  # TODO: Add table data
            'completeness': {
                'items': project.items_progress,
                'contributors': project.progress,
            }
        })
    
    @action(detail=True, methods=['post'])
    def generate(self, request, pk=None):
        """Generate the final report"""
        import threading
        from django.core.files.base import ContentFile
        from apps.export.services import (
            export_project_to_word, export_project_to_pdf, 
            get_project_export_filename
        )
        
        project = self.get_object()
        
        format_type = request.data.get('format', 'docx')
        options = request.data.get('options', {})
        
        # Create GeneratedReport record
        generated_report = GeneratedReport.objects.create(
            project=project,
            format=format_type,
            options=options,
            status='processing',
            current_step='بدء التوليد',
            created_by=request.user if request.user.is_authenticated else None
        )
        
        project.status = 'generating'
        project.save(update_fields=['status'])
        
        def do_generate():
            try:
                if format_type == 'pdf':
                    buffer = export_project_to_pdf(project, generated_report)
                    if buffer is None:
                        generated_report.status = 'failed'
                        generated_report.error_message = 'PDF غير متاح - WeasyPrint غير مثبت'
                        generated_report.save()
                        return
                else:
                    buffer = export_project_to_word(project, generated_report)
                
                # Save file
                filename = get_project_export_filename(project, format_type)
                generated_report.file.save(filename, ContentFile(buffer.getvalue()))
                generated_report.file_size = len(buffer.getvalue())
                generated_report.status = 'completed'
                generated_report.completed_at = timezone.now()
                generated_report.save()
                
                # Update project status
                project.status = 'published'
                project.published_at = timezone.now()
                project.save(update_fields=['status', 'published_at'])
                
            except Exception as e:
                generated_report.status = 'failed'
                generated_report.error_message = str(e)
                generated_report.save()
        
        # Run in background thread (for demo - use Celery in production)
        thread = threading.Thread(target=do_generate)
        thread.start()
        
        return DRFResponse({
            'status': 'started',
            'report_id': str(generated_report.id),
            'message': 'بدأ توليد التقرير'
        })
    
    @action(detail=True, methods=['get'], url_path='generate-status/(?P<report_id>[^/.]+)')
    def generate_status(self, request, pk=None, report_id=None):
        """Check generation status"""
        try:
            generated_report = GeneratedReport.objects.get(id=report_id, project_id=pk)
            from .serializers import GeneratedReportSerializer
            serializer = GeneratedReportSerializer(generated_report, context={'request': request})
            return DRFResponse(serializer.data)
        except GeneratedReport.DoesNotExist:
            return DRFResponse({'error': 'التقرير غير موجود'}, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['get'])
    def reports(self, request, pk=None):
        """List generated reports"""
        project = self.get_object()
        reports = project.generated_reports.all()
        serializer = GeneratedReportSerializer(reports, many=True)
        return DRFResponse(serializer.data)


# ============================================
# Contributor ViewSet
# ============================================

class ContributorViewSet(viewsets.ModelViewSet):
    """API for Contributors"""
    serializer_class = ContributorSerializer
    permission_classes = [permissions.AllowAny]  # For demo
    
    def get_queryset(self):
        return Contributor.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ContributorDetailSerializer
        return ContributorSerializer
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve contributor's submission"""
        contributor = self.get_object()
        contributor.status = 'completed'
        contributor.save(update_fields=['status'])
        return DRFResponse({'status': 'approved'})
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject contributor's submission"""
        contributor = self.get_object()
        contributor.status = 'rejected'
        contributor.rejection_reason = request.data.get('reason', '')
        contributor.save(update_fields=['status', 'rejection_reason'])
        return DRFResponse({'status': 'rejected'})


# ============================================
# Public Contribute API (No Auth Required)
# ============================================

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def contribute_form(request, token):
    """
    Get the form for a contributor (public access via token).
    Returns the items they need to fill.
    """
    contributor = get_object_or_404(Contributor, invite_token=token)
    
    # Mark as accessed
    contributor.mark_accessed()
    
    # Get items for this contributor's entity
    items = contributor.entity.items.all().order_by('axis__order', 'order')
    
    # Get existing responses
    responses = contributor.responses.all()
    
    # Serialize items
    from apps.templates_app.serializers import ItemDetailSerializer
    items_data = ItemDetailSerializer(items, many=True).data
    responses_data = ResponseSerializer(responses, many=True).data
    
    # Get structure-derived data requirements (if structures exist)
    structure_hints = {}
    try:
        structures = ItemStructure.objects.filter(
            project=contributor.project,
            item__in=items
        ).select_related('item')
        for structure in structures:
            hints = []
            for comp in (structure.components or []):
                comp_type = comp.get('type', '')
                if comp_type == 'table':
                    hints.append({
                        'id': comp.get('id'),
                        'type': 'table',
                        'title': comp.get('title', ''),
                        'columns': comp.get('columns', []),
                        'suggested_input': 'table_dynamic',
                    })
                elif comp_type == 'chart':
                    hints.append({
                        'id': comp.get('id'),
                        'type': 'chart_data',
                        'title': comp.get('title', ''),
                        'chart_type': comp.get('chart_type', 'pie'),
                        'suggested_input': 'table_dynamic',
                    })
            if hints:
                structure_hints[structure.item_id] = {
                    'structure_id': str(structure.id),
                    'data_fields': hints,
                    'has_tables': any(h['type'] == 'table' for h in hints),
                    'has_charts': any(h['type'] == 'chart_data' for h in hints),
                }
    except Exception:
        pass

    return DRFResponse({
        'project': {
            'id': str(contributor.project.id),
            'name': contributor.project.name,
            'period': contributor.project.period,
            'deadline': contributor.project.deadline,
        },
        'organization': {
            'name': contributor.project.organization.name,
        },
        'entity': {
            'id': contributor.entity.id,
            'name': contributor.entity.name,
        },
        'contributor': {
            'id': str(contributor.id),
            'name': contributor.name,
            'status': contributor.status,
        },
        'items': items_data,
        'responses': responses_data,
        'progress': contributor.progress,
        'items_count': contributor.items_count,
        'completed_count': contributor.completed_items_count,
        'structure_hints': structure_hints,
    })


@api_view(['POST', 'PATCH'])
@permission_classes([permissions.AllowAny])
def contribute_save(request, token):
    """
    Save responses for a contributor (auto-save).
    Accepts a list of responses.
    """
    contributor = get_object_or_404(Contributor, invite_token=token)
    
    # Mark as accessed
    contributor.mark_accessed()
    
    responses_data = request.data.get('responses', [])
    
    saved_responses = []
    for response_data in responses_data:
        item_id = response_data.get('item_id') or response_data.get('item')
        value = response_data.get('value')
        attachments = response_data.get('attachments', [])
        
        if not item_id:
            continue
        
        # Verify item belongs to this entity
        try:
            item = contributor.entity.items.get(id=item_id)
        except Item.DoesNotExist:
            continue
        
        # Create or update response
        response, created = Response.objects.update_or_create(
            project=contributor.project,
            contributor=contributor,
            item=item,
            defaults={
                'value': {'value': value} if not isinstance(value, dict) else value,
                'attachments': attachments,
            }
        )
        saved_responses.append(response)
    
    # Update contributor status
    if contributor.progress == 100:
        contributor.status = 'submitted'
    else:
        contributor.status = 'in_progress'
    contributor.save(update_fields=['status'])
    
    return DRFResponse({
        'status': 'saved',
        'saved_count': len(saved_responses),
        'progress': contributor.progress,
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def contribute_submit(request, token):
    """
    Submit the form (mark as complete).
    """
    contributor = get_object_or_404(Contributor, invite_token=token)
    
    contributor.status = 'submitted'
    contributor.submitted_at = timezone.now()
    contributor.save(update_fields=['status', 'submitted_at'])
    
    return DRFResponse({
        'status': 'submitted',
        'message': 'تم إرسال البيانات بنجاح'
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def contribute_upload(request, token):
    """
    Upload an Excel file and parse it into Response objects.
    Supports .xlsx and .xls files.

    POST /api/reports/contribute/<token>/upload/
    FormData: file, item_id
    """
    contributor = get_object_or_404(Contributor, invite_token=token)

    if contributor.status in ('submitted', 'completed'):
        return DRFResponse(
            {'error': 'تم إرسال البيانات مسبقاً'},
            status=status.HTTP_400_BAD_REQUEST
        )

    item_id = request.data.get('item_id')
    file = request.FILES.get('file')

    if not file:
        return DRFResponse(
            {'error': 'لم يتم تحديد ملف'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not item_id:
        return DRFResponse(
            {'error': 'لم يتم تحديد البند'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        item = Item.objects.get(id=item_id)
    except Item.DoesNotExist:
        return DRFResponse(
            {'error': 'البند غير موجود'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Parse Excel file
    if file.name.endswith(('.xlsx', '.xls')):
        try:
            import openpyxl
            wb = openpyxl.load_workbook(file, read_only=True, data_only=True)
            ws = wb.active

            rows = []
            headers = []
            for row_idx, row in enumerate(ws.iter_rows(values_only=True)):
                if row_idx == 0:
                    headers = [str(cell) if cell else f'col_{i}' for i, cell in enumerate(row)]
                    continue
                if any(cell is not None for cell in row):
                    row_data = {}
                    for col_idx, cell in enumerate(row):
                        key = headers[col_idx] if col_idx < len(headers) else f'col_{col_idx}'
                        row_data[key] = cell
                    rows.append(row_data)

            wb.close()

            # Save as Response
            value_data = {'rows': rows, 'headers': headers, 'source': 'excel', 'filename': file.name}
            response_obj, created = Response.objects.update_or_create(
                project=contributor.project,
                contributor=contributor,
                item=item,
                defaults={
                    'value': value_data,
                    'attachments': [{'filename': file.name, 'size': file.size, 'type': 'excel'}]
                }
            )

            return DRFResponse({
                'status': 'uploaded',
                'filename': file.name,
                'size': file.size,
                'rows_count': len(rows),
                'headers': headers,
                'preview': rows[:5],
                'response_id': str(response_obj.id),
            })

        except Exception as e:
            return DRFResponse(
                {'error': f'فشل في قراءة الملف: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    else:
        # Non-Excel file: store as attachment reference
        response_obj, created = Response.objects.update_or_create(
            project=contributor.project,
            contributor=contributor,
            item=item,
            defaults={
                'value': {'value': file.name, 'source': 'file'},
                'attachments': [{'filename': file.name, 'size': file.size}]
            }
        )

        return DRFResponse({
            'status': 'uploaded',
            'filename': file.name,
            'size': file.size,
            'response_id': str(response_obj.id),
        })


# ============================================
# Response ViewSet
# ============================================

class ResponseViewSet(viewsets.ModelViewSet):
    """API for Responses"""
    serializer_class = ResponseSerializer
    permission_classes = [permissions.AllowAny]  # For demo
    
    def get_queryset(self):
        queryset = Response.objects.all()
        
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        contributor_id = self.request.query_params.get('contributor')
        if contributor_id:
            queryset = queryset.filter(contributor_id=contributor_id)
        
        item_id = self.request.query_params.get('item')
        if item_id:
            queryset = queryset.filter(item_id=item_id)
        
        return queryset


# ============================================
# Legacy Report ViewSet
# ============================================

class ReportViewSet(viewsets.ModelViewSet):
    """API for Reports (Legacy)"""
    permission_classes = [permissions.AllowAny]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ReportDetailSerializer
        return ReportSerializer
    
    def get_queryset(self):
        queryset = Report.objects.all()
        
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        org_id = self.request.query_params.get('organization')
        if org_id:
            queryset = queryset.filter(organization_id=org_id)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['get'])
    def sections(self, request, pk=None):
        report = self.get_object()
        sections = report.sections.all()
        serializer = ReportSectionSerializer(sections, many=True)
        return DRFResponse(serializer.data)
    
    @action(detail=True, methods=['post'])
    def generate(self, request, pk=None):
        report = self.get_object()
        report.status = 'generating'
        report.save()
        
        return DRFResponse({
            'status': 'started',
            'message': 'بدأ توليد التقرير'
        })
    
    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        report = self.get_object()
        return DRFResponse({
            'status': report.status,
            'progress': report.progress,
            'sections': ReportSectionSerializer(report.sections.all(), many=True).data
        })


# ============================================
# AxisDraft ViewSet - توليد المحاور
# ============================================

from .models import AxisDraft, ItemDraft
from .serializers import (
    AxisDraftSerializer, AxisDraftEditSerializer,
    GenerateRequestSerializer, GenerateResponseSerializer,
    GenerateProjectRequestSerializer,
    ItemDraftSerializer, ItemDraftEditSerializer,
    GenerateItemsRequestSerializer
)
from .generation_service import (
    GenerationService,
    ProjectGenerationService,
    get_or_create_all_drafts,
    get_period_generation_status,
    get_or_create_item_drafts,
    get_or_create_project_drafts,
    get_project_generation_status,
    DEFAULT_AI_MODEL
)


class AxisDraftViewSet(viewsets.ModelViewSet):
    """
    API لمسودات المحاور
    
    GET /api/axis-drafts/?period_id=X — قائمة مسودات فترة معينة
    GET /api/axis-drafts/{id}/ — تفاصيل مسودة
    PATCH /api/axis-drafts/{id}/ — تعديل المحتوى
    POST /api/axis-drafts/{id}/approve/ — اعتماد
    POST /api/axis-drafts/{id}/revert/ — التراجع للنسخة السابقة
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = AxisDraftSerializer
    
    def get_queryset(self):
        queryset = AxisDraft.objects.all()
        
        # Filter by period (required)
        period_id = self.request.query_params.get('period_id')
        if period_id:
            queryset = queryset.filter(period_id=period_id)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.select_related('axis', 'period').order_by('axis__order')
    
    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return AxisDraftEditSerializer
        return AxisDraftSerializer
    
    def perform_update(self, serializer):
        """تعديل المحتوى"""
        instance = serializer.instance
        new_content = serializer.validated_data.get('content')
        
        if new_content and new_content != instance.content:
            instance.edit(new_content, user=self.request.user)
        else:
            serializer.save()
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """اعتماد المسودة"""
        draft = self.get_object()
        
        if draft.status not in ['generated', 'edited']:
            return DRFResponse(
                {'error': 'لا يمكن اعتماد مسودة لم تُولّد بعد'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        draft.approve(user=request.user)
        
        return DRFResponse({
            'status': 'success',
            'message': f'تم اعتماد محور "{draft.axis.name}"',
            'draft': AxisDraftSerializer(draft).data
        })
    
    @action(detail=True, methods=['post'])
    def revert(self, request, pk=None):
        """التراجع للمحتوى السابق"""
        draft = self.get_object()
        
        if not draft.previous_content:
            return DRFResponse(
                {'error': 'لا توجد نسخة سابقة للتراجع إليها'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        success = draft.revert()
        
        if success:
            return DRFResponse({
                'status': 'success',
                'message': 'تم التراجع للنسخة السابقة',
                'draft': AxisDraftSerializer(draft).data
            })
        
        return DRFResponse(
            {'error': 'فشل التراجع'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=True, methods=['post'])
    def regenerate(self, request, pk=None):
        """إعادة توليد محور واحد"""
        draft = self.get_object()
        model = request.data.get('model', 'gemini')
        
        service = GenerationService(draft.period, model=model)
        
        try:
            result = service._generate_single_axis(
                draft.axis,
                regenerate=True,
                user=request.user
            )
            
            return DRFResponse({
                'status': 'success',
                'message': f'تم إعادة توليد محور "{draft.axis.name}"',
                'draft': AxisDraftSerializer(result).data
            })
        except Exception as e:
            return DRFResponse(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def period_drafts(request, period_id):
    """
    الحصول على كل مسودات فترة معينة مع إنشائها إن لم تكن موجودة
    
    GET /api/periods/{period_id}/drafts/
    """
    from apps.data_collection.models import DataCollectionPeriod
    
    try:
        period = DataCollectionPeriod.objects.get(id=period_id)
    except DataCollectionPeriod.DoesNotExist:
        return DRFResponse(
            {'error': 'فترة الجمع غير موجودة'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # إنشاء المسودات إن لم تكن موجودة
    drafts = get_or_create_all_drafts(period)
    
    # حالة التوليد
    gen_status = get_period_generation_status(period)
    
    return DRFResponse({
        'period': {
            'id': period.id,
            'name': period.name,
            'academic_year': period.academic_year,
        },
        'generation_status': gen_status,
        'drafts': AxisDraftSerializer(drafts, many=True).data
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def generate_report(request):
    """
    توليد التقرير — محور واحد أو عدة محاور أو الكل
    
    POST /api/generate/
    {
        "period_id": 1,
        "axes": [1, 2, 3],  // أو فارغة للكل
        "model": "gemini",  // أو "claude" أو "cli"
        "regenerate": false
    }
    """
    from apps.data_collection.models import DataCollectionPeriod
    
    serializer = GenerateRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return DRFResponse(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
    
    data = serializer.validated_data
    
    try:
        period = DataCollectionPeriod.objects.get(id=data['period_id'])
    except DataCollectionPeriod.DoesNotExist:
        return DRFResponse(
            {'error': 'فترة الجمع غير موجودة'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # إنشاء service وتوليد
    service = GenerationService(period, model=data.get('model', 'gemini'))
    
    result = service.generate_axes(
        axis_ids=data.get('axes'),
        regenerate=data.get('regenerate', False),
        user=request.user if request.user.is_authenticated else None
    )
    
    # تحويل drafts للـ serializer
    result['drafts'] = AxisDraftSerializer(result['drafts'], many=True).data
    
    return DRFResponse(result)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def generate_project_report(request):
    """
    توليد التقرير من مشروع (Project/Response system)

    POST /api/reports/project-generate/
    {
        "project_id": "uuid",
        "axes": [1, 2, 3],     // اختياري
        "items": [1, 2],       // اختياري (عند level=items)
        "axis_id": 1,          // اختياري (عند level=items)
        "model": "cli",
        "regenerate": false,
        "level": "axes"        // axes أو items
    }
    """
    serializer = GenerateProjectRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return DRFResponse(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    data = serializer.validated_data

    try:
        project = Project.objects.get(id=data['project_id'])
    except Project.DoesNotExist:
        return DRFResponse(
            {'error': 'المشروع غير موجود'},
            status=status.HTTP_404_NOT_FOUND
        )

    service = ProjectGenerationService(project, model=data.get('model', 'cli'))
    user = request.user if request.user.is_authenticated else None

    level = data.get('level', 'axes')

    if level == 'items':
        result = service.generate_items(
            item_ids=data.get('items'),
            axis_id=data.get('axis_id'),
            regenerate=data.get('regenerate', False),
            user=user
        )
        result['drafts'] = ItemDraftSerializer(result['drafts'], many=True).data
    else:
        result = service.generate_axes(
            axis_ids=data.get('axes'),
            regenerate=data.get('regenerate', False),
            user=user
        )
        result['drafts'] = AxisDraftSerializer(result['drafts'], many=True).data

    return DRFResponse(result)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def project_drafts(request, project_id):
    """مسودات المحاور لمشروع معين"""
    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        return DRFResponse(
            {'error': 'المشروع غير موجود'},
            status=status.HTTP_404_NOT_FOUND
        )

    drafts = get_or_create_project_drafts(project)
    gen_status = get_project_generation_status(project)

    return DRFResponse({
        'project': {
            'id': str(project.id),
            'name': project.name,
            'period': project.period,
        },
        'generation_status': gen_status,
        'drafts': AxisDraftSerializer(drafts, many=True).data
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def project_item_drafts(request, project_id):
    """مسودات البنود لمشروع معين"""
    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        return DRFResponse(
            {'error': 'المشروع غير موجود'},
            status=status.HTTP_404_NOT_FOUND
        )

    axis_id = request.query_params.get('axis_id')
    if axis_id:
        items = Item.objects.filter(axis_id=axis_id, axis__template=project.template)
    else:
        items = Item.objects.filter(axis__template=project.template)

    items = items.order_by('axis__order', 'order')

    drafts = []
    for item in items:
        draft, _ = ItemDraft.objects.get_or_create(
            project=project,
            item=item,
            defaults={'status': 'not_started'}
        )
        drafts.append(draft)

    return DRFResponse({
        'project': {
            'id': str(project.id),
            'name': project.name,
        },
        'drafts': ItemDraftSerializer(drafts, many=True).data
    })


class ItemDraftViewSet(viewsets.ModelViewSet):
    """
    API لمسودات البنود

    GET /api/item-drafts/?period_id=X — قائمة مسودات فترة معينة
    GET /api/item-drafts/?period_id=X&axis_id=Y — مسودات محور معين
    GET /api/item-drafts/{id}/ — تفاصيل مسودة
    PATCH /api/item-drafts/{id}/ — تعديل المحتوى
    POST /api/item-drafts/{id}/approve/ — اعتماد
    POST /api/item-drafts/{id}/regenerate/ — إعادة توليد
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = ItemDraftSerializer
    
    def get_queryset(self):
        queryset = ItemDraft.objects.all()
        
        # Filter by period (required)
        period_id = self.request.query_params.get('period_id')
        if period_id:
            queryset = queryset.filter(period_id=period_id)
        
        # Filter by axis
        axis_id = self.request.query_params.get('axis_id')
        if axis_id:
            queryset = queryset.filter(item__axis_id=axis_id)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset.select_related('item', 'item__axis', 'period').order_by('item__axis__order', 'item__order')
    
    def get_serializer_class(self):
        if self.action in ['update', 'partial_update']:
            return ItemDraftEditSerializer
        return ItemDraftSerializer
    
    def perform_update(self, serializer):
        """تعديل المحتوى"""
        instance = serializer.instance
        new_content = serializer.validated_data.get('content')
        
        if new_content and new_content != instance.content:
            if instance.content:
                instance.previous_content = instance.content
                instance.version += 1
            instance.content = new_content
            instance.status = 'edited'
            instance.edited_at = timezone.now()
            instance.save()
        else:
            serializer.save()
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """اعتماد المسودة"""
        draft = self.get_object()
        
        if draft.status not in ['generated', 'edited']:
            return DRFResponse(
                {'error': 'لا يمكن اعتماد مسودة لم تُولّد بعد'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        draft.status = 'approved'
        draft.approved_at = timezone.now()
        draft.save(update_fields=['status', 'approved_at'])
        
        return DRFResponse({
            'status': 'success',
            'message': f'تم اعتماد البند "{draft.item.code}"',
            'draft': ItemDraftSerializer(draft).data
        })
    
    @action(detail=True, methods=['post'])
    def regenerate(self, request, pk=None):
        """إعادة توليد بند واحد"""
        draft = self.get_object()
        model = request.data.get('model', DEFAULT_AI_MODEL)
        
        service = GenerationService(draft.period, model=model)
        
        try:
            result = service._generate_single_item(
                draft.item,
                regenerate=True,
                user=request.user if request.user.is_authenticated else None
            )
            
            return DRFResponse({
                'status': 'success',
                'message': f'تم إعادة توليد البند "{draft.item.code}"',
                'draft': ItemDraftSerializer(result).data
            })
        except Exception as e:
            return DRFResponse(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def generate_items(request):
    """
    توليد البنود — بند واحد أو عدة بنود أو كل بنود محور
    
    POST /api/generate-items/
    {
        "period_id": 1,
        "items": [1, 2, 3],  // أو فارغة
        "axis_id": 1,        // لتوليد كل بنود محور
        "model": "cli",
        "regenerate": false
    }
    """
    from apps.data_collection.models import DataCollectionPeriod
    
    serializer = GenerateItemsRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return DRFResponse(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )
    
    data = serializer.validated_data
    
    try:
        period = DataCollectionPeriod.objects.get(id=data['period_id'])
    except DataCollectionPeriod.DoesNotExist:
        return DRFResponse(
            {'error': 'فترة الجمع غير موجودة'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # إنشاء service وتوليد
    service = GenerationService(period, model=data.get('model', DEFAULT_AI_MODEL))
    
    result = service.generate_items(
        item_ids=data.get('items'),
        axis_id=data.get('axis_id'),
        regenerate=data.get('regenerate', False),
        user=request.user if request.user.is_authenticated else None
    )
    
    # تحويل drafts للـ serializer
    result['drafts'] = ItemDraftSerializer(result['drafts'], many=True).data
    
    return DRFResponse(result)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def period_item_drafts(request, period_id):
    """
    الحصول على كل مسودات البنود لفترة معينة مع إنشائها إن لم تكن موجودة
    
    GET /api/periods/{period_id}/item-drafts/
    GET /api/periods/{period_id}/item-drafts/?axis_id=X
    """
    from apps.data_collection.models import DataCollectionPeriod
    
    try:
        period = DataCollectionPeriod.objects.get(id=period_id)
    except DataCollectionPeriod.DoesNotExist:
        return DRFResponse(
            {'error': 'فترة الجمع غير موجودة'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    axis_id = request.query_params.get('axis_id')
    axis_id = int(axis_id) if axis_id else None
    
    # إنشاء المسودات إن لم تكن موجودة
    drafts = get_or_create_item_drafts(period, axis_id)
    
    # تجميع حسب المحور
    from collections import defaultdict
    by_axis = defaultdict(list)
    for draft in drafts:
        by_axis[draft.item.axis_id].append(draft)
    
    axes_data = []
    for axis in period.template.axes.all().order_by('order'):
        axis_drafts = by_axis.get(axis.id, [])
        generated = sum(1 for d in axis_drafts if d.status in ['generated', 'edited', 'approved'])
        
        axes_data.append({
            'axis_id': axis.id,
            'axis_code': axis.code,
            'axis_name': axis.name,
            'total_items': len(axis_drafts),
            'generated_items': generated,
            'drafts': ItemDraftSerializer(axis_drafts, many=True).data
        })
    
    return DRFResponse({
        'period': {
            'id': period.id,
            'name': period.name,
            'academic_year': period.academic_year,
        },
        'axes': axes_data
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def generation_status(request, period_id):
    """
    حالة توليد التقرير لفترة معينة
    
    GET /api/periods/{period_id}/generation-status/
    """
    from apps.data_collection.models import DataCollectionPeriod
    
    try:
        period = DataCollectionPeriod.objects.get(id=period_id)
    except DataCollectionPeriod.DoesNotExist:
        return DRFResponse(
            {'error': 'فترة الجمع غير موجودة'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    status_data = get_period_generation_status(period)
    
    return DRFResponse({
        'period': {
            'id': period.id,
            'name': period.name,
            'academic_year': period.academic_year,
        },
        **status_data
    })


# ============================================
# Export API
# ============================================

from django.http import HttpResponse

@api_view(['GET', 'POST'])
@permission_classes([permissions.AllowAny])
def export_report(request, period_id):
    """
    تصدير التقرير إلى Word
    
    GET /api/reports/periods/{period_id}/export/
    POST /api/reports/periods/{period_id}/export/
    
    Query params:
    - format: docx (default), pdf
    - include_items: true/false (default: true)
    - include_charts: true/false (default: true)
    - include_tables: true/false (default: true)
    - approved_only: true/false (default: false)
    """
    from apps.data_collection.models import DataCollectionPeriod
    from .export_service import ExportService
    
    try:
        period = DataCollectionPeriod.objects.get(id=period_id)
    except DataCollectionPeriod.DoesNotExist:
        return DRFResponse(
            {'error': 'فترة الجمع غير موجودة'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Get options from query params or body
    if request.method == 'POST':
        options = request.data
    else:
        options = request.query_params
    
    # Note: 'format' is reserved in DRF, use 'output_format' instead
    export_format = options.get('output_format', options.get('format', 'docx'))
    include_items = str(options.get('include_items', 'true')).lower() == 'true'
    include_charts = str(options.get('include_charts', 'true')).lower() == 'true'
    include_tables = str(options.get('include_tables', 'true')).lower() == 'true'
    approved_only = str(options.get('approved_only', 'false')).lower() == 'true'
    
    if export_format not in ['docx', 'pdf']:
        return DRFResponse(
            {'error': 'صيغة غير مدعومة. الصيغ المتاحة: docx, pdf'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        # Generate Word document
        service = ExportService(period)
        output = service.export_to_word(
            include_items=include_items,
            include_charts=include_charts,
            include_tables=include_tables,
            approved_only=approved_only,
        )
        
        # Generate filename
        filename = f"التقرير_السنوي_{period.academic_year.replace('-', '_')}.docx"
        
        # Create response
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return DRFResponse(
            {'error': f'حدث خطأ أثناء التصدير: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ============================================
# Attachment & Manual Content Views
# ============================================

from .models import DraftAttachment, DraftHistory
from .serializers import (
    DraftAttachmentSerializer, DraftAttachmentUploadSerializer,
    ItemDraftManualContentSerializer, DraftHistorySerializer,
    PreviousDataImportSerializer
)


class DraftAttachmentViewSet(viewsets.ModelViewSet):
    """
    API للمرفقات
    
    GET /api/reports/attachments/ — قائمة المرفقات
    GET /api/reports/attachments/?item_draft=X — مرفقات بند معين
    POST /api/reports/attachments/ — رفع مرفق جديد
    DELETE /api/reports/attachments/{id}/ — حذف مرفق
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = DraftAttachmentSerializer
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        queryset = DraftAttachment.objects.all()
        
        item_draft_id = self.request.query_params.get('item_draft')
        if item_draft_id:
            queryset = queryset.filter(item_draft_id=item_draft_id)
        
        axis_draft_id = self.request.query_params.get('axis_draft')
        if axis_draft_id:
            queryset = queryset.filter(axis_draft_id=axis_draft_id)
        
        return queryset.order_by('order', 'uploaded_at')
    
    def create(self, request, *args, **kwargs):
        """رفع مرفق جديد"""
        file = request.FILES.get('file')
        if not file:
            return DRFResponse(
                {'error': 'لم يتم تحديد ملف'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        item_draft_id = request.data.get('item_draft_id') or request.data.get('item_draft')
        axis_draft_id = request.data.get('axis_draft_id') or request.data.get('axis_draft')
        caption = request.data.get('caption', '')
        order = int(request.data.get('order', 0))
        
        if not item_draft_id and not axis_draft_id:
            return DRFResponse(
                {'error': 'يجب تحديد item_draft أو axis_draft'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Determine file type
        file_type = 'image' if file.content_type.startswith('image/') else 'document'
        
        attachment = DraftAttachment.objects.create(
            item_draft_id=item_draft_id,
            axis_draft_id=axis_draft_id,
            file=file,
            filename=file.name,
            file_type=file_type,
            file_size=file.size,
            caption=caption,
            order=order,
            uploaded_by=request.user if request.user.is_authenticated else None,
        )
        
        # Log the action
        draft = attachment.item_draft or attachment.axis_draft
        if draft:
            DraftHistory.log(
                draft=draft,
                action='add_attachment',
                user=request.user if request.user.is_authenticated else None,
                notes=f'تم رفع: {file.name}'
            )
        
        serializer = DraftAttachmentSerializer(attachment, context={'request': request})
        return DRFResponse(serializer.data, status=status.HTTP_201_CREATED)
    
    def destroy(self, request, *args, **kwargs):
        """حذف مرفق"""
        attachment = self.get_object()
        
        # Log the action
        draft = attachment.item_draft or attachment.axis_draft
        if draft:
            DraftHistory.log(
                draft=draft,
                action='remove_attachment',
                user=request.user if request.user.is_authenticated else None,
                notes=f'تم حذف: {attachment.filename}'
            )
        
        attachment.file.delete()  # Delete file from storage
        attachment.delete()
        
        return DRFResponse(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def item_draft_attachments(request, draft_id):
    """
    مرفقات بند معين
    
    GET /api/reports/item-drafts/{draft_id}/attachments/
    """
    attachments = DraftAttachment.objects.filter(item_draft_id=draft_id).order_by('order')
    serializer = DraftAttachmentSerializer(attachments, many=True, context={'request': request})
    return DRFResponse(serializer.data)


@api_view(['PATCH'])
@permission_classes([permissions.AllowAny])
def update_manual_content(request, draft_id):
    """
    تحديث المحتوى اليدوي لبند
    
    PATCH /api/reports/item-drafts/{draft_id}/manual-content/
    
    Body:
    {
        "manual_content": [
            {"type": "image", "attachment_id": "uuid", "caption": "...", "order": 1},
            {"type": "table", "data": [[...]], "title": "...", "order": 2},
            {"type": "text", "content": "فقرة إضافية", "order": 3}
        ]
    }
    """
    try:
        draft = ItemDraft.objects.get(id=draft_id)
    except ItemDraft.DoesNotExist:
        return DRFResponse(
            {'error': 'البند غير موجود'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    manual_content = request.data.get('manual_content', [])
    
    # Validate structure
    for item in manual_content:
        if item.get('type') not in ['image', 'table', 'text']:
            return DRFResponse(
                {'error': f'نوع غير صالح: {item.get("type")}'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    old_content = draft.manual_content
    draft.manual_content = manual_content
    draft.save(update_fields=['manual_content', 'updated_at'])
    
    # Log the change
    DraftHistory.log(
        draft=draft,
        action='edit',
        field_changed='manual_content',
        old_value=str(old_content),
        new_value=str(manual_content),
        user=request.user if request.user.is_authenticated else None,
    )
    
    return DRFResponse({
        'status': 'success',
        'message': 'تم حفظ المحتوى اليدوي',
        'manual_content': draft.manual_content
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def draft_history(request, draft_id, draft_type='item'):
    """
    سجل تعديلات مسودة
    
    GET /api/reports/item-drafts/{draft_id}/history/
    GET /api/reports/axis-drafts/{draft_id}/history/
    """
    if draft_type == 'item':
        history = DraftHistory.objects.filter(item_draft_id=draft_id)
    else:
        history = DraftHistory.objects.filter(axis_draft_id=draft_id)
    
    serializer = DraftHistorySerializer(history.order_by('-created_at')[:50], many=True)
    return DRFResponse(serializer.data)


# ============================================
# Previous Year Data Import/Export
# ============================================

@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def previous_data_template(request, period_id):
    """
    تحميل قالب Excel لبيانات السنة السابقة
    
    GET /api/reports/periods/{period_id}/previous-data/template/
    """
    from apps.data_collection.models import DataCollectionPeriod
    import openpyxl
    from io import BytesIO
    
    try:
        period = DataCollectionPeriod.objects.get(id=period_id)
    except DataCollectionPeriod.DoesNotExist:
        return DRFResponse(
            {'error': 'فترة الجمع غير موجودة'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Create Excel workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "بيانات السنة السابقة"
    ws.sheet_view.rightToLeft = True
    
    # Header row
    headers = ['كود البند', 'اسم البند', 'المحور', 'الوحدة', 'القيمة السابقة', 'ملاحظات']
    ws.append(headers)
    
    # Style header
    from openpyxl.styles import Font, PatternFill, Alignment
    header_fill = PatternFill(start_color='366092', end_color='366092', fill_type='solid')
    header_font = Font(color='FFFFFF', bold=True)
    
    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_num)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal='center')
    
    # Add items
    for axis in period.template.axes.all().order_by('order'):
        for item in axis.items.all().order_by('order'):
            ws.append([
                item.code,
                item.name,
                axis.name,
                item.unit or '',
                '',  # Empty cell for user to fill
                ''   # Notes
            ])
    
    # Adjust column widths
    ws.column_dimensions['A'].width = 12
    ws.column_dimensions['B'].width = 50
    ws.column_dimensions['C'].width = 30
    ws.column_dimensions['D'].width = 15
    ws.column_dimensions['E'].width = 20
    ws.column_dimensions['F'].width = 30
    
    # Save to buffer
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename="قالب_بيانات_سابقة_{period.academic_year}.xlsx"'
    
    return response


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def import_previous_data(request, period_id):
    """
    استيراد بيانات السنة السابقة من Excel
    
    POST /api/reports/periods/{period_id}/previous-data/import/
    """
    from apps.data_collection.models import DataCollectionPeriod
    from apps.templates_app.models import Item
    import openpyxl
    
    try:
        period = DataCollectionPeriod.objects.get(id=period_id)
    except DataCollectionPeriod.DoesNotExist:
        return DRFResponse(
            {'error': 'فترة الجمع غير موجودة'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    file = request.FILES.get('file')
    if not file:
        return DRFResponse(
            {'error': 'لم يتم تحديد ملف'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not file.name.endswith(('.xlsx', '.xls')):
        return DRFResponse(
            {'error': 'يجب أن يكون الملف بصيغة Excel'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        wb = openpyxl.load_workbook(file)
        ws = wb.active
    except Exception as e:
        return DRFResponse(
            {'error': f'خطأ في قراءة الملف: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get items by code
    items_by_code = {
        item.code: item
        for item in Item.objects.filter(axis__template=period.template)
    }
    
    imported = []
    errors = []
    
    # Skip header row
    for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
        if not row or not row[0]:  # Skip empty rows
            continue
        
        item_code = str(row[0]).strip()
        previous_value = row[4] if len(row) > 4 else None
        
        if not item_code or previous_value is None or previous_value == '':
            continue
        
        item = items_by_code.get(item_code)
        if not item:
            errors.append({
                'row': row_num,
                'code': item_code,
                'error': 'البند غير موجود'
            })
            continue
        
        # Get or create ItemDraft
        draft, created = ItemDraft.objects.get_or_create(
            period=period,
            item=item,
        )
        
        # Update previous_value
        try:
            # Try to convert to number
            if isinstance(previous_value, (int, float)):
                draft.previous_value = previous_value
            else:
                draft.previous_value = float(str(previous_value).replace(',', ''))
        except (ValueError, TypeError):
            draft.previous_value = previous_value  # Keep as-is
        
        # Calculate change percentage if we have current value
        if draft.current_value is not None and draft.previous_value is not None:
            try:
                current = float(draft.current_value)
                previous = float(draft.previous_value)
                if previous != 0:
                    draft.change_percentage = ((current - previous) / previous) * 100
            except (ValueError, TypeError):
                pass
        
        draft.save()
        
        imported.append({
            'code': item_code,
            'name': item.name,
            'previous_value': draft.previous_value,
            'change_percentage': float(draft.change_percentage) if draft.change_percentage else None
        })
    
    return DRFResponse({
        'status': 'success',
        'message': f'تم استيراد {len(imported)} بند',
        'imported_count': len(imported),
        'imported': imported,
        'errors_count': len(errors),
        'errors': errors
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def export_previous_data(request, period_id):
    """
    تصدير بيانات السنة السابقة (الحالية والسابقة) إلى Excel
    
    GET /api/reports/periods/{period_id}/previous-data/export/
    """
    from apps.data_collection.models import DataCollectionPeriod
    import openpyxl
    from io import BytesIO
    from openpyxl.styles import Font, PatternFill, Alignment
    
    try:
        period = DataCollectionPeriod.objects.get(id=period_id)
    except DataCollectionPeriod.DoesNotExist:
        return DRFResponse(
            {'error': 'فترة الجمع غير موجودة'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Create Excel workbook
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "مقارنة البيانات"
    ws.sheet_view.rightToLeft = True
    
    # Header row
    headers = [
        'كود البند', 'اسم البند', 'المحور', 'الوحدة',
        'القيمة الحالية', 'القيمة السابقة', 'نسبة التغير %'
    ]
    ws.append(headers)
    
    # Style header
    header_fill = PatternFill(start_color='366092', end_color='366092', fill_type='solid')
    header_font = Font(color='FFFFFF', bold=True)
    
    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_num)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal='center')
    
    # Get item drafts
    drafts = ItemDraft.objects.filter(period=period).select_related('item', 'item__axis')
    
    for draft in drafts.order_by('item__axis__order', 'item__order'):
        ws.append([
            draft.item.code,
            draft.item.name,
            draft.item.axis.name,
            draft.item.unit or '',
            draft.current_value or '',
            draft.previous_value or '',
            f'{draft.change_percentage:.1f}' if draft.change_percentage else ''
        ])
    
    # Adjust column widths
    ws.column_dimensions['A'].width = 12
    ws.column_dimensions['B'].width = 50
    ws.column_dimensions['C'].width = 30
    ws.column_dimensions['D'].width = 15
    ws.column_dimensions['E'].width = 18
    ws.column_dimensions['F'].width = 18
    ws.column_dimensions['G'].width = 15
    
    # Save to buffer
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename="مقارنة_البيانات_{period.academic_year}.xlsx"'
    
    return response


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def pull_previous_period_data(request, period_id):
    """
    سحب بيانات من الفترة السابقة تلقائياً
    
    POST /api/reports/periods/{period_id}/previous-data/pull/
    """
    from apps.data_collection.models import DataCollectionPeriod
    
    try:
        period = DataCollectionPeriod.objects.get(id=period_id)
    except DataCollectionPeriod.DoesNotExist:
        return DRFResponse(
            {'error': 'فترة الجمع غير موجودة'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if there's a previous period defined
    if not period.previous_period:
        return DRFResponse(
            {'error': 'لا توجد فترة سابقة محددة'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    prev_period = period.previous_period
    
    # Get previous period's item drafts
    prev_drafts = {
        d.item_id: d for d in
        ItemDraft.objects.filter(period=prev_period).select_related('item')
    }
    
    if not prev_drafts:
        return DRFResponse(
            {'error': 'لا توجد بيانات في الفترة السابقة'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    updated = []
    
    # Update current period's drafts
    for draft in ItemDraft.objects.filter(period=period):
        prev_draft = prev_drafts.get(draft.item_id)
        if prev_draft and prev_draft.current_value is not None:
            draft.previous_value = prev_draft.current_value
            
            # Calculate change percentage
            if draft.current_value is not None:
                try:
                    current = float(draft.current_value)
                    previous = float(draft.previous_value)
                    if previous != 0:
                        draft.change_percentage = ((current - previous) / previous) * 100
                except (ValueError, TypeError):
                    pass
            
            draft.save(update_fields=['previous_value', 'change_percentage', 'updated_at'])
            updated.append({
                'code': draft.item.code,
                'name': draft.item.name,
                'previous_value': draft.previous_value,
            })
    
    return DRFResponse({
        'status': 'success',
        'message': f'تم سحب {len(updated)} قيمة من الفترة السابقة',
        'updated_count': len(updated),
        'updated': updated,
        'previous_period': prev_period.name
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def export_preview(request, period_id):
    """
    معاينة محتوى التقرير قبل التصدير
    
    GET /api/reports/periods/{period_id}/export/preview/
    """
    from apps.data_collection.models import DataCollectionPeriod
    
    try:
        period = DataCollectionPeriod.objects.get(id=period_id)
    except DataCollectionPeriod.DoesNotExist:
        return DRFResponse(
            {'error': 'فترة الجمع غير موجودة'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Get generation status
    status_data = get_period_generation_status(period)
    
    # Get axis drafts
    axis_drafts = period.axis_drafts.select_related('axis').order_by('axis__order')
    
    axes_preview = []
    for draft in axis_drafts:
        item_drafts = period.item_drafts.filter(item__axis=draft.axis).select_related('item')
        
        items_preview = []
        for item_draft in item_drafts:
            items_preview.append({
                'code': item_draft.item.code,
                'name': item_draft.item.name,
                'status': item_draft.status,
                'has_content': bool(item_draft.content),
                'content_preview': item_draft.content[:200] + '...' if item_draft.content and len(item_draft.content) > 200 else item_draft.content,
                'current_value': item_draft.current_value,
                'attachments_count': item_draft.attachments.count(),
            })
        
        axes_preview.append({
            'code': draft.axis.code,
            'name': draft.axis.name,
            'status': draft.status,
            'has_content': bool(draft.content),
            'content_preview': draft.content[:300] + '...' if draft.content and len(draft.content) > 300 else draft.content,
            'items': items_preview,
            'attachments_count': draft.attachments.count(),
        })
    
    return DRFResponse({
        'period': {
            'id': period.id,
            'name': period.name,
            'academic_year': period.academic_year,
        },
        'generation_status': status_data,
        'axes': axes_preview,
        'can_export': status_data['generated'] > 0,
        'ready_for_final_export': status_data['is_complete'] and status_data['is_approved'],
    })


# ============================================
# Output Templates ViewSet
# ============================================

class OutputTemplateViewSet(viewsets.ModelViewSet):
    """
    API لقوالب المخرجات
    
    GET /api/reports/output-templates/ — قائمة القوالب
    POST /api/reports/output-templates/ — إنشاء قالب جديد
    GET /api/reports/output-templates/{id}/ — تفاصيل قالب
    PUT /api/reports/output-templates/{id}/ — تحديث قالب
    DELETE /api/reports/output-templates/{id}/ — حذف قالب
    """
    queryset = OutputTemplate.objects.prefetch_related('components').all()
    permission_classes = [permissions.AllowAny]  # For demo
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return OutputTemplateCreateSerializer
        return OutputTemplateSerializer
    
    @action(detail=False, methods=['get'])
    def default(self, request):
        """Get the default template"""
        template = OutputTemplate.objects.filter(is_default=True).first()
        if template:
            serializer = OutputTemplateSerializer(template)
            return DRFResponse(serializer.data)
        return DRFResponse({'error': 'لا يوجد قالب افتراضي'}, status=404)
    
    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set this template as default"""
        template = self.get_object()
        OutputTemplate.objects.update(is_default=False)
        template.is_default = True
        template.save()
        return DRFResponse({'status': 'success', 'message': 'تم تعيين القالب كافتراضي'})
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a template"""
        original = self.get_object()
        
        # Create new template
        new_template = OutputTemplate.objects.create(
            code=f"{original.code}_copy",
            name=f"{original.name} (نسخة)",
            description=original.description,
            is_default=False,
        )
        
        # Copy components
        for comp in original.components.all():
            OutputComponent.objects.create(
                template=new_template,
                type=comp.type,
                source=comp.source,
                title=comp.title,
                order=comp.order,
                width=comp.width,
                required=comp.required,
                settings=comp.settings,
            )
        
        serializer = OutputTemplateSerializer(new_template)
        return DRFResponse(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def get_item_output_config(request, draft_id):
    """
    جلب إعدادات المخرجات لبند معين
    
    GET /api/reports/item-drafts/{draft_id}/output-config/
    """
    try:
        draft = ItemDraft.objects.select_related('output_template', 'item').get(id=draft_id)
    except ItemDraft.DoesNotExist:
        return DRFResponse({'error': 'البند غير موجود'}, status=404)
    
    # Get template (custom or default)
    template = draft.output_template
    if not template:
        template = OutputTemplate.objects.filter(is_default=True).first()
    
    # Get all available templates
    all_templates = OutputTemplate.objects.prefetch_related('components').all()
    
    return DRFResponse({
        'draft_id': str(draft.id),
        'item_code': draft.item.code,
        'item_name': draft.item.name,
        'current_template': OutputTemplateSerializer(template).data if template else None,
        'available_templates': OutputTemplateSerializer(all_templates, many=True).data,
        'component_types': [
            {'value': 'text', 'label': 'نص تحليلي', 'icon': '📝', 'source_options': ['auto', 'manual', 'mixed']},
            {'value': 'table', 'label': 'جدول', 'icon': '📊', 'source_options': ['auto', 'manual']},
            {'value': 'chart', 'label': 'رسم بياني', 'icon': '📈', 'source_options': ['auto']},
            {'value': 'image', 'label': 'صورة', 'icon': '🖼️', 'source_options': ['manual']},
        ],
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def set_item_output_config(request, draft_id):
    """
    تحديد إعدادات المخرجات لبند معين
    
    POST /api/reports/item-drafts/{draft_id}/output-config/
    {
        "output_template_id": 1,  // أو null لمخصص
        "custom_components": [
            {"type": "text", "enabled": true, "order": 0, "source": "auto"},
            {"type": "table", "enabled": true, "order": 1, "source": "auto"},
            {"type": "image", "enabled": true, "order": 2, "source": "manual"}
        ]
    }
    """
    try:
        draft = ItemDraft.objects.get(id=draft_id)
    except ItemDraft.DoesNotExist:
        return DRFResponse({'error': 'البند غير موجود'}, status=404)
    
    template_id = request.data.get('output_template_id')
    custom_components = request.data.get('custom_components')
    
    if template_id:
        # Use existing template
        try:
            template = OutputTemplate.objects.get(id=template_id)
            draft.output_template = template
            draft.save(update_fields=['output_template', 'updated_at'])
        except OutputTemplate.DoesNotExist:
            return DRFResponse({'error': 'القالب غير موجود'}, status=404)
    
    elif custom_components:
        # Create or update custom template for this draft
        template_code = f"custom_item_{draft.id}"
        template, created = OutputTemplate.objects.get_or_create(
            code=template_code,
            defaults={
                'name': f'مخصص - {draft.item.code}',
                'description': 'قالب مخصص للبند',
                'is_default': False,
            }
        )
        
        # Update components
        template.components.all().delete()
        for idx, comp in enumerate(custom_components):
            if comp.get('enabled', True):
                OutputComponent.objects.create(
                    template=template,
                    type=comp['type'],
                    source=comp.get('source', 'auto'),
                    title=comp.get('title', ''),
                    order=comp.get('order', idx),
                    width=comp.get('width', 'full'),
                    required=comp.get('required', True),
                    settings=comp.get('settings', {}),
                )
        
        draft.output_template = template
        draft.save(update_fields=['output_template', 'updated_at'])
    
    return DRFResponse({
        'status': 'success',
        'message': 'تم حفظ إعدادات المخرجات',
        'template': OutputTemplateSerializer(draft.output_template).data if draft.output_template else None,
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def set_bulk_output_config(request):
    """
    تحديد إعدادات المخرجات لعدة بنود
    
    POST /api/reports/item-drafts/bulk-output-config/
    {
        "item_draft_ids": ["uuid1", "uuid2"],
        "output_template_id": 1
    }
    """
    serializer = BulkOutputConfigSerializer(data=request.data)
    if not serializer.is_valid():
        return DRFResponse(serializer.errors, status=400)
    
    data = serializer.validated_data
    draft_ids = data['item_draft_ids']
    template_id = data.get('output_template_id')
    
    if template_id:
        try:
            template = OutputTemplate.objects.get(id=template_id)
        except OutputTemplate.DoesNotExist:
            return DRFResponse({'error': 'القالب غير موجود'}, status=404)
        
        updated = ItemDraft.objects.filter(id__in=draft_ids).update(output_template=template)
        
        return DRFResponse({
            'status': 'success',
            'message': f'تم تحديث {updated} بند',
            'updated_count': updated,
        })
    
    return DRFResponse({'error': 'يجب تحديد output_template_id'}, status=400)


# ============================================
# Skeleton-First Workflow Views
# ============================================

from .models import ItemStructure, GeneratedContent, DetailedResponse
from .serializers import (
    ItemStructureSerializer, ItemStructureUpdateSerializer,
    ItemStructureCreateFromTemplateSerializer,
    GeneratedContentSerializer, GeneratedContentEditSerializer,
    GeneratedContentRegenerateSerializer,
    DetailedResponseSerializer, DetailedResponseCreateSerializer,
    SkeletonBuildRequestSerializer, TextGenerateRequestSerializer,
)


class ItemStructureViewSet(viewsets.ModelViewSet):
    """
    API لهياكل البنود — Skeleton-First

    GET    /api/reports/structures/                    → قائمة كل الهياكل
    GET    /api/reports/structures/?project=UUID        → هياكل مشروع معين
    GET    /api/reports/structures/{id}/               → تفاصيل هيكل بند
    POST   /api/reports/structures/                    → إنشاء هيكل
    PATCH  /api/reports/structures/{id}/               → تعديل الهيكل
    POST   /api/reports/structures/init_from_template/ → إنشاء هياكل من القالب
    POST   /api/reports/structures/{id}/approve/       → اعتماد الهيكل
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = ItemStructureSerializer

    def get_queryset(self):
        queryset = ItemStructure.objects.select_related(
            'project', 'item', 'item__axis'
        ).prefetch_related('generated_contents').all()

        # Filter by project
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        # Filter by axis
        axis_id = self.request.query_params.get('axis')
        if axis_id:
            queryset = queryset.filter(item__axis_id=axis_id)

        # Filter by item
        item_id = self.request.query_params.get('item')
        if item_id:
            queryset = queryset.filter(item_id=item_id)

        return queryset

    def get_serializer_class(self):
        if self.action in ('update', 'partial_update'):
            return ItemStructureUpdateSerializer
        return ItemStructureSerializer

    @action(detail=False, methods=['post'])
    def init_from_template(self, request):
        """
        إنشاء هياكل البنود من القالب لمشروع معين

        POST /api/reports/structures/init_from_template/
        {
            "project_id": "uuid",
            "item_ids": [1, 2, 3],   // اختياري — إذا فارغ = كل البنود
            "overwrite": false
        }
        """
        serializer = ItemStructureCreateFromTemplateSerializer(data=request.data)
        if not serializer.is_valid():
            return DRFResponse(serializer.errors, status=400)

        data = serializer.validated_data
        project = get_object_or_404(Project, id=data['project_id'])
        item_ids = data.get('item_ids', [])
        overwrite = data.get('overwrite', False)

        # Get items from template
        items_qs = Item.objects.filter(axis__template=project.template)
        if item_ids:
            items_qs = items_qs.filter(id__in=item_ids)

        created_count = 0
        skipped_count = 0
        errors = []

        for item in items_qs:
            try:
                # Check if already exists
                existing = ItemStructure.objects.filter(
                    project=project, item=item
                ).first()

                if existing and not overwrite:
                    skipped_count += 1
                    continue

                if existing and overwrite:
                    existing.delete()

                ItemStructure.create_from_template(project, item)
                created_count += 1

            except Exception as e:
                errors.append({
                    'item': item.code,
                    'error': str(e)
                })

        return DRFResponse({
            'status': 'success',
            'created': created_count,
            'skipped': skipped_count,
            'errors': errors,
            'message': f'تم إنشاء {created_count} هيكل، تم تخطي {skipped_count}',
        })

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """اعتماد الهيكل"""
        structure = self.get_object()
        structure.is_approved = True
        structure.save(update_fields=['is_approved', 'updated_at'])
        return DRFResponse({
            'status': 'success',
            'message': f'تم اعتماد هيكل البند {structure.item.code}'
        })

    @action(detail=True, methods=['get'])
    def context(self, request, pk=None):
        """
        الحصول على سياق فقرة معينة

        GET /api/reports/structures/{id}/context/?paragraph=p2
        """
        structure = self.get_object()
        paragraph_id = request.query_params.get('paragraph', 'p1')
        ctx = structure.get_context_for_paragraph(paragraph_id)
        return DRFResponse(ctx)

    @action(detail=False, methods=['get'])
    def data_requirements(self, request):
        """
        تحليل هياكل البنود واستخراج متطلبات البيانات المطلوبة من المساهم

        GET /api/reports/structures/data_requirements/?project=UUID
        يعيد قائمة بالبيانات المطلوبة لكل بند بناءً على الهيكل
        """
        project_id = request.query_params.get('project')
        if not project_id:
            return DRFResponse({'error': 'project parameter مطلوب'}, status=400)

        structures = ItemStructure.objects.filter(
            project_id=project_id
        ).select_related('item', 'item__axis')

        requirements = []
        for structure in structures:
            item_reqs = {
                'item_id': structure.item_id,
                'item_code': structure.item.code,
                'item_name': structure.item.name,
                'axis_code': structure.item.axis.code,
                'fields': [],
            }

            has_tables = False
            has_charts = False
            has_paragraphs = False

            for comp in (structure.components or []):
                comp_type = comp.get('type', '')
                if comp_type == 'table':
                    has_tables = True
                    item_reqs['fields'].append({
                        'id': comp.get('id'),
                        'type': 'table',
                        'title': comp.get('title', 'جدول'),
                        'columns': comp.get('columns', []),
                        'data_source': comp.get('data_source', ''),
                        'input_method': 'table_dynamic',
                        'description': f'جدول: {comp.get("title", "")}',
                    })
                elif comp_type == 'chart':
                    has_charts = True
                    item_reqs['fields'].append({
                        'id': comp.get('id'),
                        'type': 'chart_data',
                        'title': comp.get('title', 'شكل'),
                        'chart_type': comp.get('chart_type', 'pie'),
                        'data_source': comp.get('data_source', ''),
                        'input_method': 'table_dynamic',
                        'description': f'بيانات شكل: {comp.get("title", "")}',
                    })
                elif comp_type == 'paragraph':
                    has_paragraphs = True

            # Always add basic numeric field for items with paragraphs
            if has_paragraphs:
                item_reqs['fields'].insert(0, {
                    'id': 'value',
                    'type': 'number',
                    'title': f'القيمة الحالية لـ {structure.item.name}',
                    'input_method': 'number',
                    'description': 'القيمة الرقمية الأساسية',
                })
                item_reqs['fields'].insert(1, {
                    'id': 'previous_value',
                    'type': 'number',
                    'title': 'القيمة السابقة (اختياري)',
                    'input_method': 'number',
                    'required': False,
                    'description': 'قيمة السنة السابقة للمقارنة',
                })

            item_reqs['summary'] = {
                'tables': has_tables,
                'charts': has_charts,
                'paragraphs': has_paragraphs,
                'total_fields': len(item_reqs['fields']),
            }

            if item_reqs['fields']:
                requirements.append(item_reqs)

        return DRFResponse({
            'project_id': project_id,
            'total_items': len(requirements),
            'requirements': requirements,
        })


class GeneratedContentViewSet(viewsets.ModelViewSet):
    """
    API للمحتويات المولّدة — فقرة بفقرة

    GET    /api/reports/generated-contents/                → قائمة المحتويات
    GET    /api/reports/generated-contents/?project=UUID   → محتويات مشروع
    GET    /api/reports/generated-contents/{id}/           → تفاصيل محتوى
    POST   /api/reports/generated-contents/{id}/edit/      → تعديل يدوي
    POST   /api/reports/generated-contents/{id}/approve/   → اعتماد
    POST   /api/reports/generated-contents/{id}/regenerate/ → إعادة توليد
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = GeneratedContentSerializer

    def get_queryset(self):
        queryset = GeneratedContent.objects.select_related(
            'item_structure', 'item_structure__item',
            'item_structure__item__axis', 'project'
        ).all()

        # Filter by project
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        # Filter by structure
        structure_id = self.request.query_params.get('structure')
        if structure_id:
            queryset = queryset.filter(item_structure_id=structure_id)

        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by item
        item_id = self.request.query_params.get('item')
        if item_id:
            queryset = queryset.filter(item_structure__item_id=item_id)

        return queryset

    @action(detail=True, methods=['post'])
    def edit(self, request, pk=None):
        """
        تعديل يدوي لمحتوى فقرة

        POST /api/reports/generated-contents/{id}/edit/
        {"content": "النص المعدّل"}
        """
        content_obj = self.get_object()
        serializer = GeneratedContentEditSerializer(data=request.data)
        if not serializer.is_valid():
            return DRFResponse(serializer.errors, status=400)

        content_obj.edit(
            serializer.validated_data['content'],
            user=request.user if request.user.is_authenticated else None
        )

        return DRFResponse(GeneratedContentSerializer(content_obj).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """اعتماد محتوى فقرة"""
        content_obj = self.get_object()
        content_obj.approve(
            user=request.user if request.user.is_authenticated else None
        )
        return DRFResponse({
            'status': 'success',
            'message': f'تم اعتماد {content_obj.component_id}'
        })

    @action(detail=True, methods=['post'])
    def regenerate(self, request, pk=None):
        """
        إعادة توليد فقرة واحدة

        POST /api/reports/generated-contents/{id}/regenerate/
        {"model": "cli", "extra_instructions": "اكتب بأسلوب أكاديمي"}
        """
        content_obj = self.get_object()
        model = request.data.get('model', 'cli')
        extra_instructions = request.data.get('extra_instructions', '')
        user = request.user if request.user.is_authenticated else None

        content_obj.regenerate()

        from .text_generator import TextGenerator

        generator = TextGenerator(content_obj.project, model=model)
        result = generator.generate_paragraph(
            content_obj,
            extra_instructions=extra_instructions,
            user=user,
        )

        if result.get('success'):
            content_obj.refresh_from_db()
            return DRFResponse(GeneratedContentSerializer(content_obj).data)
        else:
            return DRFResponse({
                'status': 'failed',
                'error': result.get('error', 'فشل التوليد'),
                'content_id': str(content_obj.id),
            }, status=500)


class DetailedResponseViewSet(viewsets.ModelViewSet):
    """
    API للبيانات التفصيلية

    GET    /api/reports/detailed-responses/              → قائمة البيانات
    GET    /api/reports/detailed-responses/?project=UUID → بيانات مشروع
    POST   /api/reports/detailed-responses/              → إضافة بيانات
    PATCH  /api/reports/detailed-responses/{id}/         → تعديل
    DELETE /api/reports/detailed-responses/{id}/         → حذف
    """
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = DetailedResponse.objects.select_related(
            'project', 'item', 'item__axis',
            'response', 'contributor', 'table_definition'
        ).all()

        # Filter by project
        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        # Filter by item
        item_id = self.request.query_params.get('item')
        if item_id:
            queryset = queryset.filter(item_id=item_id)

        # Filter by data_type
        data_type = self.request.query_params.get('data_type')
        if data_type:
            queryset = queryset.filter(data_type=data_type)

        return queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return DetailedResponseCreateSerializer
        return DetailedResponseSerializer

    @action(detail=True, methods=['post'])
    def update_data(self, request, pk=None):
        """
        تعديل بيانات جدول تفصيلي (تعديل خلايا / إضافة صفوف / حذف صفوف)

        POST /api/reports/detailed-responses/{id}/update_data/
        {"data": {"headers": [...], "rows": [...]}}
        """
        obj = self.get_object()
        new_data = request.data.get('data')
        if not new_data:
            return DRFResponse({'error': 'حقل data مطلوب'}, status=400)
        obj.data = new_data
        obj.save(update_fields=['data', 'updated_at'])
        return DRFResponse(DetailedResponseSerializer(obj).data)


class TableDataViewSet(viewsets.ModelViewSet):
    """
    API لبيانات الجداول

    GET    /api/reports/table-data/                → قائمة البيانات
    GET    /api/reports/table-data/?project=UUID   → بيانات مشروع
    PATCH  /api/reports/table-data/{id}/           → تعديل بيانات
    POST   /api/reports/table-data/{id}/update_rows/ → تعديل صفوف
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = TableDataSerializer

    def get_queryset(self):
        queryset = TableData.objects.select_related(
            'project', 'contributor', 'table_definition'
        ).all()

        project_id = self.request.query_params.get('project')
        if project_id:
            queryset = queryset.filter(project_id=project_id)

        item_id = self.request.query_params.get('item')
        if item_id:
            queryset = queryset.filter(
                table_definition__axis__items__id=item_id
            ).distinct()

        table_def_id = self.request.query_params.get('table_definition')
        if table_def_id:
            queryset = queryset.filter(table_definition_id=table_def_id)

        return queryset

    @action(detail=True, methods=['post'])
    def update_rows(self, request, pk=None):
        """
        تعديل صفوف جدول (تعديل خلايا / إضافة / حذف)

        POST /api/reports/table-data/{id}/update_rows/
        {"rows": [...]}
        """
        obj = self.get_object()
        rows = request.data.get('rows')
        if rows is None:
            return DRFResponse({'error': 'حقل rows مطلوب'}, status=400)
        obj.rows = rows
        obj.save(update_fields=['rows', 'updated_at'])
        return DRFResponse(TableDataSerializer(obj).data)


# ============================================
# Skeleton & Text Generation API Endpoints
# ============================================

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def build_skeleton(request):
    """
    بناء الهيكل (Skeleton) لمشروع

    POST /api/reports/build-skeleton/
    {
        "project_id": "uuid",
        "item_ids": [1, 2, 3]  // اختياري
    }

    يقوم بـ:
    1. إنشاء ItemStructure لكل بند (من القالب)
    2. إنشاء GeneratedContent فارغ لكل فقرة
    """
    serializer = SkeletonBuildRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return DRFResponse(serializer.errors, status=400)

    data = serializer.validated_data
    project = get_object_or_404(Project, id=data['project_id'])
    item_ids = data.get('item_ids', [])

    # Get items
    items_qs = Item.objects.filter(axis__template=project.template).order_by('axis__order', 'order')
    if item_ids:
        items_qs = items_qs.filter(id__in=item_ids)

    structures_created = 0
    contents_created = 0
    errors = []

    for item in items_qs:
        try:
            # 1. Create or get ItemStructure
            structure, created = ItemStructure.objects.get_or_create(
                project=project,
                item=item,
                defaults={
                    'components': [],
                    'source': 'template',
                }
            )

            if created:
                # Populate from template
                structure = ItemStructure.create_from_template(project, item)
                structures_created += 1
            elif not structure.components:
                # Repopulate if empty
                temp = ItemStructure.create_from_template(project, item)
                structure.components = temp.components
                structure.save()
                # Delete the temp duplicate
                ItemStructure.objects.filter(
                    project=project, item=item
                ).exclude(id=structure.id).delete()

            # 2. Create GeneratedContent for each paragraph
            for comp in structure.get_paragraphs():
                gc, gc_created = GeneratedContent.objects.get_or_create(
                    item_structure=structure,
                    component_id=comp['id'],
                    defaults={
                        'project': project,
                        'status': 'not_started',
                    }
                )
                if gc_created:
                    contents_created += 1

        except Exception as e:
            errors.append({
                'item': item.code,
                'error': str(e)
            })

    return DRFResponse({
        'status': 'success',
        'structures_created': structures_created,
        'contents_created': contents_created,
        'total_items': items_qs.count(),
        'errors': errors,
        'message': f'تم بناء الهيكل: {structures_created} هيكل، {contents_created} فقرة جاهزة للتوليد',
    })


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def generate_text(request):
    """
    توليد نصوص AI لفقرات الهيكل

    POST /api/reports/generate-text/
    {
        "project_id": "uuid",
        "item_id": 5,           // اختياري — بند معين
        "component_id": "p1",   // اختياري — فقرة معينة
        "structure_id": "uuid", // اختياري — هيكل معين
        "model": "cli",
        "extra_instructions": ""
    }

    """
    serializer = TextGenerateRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return DRFResponse(serializer.errors, status=400)

    data = serializer.validated_data
    project = get_object_or_404(Project, id=data['project_id'])
    model = data.get('model', 'cli')
    extra_instructions = data.get('extra_instructions', '')
    user = request.user if request.user.is_authenticated else None

    # Find target GeneratedContent records
    queryset = GeneratedContent.objects.filter(project=project)

    if data.get('structure_id'):
        queryset = queryset.filter(item_structure_id=data['structure_id'])
    elif data.get('item_id'):
        queryset = queryset.filter(item_structure__item_id=data['item_id'])

    if data.get('component_id'):
        queryset = queryset.filter(component_id=data['component_id'])

    # Filter eligible records
    targets = queryset.filter(status__in=['not_started', 'failed'])
    count = targets.count()

    if count == 0:
        return DRFResponse({
            'status': 'info',
            'message': 'لا توجد فقرات جاهزة للتوليد. تأكد من بناء الهيكل أولاً.',
        })

    # Mark all as generating
    targets.update(status='generating')

    # Call TextGenerator
    from .text_generator import TextGenerator

    generator = TextGenerator(project, model=model)
    results = {
        'generated': [],
        'failed': [],
        'total_cost': 0,
        'total_duration_ms': 0,
    }

    for gc in targets.select_related(
        'item_structure', 'item_structure__item', 'item_structure__item__axis'
    ):
        result = generator.generate_paragraph(
            gc,
            extra_instructions=extra_instructions,
            user=user,
        )
        if result.get('success'):
            results['generated'].append({
                'id': str(gc.id),
                'component_id': gc.component_id,
                'item_code': gc.item_structure.item.code,
                'status': 'generated',
            })
            results['total_cost'] += result.get('cost', 0)
            results['total_duration_ms'] += result.get('duration_ms', 0)
        else:
            results['failed'].append({
                'id': str(gc.id),
                'component_id': gc.component_id,
                'item_code': gc.item_structure.item.code,
                'error': result.get('error', 'Unknown'),
            })

    gen_count = len(results['generated'])
    fail_count = len(results['failed'])

    return DRFResponse({
        'status': 'completed' if not results['failed'] else 'partial',
        'generated_count': gen_count,
        'failed_count': fail_count,
        'total_cost': results['total_cost'],
        'total_duration_ms': results['total_duration_ms'],
        'generated': results['generated'],
        'failed': results['failed'],
        'message': f'تم توليد {gen_count} فقرة من أصل {count}',
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def project_skeleton_status(request, project_id):
    """
    حالة الهيكل لمشروع معين

    GET /api/reports/projects/{project_id}/skeleton-status/
    """
    project = get_object_or_404(Project, id=project_id)

    structures = ItemStructure.objects.filter(project=project)
    contents = GeneratedContent.objects.filter(project=project)

    total_items = Item.objects.filter(axis__template=project.template).count()

    return DRFResponse({
        'project_id': str(project.id),
        'project_name': project.name,
        'total_items': total_items,
        'structures_count': structures.count(),
        'structures_approved': structures.filter(is_approved=True).count(),
        'contents_total': contents.count(),
        'contents_by_status': {
            'not_started': contents.filter(status='not_started').count(),
            'generating': contents.filter(status='generating').count(),
            'generated': contents.filter(status='generated').count(),
            'edited': contents.filter(status='edited').count(),
            'approved': contents.filter(status='approved').count(),
            'failed': contents.filter(status='failed').count(),
        },
        'progress': {
            'structure': int(structures.count() / total_items * 100) if total_items > 0 else 0,
            'generation': int(contents.filter(
                status__in=['generated', 'edited', 'approved']
            ).count() / contents.count() * 100) if contents.count() > 0 else 0,
            'approval': int(contents.filter(
                status='approved'
            ).count() / contents.count() * 100) if contents.count() > 0 else 0,
        },
    })


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def analyze_previous_report(request):
    """
    تحليل تقرير سابق (Word) واستخراج هيكله

    POST /api/reports/analyze-report/
    Body: multipart/form-data with 'file' field
    """
    from .report_analyzer import analyze_uploaded_report

    if 'file' not in request.FILES:
        return DRFResponse(
            {'error': 'يرجى رفع ملف Word (.docx)'},
            status=status.HTTP_400_BAD_REQUEST
        )

    uploaded_file = request.FILES['file']
    if not uploaded_file.name.endswith('.docx'):
        return DRFResponse(
            {'error': 'الملف يجب أن يكون بصيغة .docx'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        file_bytes = uploaded_file.read()
        result = analyze_uploaded_report(file_bytes)

        if 'error' in result and result['error']:
            return DRFResponse(
                {'error': f'فشل في تحليل الملف: {result["error"]}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return DRFResponse(result)
    except Exception as e:
        return DRFResponse(
            {'error': f'خطأ في تحليل الملف: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
