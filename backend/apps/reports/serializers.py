"""
Serializers for Reports app.
"""

from rest_framework import serializers
from apps.templates_app.serializers import (
    ItemSerializer, EntitySerializer, TemplateSerializer
)
from .models import (
    Project, Contributor, Response, TableData, GeneratedReport,
    ItemStructure, GeneratedContent
)


class ResponseSerializer(serializers.ModelSerializer):
    """Serializer for Response"""
    display_value = serializers.SerializerMethodField()
    item_code = serializers.CharField(source='item.code', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)

    class Meta:
        model = Response
        fields = [
            'id', 'project', 'contributor', 'item',
            'item_code', 'item_name',
            'value', 'display_value', 'attachments',
            'is_valid', 'validation_errors',
            'admin_value', 'admin_note',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_display_value(self, obj):
        return obj.get_display_value()


class ResponseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating responses"""

    class Meta:
        model = Response
        fields = ['item', 'value', 'attachments']

    def create(self, validated_data):
        # Get project and contributor from context
        project = self.context.get('project')
        contributor = self.context.get('contributor')

        validated_data['project'] = project
        validated_data['contributor'] = contributor

        # Update or create
        response, created = Response.objects.update_or_create(
            project=project,
            contributor=contributor,
            item=validated_data['item'],
            defaults={
                'value': validated_data.get('value'),
                'attachments': validated_data.get('attachments', [])
            }
        )
        return response


class TableDataSerializer(serializers.ModelSerializer):
    """Serializer for TableData"""
    rows_count = serializers.ReadOnlyField()
    table_name = serializers.CharField(source='table_definition.name', read_only=True)

    class Meta:
        model = TableData
        fields = [
            'id', 'project', 'contributor', 'table_definition',
            'table_name', 'rows', 'rows_count',
            'source_file', 'is_valid', 'validation_errors',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ContributorSerializer(serializers.ModelSerializer):
    """Serializer for Contributor"""
    entity_name = serializers.CharField(source='entity.name', read_only=True)
    entity_priority = serializers.CharField(source='entity.priority', read_only=True)
    progress = serializers.ReadOnlyField()
    items_count = serializers.ReadOnlyField()
    completed_items_count = serializers.ReadOnlyField()

    class Meta:
        model = Contributor
        fields = [
            'id', 'project', 'entity', 'entity_name', 'entity_priority',
            'name', 'email', 'phone', 'invite_token',
            'status', 'progress', 'items_count', 'completed_items_count',
            'invite_sent_at', 'first_access_at', 'last_access_at', 'submitted_at',
            'notes'
        ]
        read_only_fields = [
            'id', 'invite_token', 'progress',
            'items_count', 'completed_items_count',
            'first_access_at', 'last_access_at'
        ]


class ContributorDetailSerializer(ContributorSerializer):
    """Detailed contributor with items and responses"""
    items = ItemSerializer(many=True, read_only=True)
    responses = ResponseSerializer(many=True, read_only=True)

    class Meta(ContributorSerializer.Meta):
        fields = ContributorSerializer.Meta.fields + ['items', 'responses']


class ContributorFormSerializer(serializers.Serializer):
    """
    Serializer for contributor form (public access).
    Returns the items they need to fill.
    """
    project_name = serializers.CharField(read_only=True)
    organization_name = serializers.CharField(read_only=True)
    entity_name = serializers.CharField(read_only=True)
    deadline = serializers.DateField(read_only=True)
    items = ItemSerializer(many=True, read_only=True)
    responses = ResponseSerializer(many=True, read_only=True)
    progress = serializers.IntegerField(read_only=True)
    status = serializers.CharField(read_only=True)


class GeneratedReportSerializer(serializers.ModelSerializer):
    """Serializer for GeneratedReport"""
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = GeneratedReport
        fields = [
            'id', 'project', 'format', 'status',
            'progress', 'current_step',
            'file', 'file_size', 'download_url', 'options',
            'error_message', 'created_by',
            'created_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'file', 'file_size', 'status', 'progress', 'current_step',
            'error_message', 'created_at', 'completed_at'
        ]

    def get_download_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class ProjectSerializer(serializers.ModelSerializer):
    """Basic Project serializer"""
    template_name = serializers.CharField(source='template.name', read_only=True)
    organization_name = serializers.CharField(source='organization.name', read_only=True)
    progress = serializers.ReadOnlyField()
    items_progress = serializers.ReadOnlyField()
    days_remaining = serializers.ReadOnlyField()
    contributors_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'period', 'period_start', 'period_end',
            'template', 'template_name',
            'organization', 'organization_name',
            'status', 'deadline', 'days_remaining',
            'progress', 'items_progress', 'contributors_count',
            'created_at', 'updated_at', 'published_at'
        ]
        read_only_fields = [
            'id', 'progress', 'items_progress',
            'days_remaining', 'created_at', 'updated_at'
        ]

    def get_contributors_count(self, obj):
        return obj.contributors.count()


class ProjectDetailSerializer(ProjectSerializer):
    """Detailed Project serializer"""
    template = TemplateSerializer(read_only=True)
    contributors = ContributorSerializer(many=True, read_only=True)
    generated_reports = GeneratedReportSerializer(many=True, read_only=True)

    class Meta(ProjectSerializer.Meta):
        fields = ProjectSerializer.Meta.fields + [
            'previous_year_data', 'settings',
            'contributors', 'generated_reports'
        ]


class ProjectCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating projects"""

    class Meta:
        model = Project
        fields = [
            'name', 'period', 'period_start', 'period_end',
            'template', 'organization', 'deadline', 'settings'
        ]

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        project = super().create(validated_data)

        # Auto-create contributors from template entities
        project.create_contributors_from_template()

        return project


class ProjectStatsSerializer(serializers.Serializer):
    """Serializer for project statistics"""
    total_items = serializers.IntegerField()
    completed_items = serializers.IntegerField()
    items_progress = serializers.IntegerField()

    total_contributors = serializers.IntegerField()
    contributors_completed = serializers.IntegerField()
    contributors_in_progress = serializers.IntegerField()
    contributors_pending = serializers.IntegerField()

    deadline = serializers.DateField()
    days_remaining = serializers.IntegerField()

    status = serializers.CharField()


class AggregatedDataSerializer(serializers.Serializer):
    """Serializer for aggregated project data"""
    items = serializers.ListField()
    tables = serializers.ListField()
    completeness = serializers.DictField()


# ============================================
# Skeleton-First Workflow Serializers
# ============================================


class GeneratedContentSerializer(serializers.ModelSerializer):
    """Serializer for GeneratedContent — محتوى مولّد لفقرة واحدة"""

    item_code = serializers.CharField(source='item_structure.item.code', read_only=True)
    item_name = serializers.CharField(source='item_structure.item.name', read_only=True)
    final_content = serializers.ReadOnlyField()

    class Meta:
        model = GeneratedContent
        fields = [
            'id', 'item_structure', 'project', 'component_id',
            'item_code', 'item_name',
            'content', 'manual_edit', 'final_content',
            'status', 'version',
            'ai_model', 'ai_tokens_input', 'ai_tokens_output',
            'ai_cost', 'generation_time_ms',
            'prompt_used',
            'generated_at', 'edited_at', 'approved_at',
            'generated_by', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'version', 'final_content',
            'ai_model', 'ai_tokens_input', 'ai_tokens_output',
            'ai_cost', 'generation_time_ms', 'prompt_used',
            'generated_at', 'edited_at', 'approved_at',
            'created_at', 'updated_at',
        ]


class GeneratedContentEditSerializer(serializers.Serializer):
    """Serializer for editing generated content manually"""
    content = serializers.CharField(help_text='النص المعدّل يدوياً')


class GeneratedContentRegenerateSerializer(serializers.Serializer):
    """Serializer for regenerating a single paragraph"""
    model = serializers.ChoiceField(
        choices=['gemini', 'claude', 'cli'],
        default='cli',
        help_text='نموذج AI للتوليد'
    )
    extra_instructions = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text='تعليمات إضافية للـ AI'
    )


