"""
Serializers for Reports app.
"""

from rest_framework import serializers
from apps.templates_app.serializers import (
    ItemSerializer, EntitySerializer, TemplateSerializer
)
from .models import (
    Project, Contributor, Response, TableData, GeneratedReport,
    Report, ReportSection, ReportImage, ReportChart
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
# Legacy serializers
# ============================================

class ReportSectionSerializer(serializers.ModelSerializer):
    """Legacy ReportSection serializer"""
    
    class Meta:
        model = ReportSection
        fields = [
            'id', 'report', 'template_section', 'title', 'order',
            'content', 'content_html', 'data', 'status',
            'generated_at', 'edited_by', 'edited_at'
        ]


class ReportImageSerializer(serializers.ModelSerializer):
    """ReportImage serializer"""
    
    class Meta:
        model = ReportImage
        fields = ['id', 'report', 'section', 'image', 'caption', 'order']


class ReportChartSerializer(serializers.ModelSerializer):
    """ReportChart serializer"""
    
    class Meta:
        model = ReportChart
        fields = [
            'id', 'section', 'title', 'chart_type',
            'data', 'settings', 'image', 'order'
        ]


class ReportSerializer(serializers.ModelSerializer):
    """Legacy Report serializer"""
    progress = serializers.ReadOnlyField()
    period_display = serializers.ReadOnlyField()
    
    class Meta:
        model = Report
        fields = [
            'id', 'organization', 'template', 'title',
            'period_start', 'period_end', 'period_display',
            'status', 'progress', 'created_by',
            'created_at', 'updated_at', 'generated_at',
            'exported_file', 'exported_at'
        ]


class ReportDetailSerializer(ReportSerializer):
    """Detailed Report serializer with sections"""
    sections = ReportSectionSerializer(many=True, read_only=True)
    images = ReportImageSerializer(many=True, read_only=True)
    
    class Meta(ReportSerializer.Meta):
        fields = ReportSerializer.Meta.fields + ['sections', 'images']


# ============================================
# AxisDraft serializers - توليد التقارير
# ============================================

from .models import AxisDraft, ItemDraft


class ItemDraftSerializer(serializers.ModelSerializer):
    """Serializer for ItemDraft — مسودة البند"""
    
    item_code = serializers.CharField(source='item.code', read_only=True)
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_unit = serializers.CharField(source='item.unit', read_only=True)
    axis_id = serializers.IntegerField(source='item.axis_id', read_only=True)
    axis_code = serializers.CharField(source='item.axis.code', read_only=True)
    axis_name = serializers.CharField(source='item.axis.name', read_only=True)
    period_name = serializers.CharField(source='period.name', read_only=True)
    academic_year = serializers.CharField(source='period.academic_year', read_only=True)
    
    class Meta:
        model = ItemDraft
        fields = [
            'id', 'period', 'item',
            'item_code', 'item_name', 'item_unit',
            'axis_id', 'axis_code', 'axis_name',
            'period_name', 'academic_year',
            'content',
            'current_value', 'previous_value', 'change_percentage',
            'status', 'version',
            # AI metadata
            'ai_model', 'ai_tokens_input', 'ai_tokens_output',
            'ai_cost', 'generation_time_ms',
            # التواريخ
            'generated_at', 'edited_at', 'approved_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'status', 'version',
            'current_value', 'previous_value', 'change_percentage',
            'ai_model', 'ai_tokens_input', 'ai_tokens_output',
            'ai_cost', 'generation_time_ms',
            'generated_at', 'edited_at', 'approved_at',
            'created_at', 'updated_at',
        ]


class ItemDraftEditSerializer(serializers.ModelSerializer):
    """Serializer for editing ItemDraft content"""
    
    class Meta:
        model = ItemDraft
        fields = ['content']


class GenerateItemsRequestSerializer(serializers.Serializer):
    """Serializer for item generation request"""
    
    period_id = serializers.IntegerField(help_text="ID فترة الجمع")
    items = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="قائمة IDs البنود للتوليد"
    )
    axis_id = serializers.IntegerField(
        required=False,
        help_text="ID المحور لتوليد كل بنوده"
    )
    model = serializers.ChoiceField(
        choices=['gemini', 'claude', 'cli'],
        default='cli',
        help_text="نموذج AI للتوليد"
    )
    regenerate = serializers.BooleanField(
        default=False,
        help_text="إعادة التوليد حتى لو موجود"
    )


