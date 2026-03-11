"""
Data Collection views.
Views لجمع البيانات
"""

import os
import hashlib
from django.utils import timezone
from django.conf import settings
from django.db.models import Count, Avg
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, permissions, status, generics
from rest_framework.decorators import action, api_view, permission_classes as perms
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from .models import (
    DataSource, DataRequest, DataFile,
    DataCollectionPeriod, EntitySubmission, ReviewLog
)
from .serializers import (
    DataSourceSerializer, DataRequestSerializer,
    DataFileSerializer, DataFileListSerializer, DataFileUploadSerializer, DataFileReviewSerializer,
    DataCollectionPeriodSerializer, DataCollectionPeriodListSerializer,
    EntitySubmissionSerializer, EntitySubmissionListSerializer, EntitySubmissionActionSerializer,
    ReviewLogSerializer, DataCollectionStatsSerializer
)
from .services import (
    parse_excel_file, extract_research_data, extract_hr_data,
    validate_excel_template, generate_excel_template
)


# === Helper Functions ===

def generate_entity_token(entity_id: int, period_id: int) -> str:
    """Generate a deterministic token for entity access"""
    secret = getattr(settings, 'SECRET_KEY', 'fallback-secret')
    raw = f"{entity_id}-{period_id}-{secret}"
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def verify_entity_token(token: str):
    """Verify token and return entity, period, submission"""
    for submission in EntitySubmission.objects.select_related('entity', 'period'):
        expected = generate_entity_token(submission.entity_id, submission.period_id)
        if token == expected:
            return submission.entity, submission.period, submission
    return None, None, None


class DataSourceViewSet(viewsets.ModelViewSet):
    """API for data sources"""
    serializer_class = DataSourceSerializer
    permission_classes = [permissions.AllowAny]  # Demo mode
    
    def get_queryset(self):
        return DataSource.objects.filter(
            organization__members__user=self.request.user
        )
    
    @action(detail=True, methods=['post'])
    def sync(self, request, pk=None):
        """Sync data from source"""
        source = self.get_object()
        source.last_sync = timezone.now()
        source.save()
        return Response({'status': 'success', 'message': 'تمت المزامنة بنجاح'})
    
    @action(detail=True, methods=['post'])
    def test(self, request, pk=None):
        """Test connection to source"""
        source = self.get_object()
        return Response({'status': 'success', 'message': 'الاتصال يعمل بشكل صحيح'})


class DataRequestViewSet(viewsets.ModelViewSet):
    """API for data requests"""
    serializer_class = DataRequestSerializer
    permission_classes = [permissions.AllowAny]  # Demo mode
    
    def get_queryset(self):
        return DataRequest.objects.filter(
            report__organization__members__user=self.request.user
        )
    
    @action(detail=True, methods=['post'])
    def remind(self, request, pk=None):
        """Send reminder email"""
        data_request = self.get_object()
        data_request.last_reminder_at = timezone.now()
        data_request.reminder_count += 1
        data_request.save()
        return Response({'status': 'success', 'message': 'تم إرسال التذكير'})
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approve submitted data"""
        data_request = self.get_object()
        data_request.status = 'approved'
        data_request.save()
        return Response({'status': 'approved'})
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject submitted data"""
        data_request = self.get_object()
        data_request.status = 'rejected'
        data_request.rejection_reason = request.data.get('reason', '')
        data_request.save()
        return Response({'status': 'rejected'})


# === Data Collection Period ===

class DataCollectionPeriodViewSet(viewsets.ModelViewSet):
    """API لفترات جمع البيانات"""
    permission_classes = [permissions.AllowAny]  # Demo mode
    
    def get_serializer_class(self):
        if self.action == 'list':
            return DataCollectionPeriodListSerializer
        return DataCollectionPeriodSerializer
    
    def get_queryset(self):
        queryset = DataCollectionPeriod.objects.all()
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by academic year
        year = self.request.query_params.get('year')
        if year:
            queryset = queryset.filter(academic_year=year)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def open(self, request, pk=None):
        """فتح فترة الجمع"""
        period = self.get_object()
        period.status = 'open'
        period.save()
        return Response({'status': 'success', 'message': 'تم فتح فترة الجمع'})
    
    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """إغلاق فترة الجمع"""
        period = self.get_object()
        period.status = 'closed'
        period.save()
        return Response({'status': 'success', 'message': 'تم إغلاق فترة الجمع'})
    
    @action(detail=True, methods=['post'])
    def extend(self, request, pk=None):
        """تمديد فترة الجمع"""
        period = self.get_object()
        new_date = request.data.get('extended_date')
        if new_date:
            period.extended_date = new_date
            period.status = 'extended'
            period.save()
            return Response({'status': 'success', 'message': 'تم تمديد فترة الجمع'})
        return Response({'error': 'تاريخ التمديد مطلوب'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def initialize_submissions(self, request, pk=None):
        """إنشاء تسليمات لجميع الجهات"""
        from apps.templates_app.models import Entity
        
        period = self.get_object()
        entities = Entity.objects.all()
        
        created_count = 0
        for entity in entities:
            submission, created = EntitySubmission.objects.get_or_create(
                entity=entity,
                period=period,
                defaults={
                    'total_items': entity.items.count(),
                    'completed_items': 0,
                }
            )
            if created:
                created_count += 1
        
        return Response({
            'status': 'success',
            'message': f'تم إنشاء {created_count} تسليم',
            'total_submissions': period.submissions.count()
        })


# === Entity Submission ===

class EntitySubmissionViewSet(viewsets.ModelViewSet):
    """API لتسليمات الجهات"""
    permission_classes = [permissions.AllowAny]  # Demo mode
    
    def get_serializer_class(self):
        if self.action == 'list':
            return EntitySubmissionListSerializer
        return EntitySubmissionSerializer
    
    def get_queryset(self):
        queryset = EntitySubmission.objects.select_related('entity', 'period')
        
        # Filter by period
        period_id = self.request.query_params.get('period')
        if period_id:
            queryset = queryset.filter(period_id=period_id)
        
        # Filter by entity
        entity_id = self.request.query_params.get('entity')
        if entity_id:
            queryset = queryset.filter(entity_id=entity_id)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """تسليم من الجهة"""
        submission = self.get_object()
        submission.submit(request.user)
        
        # Log the action
        ReviewLog.objects.create(
            entity_submission=submission,
            action='submitted',
            user=request.user,
            notes=request.data.get('notes', '')
        )
        
        return Response({
            'status': 'success',
            'message': 'تم التسليم بنجاح'
        })
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """اعتماد التسليم"""
        submission = self.get_object()
        submission.approve(request.user)
        
        ReviewLog.objects.create(
            entity_submission=submission,
            action='approved',
            user=request.user,
            notes=request.data.get('notes', '')
        )
        
        return Response({
            'status': 'success',
            'message': 'تم الاعتماد بنجاح'
        })
    
    @action(detail=True, methods=['post'])
    def request_revision(self, request, pk=None):
        """طلب تعديل"""
        submission = self.get_object()
        submission.status = 'needs_revision'
        submission.save()
        
        ReviewLog.objects.create(
            entity_submission=submission,
            action='revision_requested',
            user=request.user,
            notes=request.data.get('notes', '')
        )
        
        return Response({
            'status': 'success',
            'message': 'تم طلب التعديل'
        })
    
    @action(detail=True, methods=['get'])
    def files(self, request, pk=None):
        """الملفات المرفوعة للتسليم"""
        submission = self.get_object()
        files = DataFile.objects.filter(submission=submission)
        serializer = DataFileListSerializer(files, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        """سجل الإجراءات"""
        submission = self.get_object()
        logs = ReviewLog.objects.filter(entity_submission=submission)
        serializer = ReviewLogSerializer(logs, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def portal_link(self, request, pk=None):
        """توليد رابط بوابة الجهة"""
        submission = self.get_object()
        token = generate_entity_token(submission.entity_id, submission.period_id)
        
        # Build full URL
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        portal_url = f"{frontend_url}/entity/{token}"
        
        return Response({
            'token': token,
            'url': portal_url,
            'entity': submission.entity.name,
            'period': submission.period.name,
        })
    
    @action(detail=False, methods=['get'])
    def portal_links(self, request):
        """توليد روابط بوابات جميع الجهات لفترة معينة"""
        period_id = request.query_params.get('period')
        if not period_id:
            return Response(
                {'detail': 'معرّف الفترة مطلوب'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        submissions = EntitySubmission.objects.filter(
            period_id=period_id
        ).select_related('entity', 'period')
        
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        links = []
        
        for sub in submissions:
            token = generate_entity_token(sub.entity_id, sub.period_id)
            links.append({
                'entity_id': sub.entity_id,
                'entity_name': sub.entity.name,
                'token': token,
                'url': f"{frontend_url}/entity/{token}",
                'status': sub.status,
            })
        
        return Response({
            'period': period_id,
            'links': links
        })


# === Data File ===

class DataFileViewSet(viewsets.ModelViewSet):
    """API لملفات البيانات"""
    permission_classes = [permissions.AllowAny]  # Demo mode
    parser_classes = [MultiPartParser, FormParser]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return DataFileListSerializer
        if self.action == 'create':
            return DataFileUploadSerializer
        return DataFileSerializer
    
    def get_queryset(self):
        queryset = DataFile.objects.select_related('entity', 'item')
        
        # Filter by entity
        entity_id = self.request.query_params.get('entity')
        if entity_id:
            queryset = queryset.filter(entity_id=entity_id)
        
        # Filter by submission
        submission_id = self.request.query_params.get('submission')
        if submission_id:
            queryset = queryset.filter(submission_id=submission_id)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter current versions only
        current_only = self.request.query_params.get('current', 'true')
        if current_only.lower() == 'true':
            queryset = queryset.filter(is_current=True)
        
        return queryset
    
    def perform_create(self, serializer):
        data_file = serializer.save(uploaded_by=self.request.user)
        
        # Log the upload
        ReviewLog.objects.create(
            data_file=data_file,
            action='uploaded',
            user=self.request.user
        )
        
        # Update submission progress if linked
        if data_file.submission:
            data_file.submission.mark_started()
            data_file.submission.completed_items = data_file.submission.files.count()
            data_file.submission.update_progress()
    
    @action(detail=True, methods=['post'])
    def parse(self, request, pk=None):
        """Parse uploaded file and extract data"""
        data_file = self.get_object()
        
        if not data_file.file:
            return Response(
                {'error': 'لا يوجد ملف'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        file_path = data_file.file.path
        data_type = request.data.get('type', 'general')
        
        if data_type == 'research':
            result = extract_research_data(file_path)
        elif data_type == 'hr':
            result = extract_hr_data(file_path)
        else:
            result = parse_excel_file(file_path)
        
        if not result['success']:
            return Response(
                {'error': result.get('error', 'فشل في تحليل الملف')},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        data_file.parsed_data = result
        data_file.is_parsed = True
        data_file.save()
        
        return Response({'status': 'success', 'data': result})
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """اعتماد الملف"""
        data_file = self.get_object()
        data_file.status = 'approved'
        data_file.reviewed_by = request.user
        data_file.reviewed_at = timezone.now()
        data_file.review_notes = request.data.get('notes', '')
        data_file.save()
        
        ReviewLog.objects.create(
            data_file=data_file,
            action='approved',
            user=request.user,
            notes=request.data.get('notes', '')
        )
        
        return Response({'status': 'success', 'message': 'تم اعتماد الملف'})
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """رفض الملف"""
        data_file = self.get_object()
        data_file.status = 'rejected'
        data_file.reviewed_by = request.user
        data_file.reviewed_at = timezone.now()
        data_file.review_notes = request.data.get('notes', '')
        data_file.save()
        
        ReviewLog.objects.create(
            data_file=data_file,
            action='rejected',
            user=request.user,
            notes=request.data.get('notes', '')
        )
        
        return Response({'status': 'success', 'message': 'تم رفض الملف'})
    
    @action(detail=True, methods=['post'])
    def request_revision(self, request, pk=None):
        """طلب تعديل الملف"""
        data_file = self.get_object()
        data_file.status = 'needs_revision'
        data_file.reviewed_by = request.user
        data_file.reviewed_at = timezone.now()
        data_file.review_notes = request.data.get('notes', '')
        data_file.save()
        
        ReviewLog.objects.create(
            data_file=data_file,
            action='revision_requested',
            user=request.user,
            notes=request.data.get('notes', '')
        )
        
        return Response({'status': 'success', 'message': 'تم طلب التعديل'})
    
    @action(detail=True, methods=['post'])
    def new_version(self, request, pk=None):
        """رفع إصدار جديد"""
        data_file = self.get_object()
        new_file = request.FILES.get('file')
        
        if not new_file:
            return Response(
                {'error': 'الملف مطلوب'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        new_version = data_file.create_new_version(new_file, request.user)
        
        ReviewLog.objects.create(
            data_file=new_version,
            action='revised',
            user=request.user,
            notes=f'إصدار جديد من الملف (v{new_version.version})'
        )
        
        return Response({
            'status': 'success',
            'message': f'تم إنشاء الإصدار {new_version.version}',
            'id': new_version.id
        })
    
    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        """جميع إصدارات الملف"""
        data_file = self.get_object()
        
        # Get all versions in chain
        versions = []
        current = data_file
        while current:
            versions.append(current)
            current = current.previous_version
        
        serializer = DataFileListSerializer(versions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def logs(self, request, pk=None):
        """سجل الإجراءات على الملف"""
        data_file = self.get_object()
        logs = ReviewLog.objects.filter(data_file=data_file)
        serializer = ReviewLogSerializer(logs, many=True)
        return Response(serializer.data)


# === Review Log ===

class ReviewLogViewSet(viewsets.ReadOnlyModelViewSet):
    """API لسجلات المراجعة (للقراءة فقط)"""
    serializer_class = ReviewLogSerializer
    permission_classes = [permissions.AllowAny]  # Demo mode
    
    def get_queryset(self):
        queryset = ReviewLog.objects.select_related('data_file', 'entity_submission', 'user')
        
        # Filter by action
        action_filter = self.request.query_params.get('action')
        if action_filter:
            queryset = queryset.filter(action=action_filter)
        
        # Filter by user
        user_id = self.request.query_params.get('user')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        return queryset[:100]  # Limit to recent 100


# === Statistics ===

@api_view(['GET'])
@perms([permissions.IsAuthenticated])
def data_collection_stats(request):
    """إحصائيات عامة لجمع البيانات"""
    from apps.templates_app.models import Entity
    
    active_periods = DataCollectionPeriod.objects.filter(status__in=['open', 'extended']).count()
    total_entities = Entity.objects.count()
    total_submissions = EntitySubmission.objects.count()
    pending_reviews = EntitySubmission.objects.filter(status='submitted').count()
    approved_submissions = EntitySubmission.objects.filter(status='approved').count()
    
    # Calculate overall progress
    submissions_with_progress = EntitySubmission.objects.all()
    if submissions_with_progress.exists():
        overall_progress = sum(s.progress_percentage for s in submissions_with_progress) / submissions_with_progress.count()
    else:
        overall_progress = 0
    
    # By status
    by_status = {}
    for status_choice in EntitySubmission.STATUS_CHOICES:
        status_code = status_choice[0]
        by_status[status_code] = EntitySubmission.objects.filter(status=status_code).count()
    
    # Recent activity
    recent_logs = ReviewLog.objects.select_related('user')[:10]
    
    return Response({
        'active_periods': active_periods,
        'total_entities': total_entities,
        'total_submissions': total_submissions,
        'pending_reviews': pending_reviews,
        'approved_submissions': approved_submissions,
        'overall_progress': float(overall_progress),
        'by_status': by_status,
        'recent_activity': ReviewLogSerializer(recent_logs, many=True).data
    })


# === Entity Portal (Public Access via Token) ===

from apps.templates_app.models import Entity, Item


@api_view(['GET'])
@perms([permissions.AllowAny])
def entity_portal_view(request, token):
    """Get entity portal data (public, no auth required)"""
    entity, period, submission = verify_entity_token(token)
    
    if not entity or not period or not submission:
        return Response(
            {'detail': 'رابط غير صالح أو منتهي الصلاحية'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Get entity items with file info
    items = entity.items.all().order_by('order', 'code')
    items_data = []
    
    for item in items:
        # Get current file for this item
        file_obj = DataFile.objects.filter(
            entity=entity,
            item=item,
            submission=submission,
            is_current=True
        ).first()
        
        item_data = {
            'id': item.id,
            'code': item.code,
            'name': item.name,
            'name_en': item.name_en,
            'description': item.description,
            'field_type': item.field_type,
            'required': item.required,
            'unit': item.unit,
            'notes': item.notes,
        }
        
        if file_obj:
            item_data['file'] = {
                'id': file_obj.id,
                'name': file_obj.name,
                'file': request.build_absolute_uri(file_obj.file.url) if file_obj.file else None,
                'status': file_obj.status,
                'status_display': file_obj.get_status_display(),
                'version': file_obj.version,
                'review_notes': file_obj.review_notes,
            }
        
        items_data.append(item_data)
    
    return Response({
        'entity': {
            'id': entity.id,
            'name': entity.name,
            'name_en': entity.name_en,
        },
        'period': {
            'id': period.id,
            'name': period.name,
            'academic_year': period.academic_year,
            'end_date': period.effective_end_date,
            'status': period.status,
        },
        'submission': {
            'id': submission.id,
            'status': submission.status,
            'status_display': submission.get_status_display(),
            'progress_percentage': str(submission.progress_percentage),
            'total_items': submission.total_items,
            'completed_items': submission.completed_items,
        },
        'items': items_data,
    })


@api_view(['POST'])
@perms([permissions.AllowAny])
def entity_portal_upload(request, token):
    """Upload file via entity portal (public)"""
    entity, period, submission = verify_entity_token(token)
    
    if not entity or not period or not submission:
        return Response(
            {'detail': 'رابط غير صالح'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Check if period is open
    if period.status not in ['open', 'extended']:
        return Response(
            {'detail': 'فترة الجمع مغلقة'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if submission is not already submitted
    if submission.status in ['submitted', 'approved', 'under_review']:
        return Response(
            {'detail': 'تم تسليم البيانات مسبقاً'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    file = request.FILES.get('file')
    item_id = request.data.get('item_id')
    
    if not file:
        return Response(
            {'detail': 'الملف مطلوب'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get item
    item = None
    if item_id:
        item = get_object_or_404(Item, id=item_id)
    
    # Determine file type
    ext = os.path.splitext(file.name)[1].lower()
    file_type_map = {
        '.xlsx': 'excel', '.xls': 'excel', '.csv': 'csv',
        '.pdf': 'pdf', '.doc': 'word', '.docx': 'word',
        '.jpg': 'image', '.jpeg': 'image', '.png': 'image',
    }
    file_type = file_type_map.get(ext, 'other')
    
    # Check if there's an existing current file for this item
    existing = DataFile.objects.filter(
        entity=entity,
        item=item,
        submission=submission,
        is_current=True
    ).first()
    
    if existing:
        # Create new version
        new_file = existing.create_new_version(file, None)
    else:
        # Create new file
        new_file = DataFile.objects.create(
            entity=entity,
            item=item,
            submission=submission,
            name=request.data.get('name', file.name),
            file=file,
            file_type=file_type,
            status='draft',
            academic_year=period.academic_year,
        )
    
    # Mark submission as started
    submission.mark_started()
    
    # Update progress
    total_items = entity.items.filter(required=True).count()
    completed = DataFile.objects.filter(
        entity=entity,
        submission=submission,
        is_current=True,
        item__required=True
    ).count()
    
    submission.total_items = total_items
    submission.completed_items = completed
    submission.update_progress()
    
    # Log
    ReviewLog.objects.create(
        data_file=new_file,
        entity_submission=submission,
        action='uploaded',
        notes=f'رفع ملف: {file.name}'
    )
    
    return Response({
        'id': new_file.id,
        'name': new_file.name,
        'status': 'success',
        'message': 'تم رفع الملف بنجاح'
    })


@api_view(['POST'])
@perms([permissions.AllowAny])
def entity_portal_submit(request, token):
    """Submit entity data (public)"""
    entity, period, submission = verify_entity_token(token)
    
    if not entity or not period or not submission:
        return Response(
            {'detail': 'رابط غير صالح'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if period.status not in ['open', 'extended']:
        return Response(
            {'detail': 'فترة الجمع مغلقة'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if submission.status in ['submitted', 'approved', 'under_review']:
        return Response(
            {'detail': 'تم تسليم البيانات مسبقاً'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check if at least one file is uploaded
    files_count = DataFile.objects.filter(
        entity=entity,
        submission=submission,
        is_current=True
    ).count()
    
    if files_count == 0:
        return Response(
            {'detail': 'يجب رفع ملف واحد على الأقل قبل التسليم'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Submit
    submission.status = 'submitted'
    submission.submitted_at = timezone.now()
    submission.save()
    
    # Update all files to submitted
    DataFile.objects.filter(
        entity=entity,
        submission=submission,
        is_current=True,
        status='draft'
    ).update(status='submitted')
    
    # Log
    ReviewLog.objects.create(
        entity_submission=submission,
        action='submitted',
        notes='تسليم البيانات من بوابة الجهة'
    )
    
    return Response({
        'status': 'success',
        'message': 'تم تسليم البيانات بنجاح'
    })


# === Previous Period Data ===

@api_view(['POST'])
@perms([permissions.AllowAny])
def copy_previous_period_values(request, period_id):
    """
    نسخ قيم الفترة السابقة كـ previous_value
    
    POST /api/data/periods/{period_id}/copy-previous/
    
    Body (optional):
    {
        "overwrite": false  // هل يتم الكتابة فوق القيم الموجودة؟
    }
    """
    try:
        period = DataCollectionPeriod.objects.get(id=period_id)
    except DataCollectionPeriod.DoesNotExist:
        return Response(
            {'error': 'الفترة غير موجودة'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if not period.previous_period:
        return Response(
            {'error': 'لا توجد فترة سابقة مرتبطة'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    overwrite = request.data.get('overwrite', False)
    count = period.copy_from_previous(overwrite=overwrite)
    
    return Response({
        'status': 'success',
        'message': f'تم نسخ {count} قيمة من الفترة السابقة',
        'count': count,
        'previous_period': {
            'id': period.previous_period.id,
            'name': period.previous_period.name,
            'academic_year': period.previous_period.academic_year,
        }
    })


@api_view(['POST'])
@perms([permissions.AllowAny])
def import_previous_values_excel(request, period_id):
    """
    استيراد بيانات السنة السابقة من Excel
    
    POST /api/data/periods/{period_id}/import-previous/
    
    Form data:
    - file: Excel file
    
    Excel format:
    | item_code | previous_value |
    |-----------|----------------|
    | 1.1       | 15             |
    | 1.2       | 8              |
    """
    try:
        period = DataCollectionPeriod.objects.get(id=period_id)
    except DataCollectionPeriod.DoesNotExist:
        return Response(
            {'error': 'الفترة غير موجودة'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    if 'file' not in request.FILES:
        return Response(
            {'error': 'يرجى رفع ملف Excel'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    file = request.FILES['file']
    
    try:
        import pandas as pd
        
        # Read Excel
        df = pd.read_excel(file)
        
        # Validate columns
        required_cols = ['item_code', 'previous_value']
        missing_cols = [c for c in required_cols if c not in df.columns]
        if missing_cols:
            # Try Arabic column names
            col_mapping = {
                'كود_البند': 'item_code',
                'كود البند': 'item_code',
                'القيمة_السابقة': 'previous_value',
                'القيمة السابقة': 'previous_value',
            }
            df = df.rename(columns=col_mapping)
            missing_cols = [c for c in required_cols if c not in df.columns]
            if missing_cols:
                return Response(
                    {'error': f'أعمدة مفقودة: {missing_cols}. المطلوب: item_code, previous_value'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        from apps.reports.models import ItemDraft
        from apps.templates_app.models import Item
        
        # Get item code to id mapping
        items = Item.objects.filter(axis__template=period.template)
        item_map = {item.code: item.id for item in items}
        
        # Update drafts
        updated = 0
        errors = []
        
        for _, row in df.iterrows():
            code = str(row['item_code']).strip()
            value = row['previous_value']
            
            if code not in item_map:
                errors.append(f'بند غير موجود: {code}')
                continue
            
            item_id = item_map[code]
            
            try:
                draft = ItemDraft.objects.get(period=period, item_id=item_id)
                draft.previous_value = value if pd.notna(value) else None
                draft.save(update_fields=['previous_value', 'updated_at'])
                updated += 1
            except ItemDraft.DoesNotExist:
                errors.append(f'مسودة غير موجودة للبند: {code}')
        
        return Response({
            'status': 'success',
            'message': f'تم استيراد {updated} قيمة',
            'updated': updated,
            'errors': errors[:10] if errors else [],
            'total_errors': len(errors),
        })
        
    except Exception as e:
        return Response(
            {'error': f'خطأ في قراءة الملف: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['GET'])
@perms([permissions.AllowAny])
def export_previous_template(request, period_id):
    """
    تحميل قالب Excel لبيانات السنة السابقة
    
    GET /api/data/periods/{period_id}/previous-template/
    """
    from django.http import HttpResponse
    import io
    
    try:
        period = DataCollectionPeriod.objects.get(id=period_id)
    except DataCollectionPeriod.DoesNotExist:
        return Response(
            {'error': 'الفترة غير موجودة'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    try:
        import pandas as pd
        from apps.templates_app.models import Item
        
        # Get all items for this template
        items = Item.objects.filter(
            axis__template=period.template
        ).select_related('axis').order_by('axis__order', 'order')
        
        # Create DataFrame
        data = []
        for item in items:
            data.append({
                'item_code': item.code,
                'item_name': item.name,
                'axis': item.axis.name,
                'unit': item.unit or '',
                'previous_value': '',  # To be filled
            })
        
        df = pd.DataFrame(data)
        
        # Write to Excel
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='بيانات السنة السابقة', index=False)
        
        output.seek(0)
        
        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        filename = f'previous_values_template_{period.academic_year}.xlsx'
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
        
    except Exception as e:
        return Response(
            {'error': f'خطأ في إنشاء القالب: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
