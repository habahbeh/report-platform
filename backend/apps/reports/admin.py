"""
Admin configuration for Reports app.
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import (
    Project, Contributor, Response, TableData, GeneratedReport,
    Report, ReportSection, ReportImage, ReportChart,
    AxisDraft, ItemDraft
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
        # TODO: Implement invitation sending
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
# Legacy models
# ============================================

class ReportSectionInline(admin.TabularInline):
    model = ReportSection
    extra = 0
    fields = ['title', 'status', 'order']


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['title', 'organization', 'status', 'progress', 'created_at']
    list_filter = ['status', 'organization']
    search_fields = ['title']
    date_hierarchy = 'created_at'
    
    inlines = [ReportSectionInline]


@admin.register(ReportSection)
class ReportSectionAdmin(admin.ModelAdmin):
    list_display = ['title', 'report', 'status', 'order']
    list_filter = ['status', 'report']


@admin.register(ReportImage)
class ReportImageAdmin(admin.ModelAdmin):
    list_display = ['report', 'section', 'caption', 'order']
    list_filter = ['report']


@admin.register(ReportChart)
class ReportChartAdmin(admin.ModelAdmin):
    list_display = ['title', 'section', 'chart_type', 'order']
    list_filter = ['chart_type']


# ============================================
# AxisDraft - مسودات المحاور
# ============================================

@admin.register(AxisDraft)
class AxisDraftAdmin(admin.ModelAdmin):
    """إدارة مسودات المحاور"""
    
    list_display = [
        'axis_name', 'period_year', 'status_badge',
        'version', 'ai_model', 'generated_at'
    ]
    list_filter = ['status', 'period', 'ai_model', 'period__academic_year']
    search_fields = ['axis__name', 'axis__code', 'period__name']
    readonly_fields = [
        'id', 'version', 'source_data_hash',
        'ai_model', 'ai_tokens_input', 'ai_tokens_output',
        'ai_cost', 'generation_time_ms',
        'generated_at', 'edited_at', 'approved_at',
        'created_at', 'updated_at',
    ]
    ordering = ['period', 'axis__order']
    
    fieldsets = [
        ('المعلومات الأساسية', {
            'fields': ['id', 'period', 'axis', 'status', 'version']
        }),
        ('المحتوى', {
            'fields': ['content', 'content_html'],
            'classes': ['wide']
        }),
        ('البيانات', {
            'fields': ['tables_data', 'charts_data', 'source_data', 'source_data_hash'],
            'classes': ['collapse']
        }),
        ('معلومات AI', {
            'fields': [
                'ai_model', 'ai_tokens_input', 'ai_tokens_output',
                'ai_cost', 'generation_time_ms'
            ]
        }),
        ('التواريخ والمسؤولين', {
            'fields': [
                'generated_at', 'generated_by',
                'edited_at', 'edited_by',
                'approved_at', 'approved_by',
                'created_at', 'updated_at'
            ],
            'classes': ['collapse']
        }),
    ]
    
    @admin.display(description='المحور')
    def axis_name(self, obj):
        return f"{obj.axis.code}. {obj.axis.name}"
    
    @admin.display(description='السنة')
    def period_year(self, obj):
        return obj.period.academic_year
    
    @admin.display(description='الحالة')
    def status_badge(self, obj):
        colors = {
            'not_started': '#999',
            'generating': '#f39c12',
            'generated': '#3498db',
            'edited': '#9b59b6',
            'approved': '#27ae60',
        }
        icons = {
            'not_started': '⏳',
            'generating': '⚙️',
            'generated': '✅',
            'edited': '📝',
            'approved': '✔️',
        }
        color = colors.get(obj.status, '#999')
        icon = icons.get(obj.status, '')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{} {}</span>',
            color,
            icon,
            obj.get_status_display()
        )
    
    actions = ['approve_selected', 'reset_to_not_started']
    
    @admin.action(description='اعتماد المحددة')
    def approve_selected(self, request, queryset):
        count = queryset.filter(status__in=['generated', 'edited']).update(
            status='approved',
            approved_by=request.user
        )
        self.message_user(request, f'تم اعتماد {count} مسودة')
    
    @admin.action(description='إعادة للبداية')
    def reset_to_not_started(self, request, queryset):
        count = queryset.update(status='not_started')
        self.message_user(request, f'تم إعادة {count} مسودة للبداية')


@admin.register(ItemDraft)
class ItemDraftAdmin(admin.ModelAdmin):
    """إدارة مسودات البنود"""
    
    list_display = [
        'item_code', 'item_name', 'axis_name', 'period_year',
        'status_badge', 'current_value', 'change_percentage',
        'ai_model', 'generated_at'
    ]
    list_filter = ['status', 'period', 'item__axis', 'ai_model']
    search_fields = ['item__name', 'item__code', 'content']
    readonly_fields = [
        'id', 'version',
        'current_value', 'previous_value', 'change_percentage',
        'ai_model', 'ai_tokens_input', 'ai_tokens_output',
        'ai_cost', 'generation_time_ms',
        'generated_at', 'edited_at', 'approved_at',
        'created_at', 'updated_at',
    ]
    ordering = ['period', 'item__axis__order', 'item__order']
    
    fieldsets = [
        ('المعلومات الأساسية', {
            'fields': ['id', 'period', 'item', 'status', 'version']
        }),
        ('البيانات', {
            'fields': ['current_value', 'previous_value', 'change_percentage']
        }),
        ('المحتوى', {
            'fields': ['content'],
            'classes': ['wide']
        }),
        ('معلومات AI', {
            'fields': [
                'ai_model', 'ai_tokens_input', 'ai_tokens_output',
                'ai_cost', 'generation_time_ms'
            ]
        }),
        ('التواريخ', {
            'fields': ['generated_at', 'edited_at', 'approved_at', 'created_at', 'updated_at'],
            'classes': ['collapse']
        }),
    ]
    
    @admin.display(description='الرمز')
    def item_code(self, obj):
        return obj.item.code
    
    @admin.display(description='البند')
    def item_name(self, obj):
        return obj.item.name[:50]
    
    @admin.display(description='المحور')
    def axis_name(self, obj):
        return obj.item.axis.name
    
    @admin.display(description='السنة')
    def period_year(self, obj):
        return obj.period.academic_year
    
    @admin.display(description='الحالة')
    def status_badge(self, obj):
        colors = {
            'not_started': '#999',
            'generating': '#f39c12',
            'generated': '#3498db',
            'edited': '#9b59b6',
            'approved': '#27ae60',
        }
        icons = {
            'not_started': '⏳',
            'generating': '⚙️',
            'generated': '✅',
            'edited': '📝',
            'approved': '✔️',
        }
        color = colors.get(obj.status, '#999')
        icon = icons.get(obj.status, '')
        return format_html(
            '<span style="color: {};">{} {}</span>',
            color, icon, obj.get_status_display()
        )
    
    actions = ['approve_selected', 'reset_to_not_started']
    
    @admin.action(description='اعتماد المحددة')
    def approve_selected(self, request, queryset):
        count = queryset.filter(status__in=['generated', 'edited']).update(status='approved')
        self.message_user(request, f'تم اعتماد {count} مسودة')
    
    @admin.action(description='إعادة للبداية')
    def reset_to_not_started(self, request, queryset):
        count = queryset.update(status='not_started')
        self.message_user(request, f'تم إعادة {count} مسودة للبداية')