class AxisDraftSerializer(serializers.ModelSerializer):
    """Serializer for AxisDraft — مسودة المحور"""
    
    axis_code = serializers.CharField(source='axis.code', read_only=True)
    axis_name = serializers.CharField(source='axis.name', read_only=True)
    axis_order = serializers.IntegerField(source='axis.order', read_only=True)
    period_name = serializers.CharField(source='period.name', read_only=True)
    academic_year = serializers.CharField(source='period.academic_year', read_only=True)
    
    # حالة البيانات
    can_generate = serializers.ReadOnlyField()
    is_data_changed = serializers.ReadOnlyField()
    
    # إحصائيات
    items_count = serializers.SerializerMethodField()
    items_with_data = serializers.SerializerMethodField()
    
    class Meta:
        model = AxisDraft
        fields = [
            'id', 'period', 'axis',
            'axis_code', 'axis_name', 'axis_order',
            'period_name', 'academic_year',
            'content', 'content_html',
            'tables_data', 'charts_data',
            'status', 'version',
            'can_generate', 'is_data_changed',
            'items_count', 'items_with_data',
            # AI metadata
            'ai_model', 'ai_tokens_input', 'ai_tokens_output',
            'ai_cost', 'generation_time_ms',
            # التواريخ
            'generated_at', 'edited_at', 'approved_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'status', 'version',
            'ai_model', 'ai_tokens_input', 'ai_tokens_output',
            'ai_cost', 'generation_time_ms',
            'generated_at', 'edited_at', 'approved_at',
            'created_at', 'updated_at',
        ]
    
    def get_items_count(self, obj):
        """عدد البنود في هذا المحور"""
        return obj.axis.items.count()
    
    def get_items_with_data(self, obj):
        """عدد البنود التي لها بيانات"""
        # TODO: حساب من DataFile أو Response
        return 0


class AxisDraftEditSerializer(serializers.ModelSerializer):
    """Serializer for editing AxisDraft content"""
    
    class Meta:
        model = AxisDraft
        fields = ['content', 'content_html']


class GenerateRequestSerializer(serializers.Serializer):
    """Serializer for generation request"""
    
    period_id = serializers.IntegerField(help_text="ID فترة الجمع")
    axes = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="قائمة IDs المحاور للتوليد. إذا فارغة = الكل"
    )
    model = serializers.ChoiceField(
        choices=['gemini', 'claude', 'cli'],
        default='gemini',
        help_text="نموذج AI للتوليد"
    )
    regenerate = serializers.BooleanField(
        default=False,
        help_text="إعادة توليد حتى لو موجود"
    )
    
    def validate_period_id(self, value):
        from apps.data_collection.models import DataCollectionPeriod
        try:
            DataCollectionPeriod.objects.get(id=value)
        except DataCollectionPeriod.DoesNotExist:
            raise serializers.ValidationError("فترة الجمع غير موجودة")
        return value


class GenerateResponseSerializer(serializers.Serializer):
    """Serializer for generation response"""
    
    status = serializers.CharField()  # started, completed, failed
    message = serializers.CharField()
    drafts = AxisDraftSerializer(many=True, required=False)
    errors = serializers.ListField(child=serializers.DictField(), required=False)


# ============================================
# Attachment & Manual Content Serializers
# ============================================

from .models import DraftAttachment, DraftHistory


class DraftAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for DraftAttachment"""
    
    file_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)
    
    class Meta:
        model = DraftAttachment
        fields = [
            'id', 'axis_draft', 'item_draft',
            'file', 'file_url', 'filename', 'file_type', 'file_size',
            'caption', 'order',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at',
        ]
        read_only_fields = ['id', 'file_url', 'uploaded_at', 'uploaded_by']
    
    def get_file_url(self, obj):
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url if obj.file else None


class DraftAttachmentUploadSerializer(serializers.Serializer):
    """Serializer for uploading attachment"""
    
    file = serializers.FileField()
    item_draft_id = serializers.UUIDField(required=False)
    axis_draft_id = serializers.UUIDField(required=False)
    caption = serializers.CharField(max_length=500, required=False, allow_blank=True)
    order = serializers.IntegerField(default=0)
    
    def validate(self, data):
        if not data.get('item_draft_id') and not data.get('axis_draft_id'):
            raise serializers.ValidationError("يجب تحديد item_draft_id أو axis_draft_id")
        return data


class ManualContentSerializer(serializers.Serializer):
    """Serializer for manual content items"""
    
    type = serializers.ChoiceField(choices=['image', 'table', 'text'])
    attachment_id = serializers.UUIDField(required=False)  # for images
    data = serializers.ListField(required=False)  # for tables
    content = serializers.CharField(required=False)  # for text
    title = serializers.CharField(required=False, max_length=200)
    caption = serializers.CharField(required=False, max_length=500)
    order = serializers.IntegerField(default=0)


class ItemDraftManualContentSerializer(serializers.ModelSerializer):
    """Serializer for updating manual content"""
    
    manual_content = ManualContentSerializer(many=True, required=False)
    
    class Meta:
        model = ItemDraft
        fields = ['manual_content']


class DraftHistorySerializer(serializers.ModelSerializer):
    """Serializer for DraftHistory"""
    
    user_name = serializers.CharField(source='user.username', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = DraftHistory
        fields = [
            'id', 'axis_draft', 'item_draft',
            'action', 'action_display', 'field_changed',
            'old_value', 'new_value', 'notes',
            'user', 'user_name', 'created_at',
        ]


class PreviousDataImportSerializer(serializers.Serializer):
    """Serializer for importing previous year data from Excel"""
    
    file = serializers.FileField(help_text="ملف Excel يحتوي على بيانات السنة السابقة")
    period_id = serializers.IntegerField(help_text="ID فترة الجمع الحالية")
    
    def validate_file(self, value):
        if not value.name.endswith(('.xlsx', '.xls')):
            raise serializers.ValidationError("يجب أن يكون الملف بصيغة Excel (.xlsx أو .xls)")
        return value


class PreviousDataExportSerializer(serializers.Serializer):
    """Serializer for exporting previous data template"""
    
    period_id = serializers.IntegerField(help_text="ID فترة الجمع")


# ============================================
# Output Templates & Components Serializers
# ============================================

from .models import OutputTemplate, OutputComponent


class OutputComponentSerializer(serializers.ModelSerializer):
    """Serializer for OutputComponent"""
    
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)
    
    class Meta:
        model = OutputComponent
        fields = [
            'id', 'template', 'type', 'type_display',
            'source', 'source_display', 'title', 'order',
            'width', 'required', 'settings',
        ]
        read_only_fields = ['id']


class OutputTemplateSerializer(serializers.ModelSerializer):
    """Serializer for OutputTemplate"""
    
    components = OutputComponentSerializer(many=True, read_only=True)
    components_count = serializers.SerializerMethodField()
    
    class Meta:
        model = OutputTemplate
        fields = [
            'id', 'code', 'name', 'description',
            'is_default', 'preview',
            'components', 'components_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_components_count(self, obj):
        return obj.components.count()


class OutputTemplateCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating OutputTemplate with components"""
    
    components = OutputComponentSerializer(many=True, required=False)
    
    class Meta:
        model = OutputTemplate
        fields = ['code', 'name', 'description', 'is_default', 'components']
    
    def create(self, validated_data):
        components_data = validated_data.pop('components', [])
        template = OutputTemplate.objects.create(**validated_data)
        
        for idx, comp_data in enumerate(components_data):
            comp_data['order'] = comp_data.get('order', idx)
            OutputComponent.objects.create(template=template, **comp_data)
        
        return template
    
    def update(self, instance, validated_data):
        components_data = validated_data.pop('components', None)
        
        # Update template fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update components if provided
        if components_data is not None:
            # Delete old components
            instance.components.all().delete()
            # Create new ones
            for idx, comp_data in enumerate(components_data):
                comp_data['order'] = comp_data.get('order', idx)
                OutputComponent.objects.create(template=instance, **comp_data)
        
        return instance


class ItemOutputConfigSerializer(serializers.Serializer):
    """Serializer for configuring item output before generation"""
    
    item_draft_id = serializers.UUIDField()
    output_template_id = serializers.IntegerField(required=False, allow_null=True)
    
    # Custom components (overrides template)
    custom_components = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        help_text="قائمة المكونات المخصصة"
    )
    # Example: [{"type": "text", "enabled": true, "order": 0}, ...]
    
    def validate_custom_components(self, value):
        valid_types = ['text', 'table', 'chart', 'image']
        for comp in value:
            if comp.get('type') not in valid_types:
                raise serializers.ValidationError(
                    f"نوع المكون غير صالح: {comp.get('type')}"
                )
        return value


class BulkOutputConfigSerializer(serializers.Serializer):
    """Serializer for configuring output for multiple items"""
    
    item_draft_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1
    )
    output_template_id = serializers.IntegerField(required=False, allow_null=True)
    custom_components = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )
