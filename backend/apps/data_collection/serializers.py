"""
Data Collection serializers.
Serializers لجمع البيانات
"""

from rest_framework import serializers
from django.utils import timezone
from .models import (
    DataSource, DataRequest, DataFile,
    DataCollectionPeriod, EntitySubmission, ReviewLog
)


class DataSourceSerializer(serializers.ModelSerializer):
    source_type_display = serializers.CharField(source='get_source_type_display', read_only=True)
    
    class Meta:
        model = DataSource
        fields = [
            'id', 'organization', 'name', 'description',
            'source_type', 'source_type_display', 'config',
            'is_active', 'last_sync', 'created_at'
        ]
        read_only_fields = ['last_sync', 'created_at']


class DataRequestSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    submission_url = serializers.CharField(read_only=True)
    
    class Meta:
        model = DataRequest
        fields = [
            'id', 'report', 'section', 'requested_from', 'email',
            'token', 'template_file', 'submitted_file',
            'status', 'status_display', 'notes', 'rejection_reason',
            'due_date', 'requested_at', 'submitted_at',
            'last_reminder_at', 'reminder_count', 'submission_url'
        ]
        read_only_fields = ['token', 'requested_at', 'submitted_at', 'last_reminder_at', 'reminder_count']


# === Data Collection Period ===

class DataCollectionPeriodSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    effective_end_date = serializers.DateField(read_only=True)
    template_name = serializers.CharField(source='template.name', read_only=True)
    previous_period_name = serializers.CharField(source='previous_period.name', read_only=True)
    submissions_count = serializers.SerializerMethodField()
    progress_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = DataCollectionPeriod
        fields = [
            'id', 'name', 'academic_year',
            'start_date', 'end_date', 'extended_date', 'effective_end_date',
            'status', 'status_display', 'is_active',
            'reminder_days', 'template', 'template_name', 'organization',
            'previous_period', 'previous_period_name',
            'submissions_count', 'progress_summary',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_submissions_count(self, obj):
        return {
            'total': obj.submissions.count(),
            'not_started': obj.submissions.filter(status='not_started').count(),
            'in_progress': obj.submissions.filter(status='in_progress').count(),
            'submitted': obj.submissions.filter(status='submitted').count(),
            'approved': obj.submissions.filter(status='approved').count(),
            'needs_revision': obj.submissions.filter(status='needs_revision').count(),
        }
    
    def get_progress_summary(self, obj):
        submissions = obj.submissions.all()
        if not submissions.exists():
            return {'average_progress': 0, 'completion_rate': 0}
        
        total = submissions.count()
        completed = submissions.filter(status='approved').count()
        avg_progress = sum(s.progress_percentage for s in submissions) / total
        
        return {
            'average_progress': round(float(avg_progress), 2),
            'completion_rate': round((completed / total) * 100, 2) if total > 0 else 0
        }


class DataCollectionPeriodListSerializer(serializers.ModelSerializer):
    """نسخة مختصرة للقوائم"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = DataCollectionPeriod
        fields = ['id', 'name', 'academic_year', 'status', 'status_display', 'is_active', 'start_date', 'end_date']


# === Entity Submission ===

class EntitySubmissionSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    entity_name = serializers.CharField(source='entity.name', read_only=True)
    entity_type = serializers.CharField(source='entity.entity_type', read_only=True)
    period_name = serializers.CharField(source='period.name', read_only=True)
    academic_year = serializers.CharField(source='period.academic_year', read_only=True)
    files_count = serializers.SerializerMethodField()
    submitted_by_name = serializers.CharField(source='submitted_by.get_full_name', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.get_full_name', read_only=True)
    
    class Meta:
        model = EntitySubmission
        fields = [
            'id', 'entity', 'entity_name', 'entity_type',
            'period', 'period_name', 'academic_year',
            'status', 'status_display',
            'total_items', 'completed_items', 'progress_percentage',
            'started_at', 'submitted_at', 'approved_at',
            'submitted_by', 'submitted_by_name',
            'approved_by', 'approved_by_name',
            'notes', 'files_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'started_at', 'submitted_at', 'approved_at',
            'progress_percentage', 'created_at', 'updated_at'
        ]
    
    def get_files_count(self, obj):
        return obj.files.count()


class EntitySubmissionListSerializer(serializers.ModelSerializer):
    """نسخة مختصرة للقوائم"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    entity_name = serializers.CharField(source='entity.name', read_only=True)
    
    class Meta:
        model = EntitySubmission
        fields = [
            'id', 'entity', 'entity_name', 'period',
            'status', 'status_display', 'progress_percentage'
        ]


class EntitySubmissionActionSerializer(serializers.Serializer):
    """للإجراءات على التسليم"""
    action = serializers.ChoiceField(choices=['submit', 'approve', 'reject', 'request_revision'])
    notes = serializers.CharField(required=False, allow_blank=True)


# === Data File ===

class DataFileSerializer(serializers.ModelSerializer):
    file_type_display = serializers.CharField(source='get_file_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    entity_name = serializers.CharField(source='entity.name', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.get_full_name', read_only=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = DataFile
        fields = [
            'id', 'entity', 'entity_name', 'item', 'item_name',
            'submission', 'report', 'section',
            'name', 'file', 'file_url', 'file_type', 'file_type_display',
            'description', 'academic_year', 'period_start', 'period_end',
            'status', 'status_display',
            'version', 'is_current', 'previous_version',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'review_notes',
            'is_parsed', 'parsed_data'
        ]
        read_only_fields = [
            'uploaded_at', 'reviewed_at', 'version', 'is_current',
            'is_parsed', 'parsed_data'
        ]
        extra_kwargs = {
            'report': {'required': False, 'allow_null': True},
            'section': {'required': False, 'allow_null': True},
            'item': {'required': False, 'allow_null': True},
            'submission': {'required': False, 'allow_null': True},
        }
    
    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class DataFileListSerializer(serializers.ModelSerializer):
    """نسخة مختصرة للقوائم"""
    file_type_display = serializers.CharField(source='get_file_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    entity_name = serializers.CharField(source='entity.name', read_only=True)
    
    class Meta:
        model = DataFile
        fields = [
            'id', 'name', 'entity', 'entity_name',
            'file_type', 'file_type_display',
            'status', 'status_display',
            'version', 'is_current', 'uploaded_at'
        ]


class DataFileUploadSerializer(serializers.ModelSerializer):
    """لرفع ملف جديد"""
    
    class Meta:
        model = DataFile
        fields = [
            'entity', 'item', 'submission',
            'name', 'file', 'file_type', 'description',
            'academic_year', 'period_start', 'period_end'
        ]
    
    def create(self, validated_data):
        validated_data['uploaded_by'] = self.context['request'].user
        validated_data['status'] = 'draft'
        return super().create(validated_data)


class DataFileReviewSerializer(serializers.Serializer):
    """لمراجعة ملف"""
    action = serializers.ChoiceField(choices=['approve', 'reject', 'request_revision'])
    notes = serializers.CharField(required=False, allow_blank=True)


class DataFileVersionSerializer(serializers.Serializer):
    """لإنشاء إصدار جديد"""
    file = serializers.FileField()
    description = serializers.CharField(required=False, allow_blank=True)


# === Review Log ===

class ReviewLogSerializer(serializers.ModelSerializer):
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    target_type = serializers.SerializerMethodField()
    target_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ReviewLog
        fields = [
            'id', 'data_file', 'entity_submission',
            'target_type', 'target_name',
            'action', 'action_display',
            'user', 'user_name', 'timestamp',
            'notes', 'extra_data'
        ]
        read_only_fields = ['timestamp']
    
    def get_target_type(self, obj):
        if obj.data_file:
            return 'file'
        if obj.entity_submission:
            return 'submission'
        return None
    
    def get_target_name(self, obj):
        if obj.data_file:
            return obj.data_file.name
        if obj.entity_submission:
            return obj.entity_submission.entity.name
        return None


# === Dashboard / Statistics ===

class DataCollectionStatsSerializer(serializers.Serializer):
    """إحصائيات عامة لجمع البيانات"""
    active_periods = serializers.IntegerField()
    total_entities = serializers.IntegerField()
    total_submissions = serializers.IntegerField()
    pending_reviews = serializers.IntegerField()
    approved_submissions = serializers.IntegerField()
    overall_progress = serializers.FloatField()
    
    by_status = serializers.DictField()
    recent_activity = ReviewLogSerializer(many=True)


class EntityProgressSerializer(serializers.Serializer):
    """تقدم جهة معينة"""
    entity_id = serializers.IntegerField()
    entity_name = serializers.CharField()
    total_items = serializers.IntegerField()
    completed_items = serializers.IntegerField()
    progress_percentage = serializers.FloatField()
    files_uploaded = serializers.IntegerField()
    status = serializers.CharField()
