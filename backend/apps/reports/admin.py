"""
Admin configuration for Reports app.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Project, Contributor, Response, TableData, GeneratedReport,
    ItemStructure, GeneratedContent,
)


class ContributorInline(admin.TabularInline):
    model = Contributor
    extra = 0
    fields = ['entity', 'name', 'email', 'status', 'progress']
    readonly_fields = ['progress', 'invite_token']


class ResponseInline(admin.TabularInline):
    model = Response
    extra = 0
    fields = ['item', 'value', 'is_valid']
    readonly_fields = ['item']


class GeneratedReportInline(admin.TabularInline):
    model = GeneratedReport
    extra = 0
    fields = ['format', 'status', 'created_at']
    readonly_fields = ['format', 'status', 'created_at']


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'period', 'organization', 'template', 'status', 'progress', 'deadline']
    list_filter = ['status', 'organization', 'template']
    search_fields = ['name', 'period']
    readonly_fields = ['id', 'created_at', 'updated_at', 'progress', 'items_progress']
    date_hierarchy = 'created_at'

    fieldsets = [
        ('المعلومات الأساسية', {
            'fields': ['id', 'name', 'period', 'template', 'organization']
        }),
        ('الفترة', {
            'fields': ['period_start', 'period_end', 'deadline']
        }),
        ('الحالة', {
            'fields': ['status', 'progress', 'items_progress']
        }),
        ('البيانات', {
            'fields': ['previous_year_data', 'settings'],
            'classes': ['collapse']
        }),
        ('البيانات الوصفية', {
            'fields': ['created_by', 'created_at', 'updated_at', 'published_at'],
            'classes': ['collapse']
        }),
    ]

    inlines = [ContributorInline, GeneratedReportInline]

    actions = ['mark_collecting', 'send_invitations']

    @admin.action(description='تحويل إلى جمع البيانات')
    def mark_collecting(self, request, queryset):
        queryset.update(status='collecting')

    @admin.action(description='إرسال الدعوات')
    def send_invitations(self, request, queryset):
        self.message_user(request, "سيتم إرسال الدعوات قريباً")


@admin.register(Contributor)
class ContributorAdmin(admin.ModelAdmin):
    list_display = ['entity', 'project', 'name', 'status', 'progress', 'submitted_at']
    list_filter = ['status', 'project', 'entity__priority']
    search_fields = ['name', 'email', 'entity__name']
    readonly_fields = ['id', 'invite_token', 'invite_url', 'progress', 'first_access_at', 'last_access_at']

    fieldsets = [
        ('المعلومات الأساسية', {
            'fields': ['id', 'project', 'entity']
        }),
        ('معلومات التواصل', {
            'fields': ['name', 'email', 'phone']
        }),
        ('الدعوة', {
            'fields': ['invite_token', 'invite_url', 'invite_sent_at', 'reminder_count', 'last_reminder_at']
        }),
        ('الحالة', {
            'fields': ['status', 'progress', 'first_access_at', 'last_access_at', 'submitted_at']
        }),
        ('ملاحظات', {
            'fields': ['notes', 'rejection_reason'],
            'classes': ['collapse']
        }),
    ]

    inlines = [ResponseInline]


@admin.register(Response)
class ResponseAdmin(admin.ModelAdmin):
    list_display = ['item', 'contributor', 'get_display_value', 'is_valid', 'updated_at']
    list_filter = ['is_valid', 'project', 'item__axis']
    search_fields = ['item__name', 'item__code', 'contributor__entity__name']
    readonly_fields = ['id', 'created_at', 'updated_at']

    fieldsets = [
        ('المعلومات الأساسية', {
            'fields': ['id', 'project', 'contributor', 'item']
        }),
        ('القيمة', {
            'fields': ['value', 'attachments']
        }),
        ('التحقق', {
            'fields': ['is_valid', 'validation_errors']
        }),
        ('تعديل المدير', {
            'fields': ['admin_value', 'admin_note', 'overridden_by', 'overridden_at'],
            'classes': ['collapse']
        }),
        ('التواريخ', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse']
        }),
    ]


@admin.register(TableData)
class TableDataAdmin(admin.ModelAdmin):
    list_display = ['table_definition', 'contributor', 'rows_count', 'is_valid']
    list_filter = ['is_valid', 'project']
    search_fields = ['table_definition__name', 'contributor__entity__name']


@admin.register(GeneratedReport)
class GeneratedReportAdmin(admin.ModelAdmin):
    list_display = ['project', 'format', 'status', 'file_size', 'created_at']
    list_filter = ['format', 'status']
    readonly_fields = ['id', 'created_at', 'completed_at']


# ============================================
# Skeleton-First Workflow Models
# ============================================

class GeneratedContentInline(admin.TabularInline):
    model = GeneratedContent
    extra = 0
    fields = ['component_id', 'status', 'version', 'ai_model', 'generated_at']
    readonly_fields = ['component_id', 'version', 'ai_model', 'generated_at']


@admin.register(ItemStructure)
class ItemStructureAdmin(admin.ModelAdmin):
    """إدارة هياكل البنود"""

    list_display = [
        'item_code', 'project_name', 'source', 'is_approved',
        'components_count', 'paragraphs_count', 'tables_count', 'charts_count',
        'updated_at'
    ]
    list_filter = ['source', 'is_approved', 'project']
    search_fields = ['item__name', 'item__code', 'project__name']
    readonly_fields = [
        'id', 'components_count', 'paragraphs_count',
        'tables_count', 'charts_count',
        'created_at', 'updated_at'
    ]
    ordering = ['project', 'item__axis__order', 'item__order']

    fieldsets = [
        ('المعلومات الأساسية', {
            'fields': ['id', 'project', 'item', 'source', 'is_approved']
        }),
        ('المكونات', {
            'fields': ['components'],
            'classes': ['wide']
        }),
        ('الإحصائيات', {
            'fields': ['components_count', 'paragraphs_count', 'tables_count', 'charts_count']
        }),
        ('عينة الأسلوب', {
            'fields': ['style_sample'],
            'classes': ['collapse']
        }),
        ('التواريخ', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse']
        }),
    ]

    inlines = [GeneratedContentInline]

    @admin.display(description='البند')
    def item_code(self, obj):
        return f"{obj.item.code} - {obj.item.name[:40]}"

    @admin.display(description='المشروع')
    def project_name(self, obj):
        return obj.project.name[:40]


@admin.register(GeneratedContent)
class GeneratedContentAdmin(admin.ModelAdmin):
    """إدارة المحتويات المولّدة (فقرة بفقرة)"""

    list_display = [
        'item_code', 'component_id', 'status_badge',
        'version', 'ai_model', 'content_preview', 'generated_at'
    ]
    list_filter = ['status', 'ai_model', 'project']
    search_fields = ['content', 'item_structure__item__code', 'item_structure__item__name']
    readonly_fields = [
        'id', 'version', 'previous_content',
        'ai_model', 'ai_tokens_input', 'ai_tokens_output',
        'ai_cost', 'generation_time_ms', 'prompt_used',
        'generated_at', 'edited_at', 'approved_at',
        'created_at', 'updated_at',
    ]

    fieldsets = [
        ('المعلومات الأساسية', {
            'fields': ['id', 'project', 'item_structure', 'component_id', 'status', 'version']
        }),
        ('المحتوى المولّد', {
            'fields': ['content'],
            'classes': ['wide']
        }),
        ('التعديل اليدوي', {
            'fields': ['manual_edit'],
            'classes': ['wide', 'collapse']
        }),
        ('معلومات AI', {
            'fields': [
                'ai_model', 'ai_tokens_input', 'ai_tokens_output',
                'ai_cost', 'generation_time_ms'
            ]
        }),
        ('الـ Prompt', {
            'fields': ['prompt_used'],
            'classes': ['collapse']
        }),
        ('التواريخ والمسؤولين', {
            'fields': [
                'generated_at', 'generated_by',
                'edited_at', 'approved_at',
                'created_at', 'updated_at'
            ],
            'classes': ['collapse']
        }),
    ]

    @admin.display(description='البند')
    def item_code(self, obj):
        return obj.item_structure.item.code

    @admin.display(description='معاينة')
    def content_preview(self, obj):
        text = obj.final_content
        if text and len(text) > 60:
            return text[:60] + '...'
        return text or '—'

    @admin.display(description='الحالة')
    def status_badge(self, obj):
        colors = {
            'not_started': '#999',
            'generating': '#f39c12',
            'generated': '#3498db',
            'edited': '#9b59b6',
            'approved': '#27ae60',
            'failed': '#e74c3c',
        }
        icons = {
            'not_started': '⏳',
            'generating': '⚙️',
            'generated': '✅',
            'edited': '📝',
            'approved': '✔️',
            'failed': '❌',
        }
        color = colors.get(obj.status, '#999')
        icon = icons.get(obj.status, '')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{} {}</span>',
            color, icon, obj.get_status_display()
        )

    actions = ['approve_selected', 'mark_for_regeneration']

    @admin.action(description='اعتماد المحددة')
    def approve_selected(self, request, queryset):
        count = queryset.filter(status__in=['generated', 'edited']).update(status='approved')
        self.message_user(request, f'تم اعتماد {count} محتوى')

    @admin.action(description='إعادة توليد المحددة')
    def mark_for_regeneration(self, request, queryset):
        count = queryset.update(status='not_started')
        self.message_user(request, f'تم تجهيز {count} محتوى لإعادة التوليد')