class ItemStructureSerializer(serializers.ModelSerializer):
    """Serializer for ItemStructure — هيكل البند"""

    item_code = serializers.CharField(source='item.code', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)
    axis_code = serializers.CharField(source='item.axis.code', read_only=True)
    axis_name = serializers.CharField(source='item.axis.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    components_count = serializers.ReadOnlyField()
    paragraphs_count = serializers.ReadOnlyField()
    tables_count = serializers.ReadOnlyField()
    charts_count = serializers.ReadOnlyField()

    # المحتويات المولّدة لكل فقرة
    generated_contents = GeneratedContentSerializer(many=True, read_only=True)

    class Meta:
        model = ItemStructure
        fields = [
            'id', 'project', 'item',
            'item_code', 'item_name', 'axis_code', 'axis_name',
            'project_name',
            'components', 'source', 'style_sample', 'is_approved',
            'components_count', 'paragraphs_count', 'tables_count', 'charts_count',
            'generated_contents',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'components_count', 'paragraphs_count',
            'tables_count', 'charts_count',
            'created_at', 'updated_at',
        ]


class ItemStructureUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating item structure components"""

    class Meta:
        model = ItemStructure
        fields = ['components', 'style_sample', 'is_approved']


class ItemStructureCreateFromTemplateSerializer(serializers.Serializer):
    """Serializer for creating structures from template for a project"""
    project_id = serializers.UUIDField(help_text='ID المشروع')
    item_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text='قائمة IDs البنود. إذا فارغة = كل بنود القالب'
    )
    overwrite = serializers.BooleanField(
        default=False,
        help_text='إعادة إنشاء حتى لو موجود'
    )


class SkeletonBuildRequestSerializer(serializers.Serializer):
    """Serializer for building skeleton for a project"""
    project_id = serializers.UUIDField(help_text='ID المشروع')
    item_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text='بنود محددة. إذا فارغة = كل البنود'
    )


class TextGenerateRequestSerializer(serializers.Serializer):
    """Serializer for generating text for paragraphs"""
    project_id = serializers.UUIDField(help_text='ID المشروع')
    item_id = serializers.IntegerField(
        required=False,
        help_text='بند معين لتوليد كل فقراته'
    )
    component_id = serializers.CharField(
        required=False,
        help_text='فقرة معينة لإعادة توليدها (مثل p1)'
    )
    structure_id = serializers.UUIDField(
        required=False,
        help_text='ID هيكل البند'
    )
    model = serializers.ChoiceField(
        choices=['gemini', 'claude', 'cli'],
        default='cli',
        help_text='نموذج AI'
    )
    extra_instructions = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text='تعليمات إضافية للـ AI'
    )
