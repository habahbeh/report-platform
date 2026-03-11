"""
Data Collection admin.
إدارة جمع البيانات
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import (
    DataSource, DataRequest, DataFile,
    DataCollectionPeriod, EntitySubmission, ReviewLog
)


@admin.register(DataSource)
class DataSourceAdmin(admin.ModelAdmin):
    list_display = ['name', 'organization', 'source_type', 'is_active', 'last_sync']
    list_filter = ['source_type', 'is_active', 'organization']
    search_fields = ['name', 'description']


@admin.register(DataRequest)
class DataRequestAdmin(admin.ModelAdmin):
    list_display = ['requested_from', 'report', 'status', 'due_date', 'requested_at']
    list_filter = ['status', 'report']
    search_fields = ['requested_from', 'email']
    readonly_fields = ['token', 'requested_at', 'submitted_at']


@admin.register(DataCollectionPeriod)
class DataCollectionPeriodAdmin(admin.ModelAdmin):
    list_display = ['name', 'academic_year', 'status', 'start_date', 'end_date', 'effective_end_date_display', 'submissions_progress']
    list_filter = ['status', 'academic_year', 'template']
    search_fields = ['name', 'academic_year']
    raw_id_fields = ['template']
    date_hierarchy = 'start_date'
    
    fieldsets = (
        ('معلومات الفترة', {
            'fields': ('name', 'academic_year', 'template', 'organization')
        }),
        ('التواريخ', {
            'fields': ('start_date', 'end_date', 'extended_date')
        }),
        ('الحالة والإشعارات', {
            'fields': ('status', 'reminder_days')
        }),
    )
    
    def effective_end_date_display(self, obj):
        if obj.extended_date:
            return format_html(
                '<span style="color: orange;">{} (ممدد)</span>',
                obj.effective_end_date
            )
        return obj.end_date
    effective_end_date_display.short_description = 'تاريخ الانتهاء الفعلي'
    
    def submissions_progress(self, obj):
        total = obj.submissions.count()
        completed = obj.submissions.filter(status='approved').count()
        if total > 0:
            percentage = (completed / total) * 100
            color = 'green' if percentage == 100 else 'orange' if percentage >= 50 else 'red'
            return format_html(
                '<span style="color: {};">{}/{} ({}%)</span>',
                color, completed, total, int(percentage)
            )
        return '-'
    submissions_progress.short_description = 'تقدم التسليمات'


class DataFileInline(admin.TabularInline):
    model = DataFile
    extra = 0
    fields = ['name', 'file', 'file_type', 'status', 'uploaded_at']
    readonly_fields = ['uploaded_at']
    show_change_link = True


class ReviewLogInline(admin.TabularInline):
    model = ReviewLog
    extra = 0
    fields = ['action', 'user', 'timestamp', 'notes']
    readonly_fields = ['action', 'user', 'timestamp', 'notes']
    can_delete = False
    
    def has_add_permission(self, request, obj=None):
        return False


@admin.register(EntitySubmission)
class EntitySubmissionAdmin(admin.ModelAdmin):
    list_display = ['entity', 'period', 'status', 'progress_bar', 'submitted_at', 'approved_at']
    list_filter = ['status', 'period', 'entity']
    search_fields = ['entity__name', 'period__name']
    autocomplete_fields = ['entity', 'period']
    raw_id_fields = ['submitted_by', 'approved_by']
    readonly_fields = ['started_at', 'submitted_at', 'approved_at', 'progress_percentage']
    inlines = [DataFileInline, ReviewLogInline]
    
    fieldsets = (
        ('الربط', {
            'fields': ('entity', 'period')
        }),
        ('التقدم', {
            'fields': ('status', 'total_items', 'completed_items', 'progress_percentage')
        }),
        ('التواريخ', {
            'fields': ('started_at', 'submitted_at', 'approved_at'),
            'classes': ('collapse',)
        }),
        ('المسؤولين', {
            'fields': ('submitted_by', 'approved_by'),
            'classes': ('collapse',)
        }),
        ('ملاحظات', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
    )
    
    def progress_bar(self, obj):
        percentage = float(obj.progress_percentage)
        color = 'green' if percentage == 100 else 'orange' if percentage >= 50 else 'red'
        return format_html(
            '''
            <div style="width:100px; background:#ddd; border-radius:3px;">
                <div style="width:{}%; background:{}; height:20px; border-radius:3px; text-align:center; color:white; font-size:12px; line-height:20px;">
                    {}%
                </div>
            </div>
            ''',
            min(percentage, 100), color, int(percentage)
        )
    progress_bar.short_description = 'الإنجاز'
    
    actions = ['mark_as_approved', 'mark_as_needs_revision']
    
    @admin.action(description='اعتماد التسليمات المحددة')
    def mark_as_approved(self, request, queryset):
        for submission in queryset:
            submission.approve(request.user)
        self.message_user(request, f'تم اعتماد {queryset.count()} تسليم')
    
    @admin.action(description='طلب مراجعة للتسليمات المحددة')
    def mark_as_needs_revision(self, request, queryset):
        queryset.update(status='needs_revision')
        self.message_user(request, f'تم طلب مراجعة {queryset.count()} تسليم')


@admin.register(DataFile)
class DataFileAdmin(admin.ModelAdmin):
    list_display = ['name', 'entity', 'item', 'status', 'version_display', 'file_type', 'uploaded_at']
    list_filter = ['status', 'file_type', 'is_current', 'entity', 'academic_year']
    search_fields = ['name', 'entity__name', 'item__name']
    autocomplete_fields = ['entity', 'item', 'submission', 'report']
    raw_id_fields = ['section', 'uploaded_by', 'reviewed_by']
    readonly_fields = ['uploaded_at', 'reviewed_at', 'version', 'is_current']
    date_hierarchy = 'uploaded_at'
    inlines = [ReviewLogInline]
    
    fieldsets = (
        ('معلومات الملف', {
            'fields': ('name', 'file', 'file_type', 'description')
        }),
        ('الربط', {
            'fields': ('entity', 'item', 'submission', 'report', 'section'),
            'description': 'ربط الملف بالجهة والبند المحدد'
        }),
        ('الفترة الزمنية', {
            'fields': ('academic_year', 'period_start', 'period_end')
        }),
        ('حالة المراجعة', {
            'fields': ('status', 'review_notes', 'reviewed_by', 'reviewed_at')
        }),
        ('الإصدارات', {
            'fields': ('version', 'is_current', 'previous_version'),
            'classes': ('collapse',)
        }),
        ('التحليل', {
            'fields': ('is_parsed', 'parsed_data'),
            'classes': ('collapse',)
        }),
        ('معلومات الرفع', {
            'fields': ('uploaded_by', 'uploaded_at'),
            'classes': ('collapse',)
        }),
    )
    
    def version_display(self, obj):
        if obj.is_current:
            return format_html('<span style="color:green;">v{} ✓</span>', obj.version)
        return format_html('<span style="color:gray;">v{}</span>', obj.version)
    version_display.short_description = 'الإصدار'
    
    actions = ['approve_files', 'reject_files', 'request_revision']
    
    @admin.action(description='اعتماد الملفات المحددة')
    def approve_files(self, request, queryset):
        from django.utils import timezone
        queryset.update(status='approved', reviewed_by=request.user, reviewed_at=timezone.now())
        self.message_user(request, f'تم اعتماد {queryset.count()} ملف')
    
    @admin.action(description='رفض الملفات المحددة')
    def reject_files(self, request, queryset):
        from django.utils import timezone
        queryset.update(status='rejected', reviewed_by=request.user, reviewed_at=timezone.now())
        self.message_user(request, f'تم رفض {queryset.count()} ملف')
    
    @admin.action(description='طلب تعديل للملفات المحددة')
    def request_revision(self, request, queryset):
        from django.utils import timezone
        queryset.update(status='needs_revision', reviewed_by=request.user, reviewed_at=timezone.now())
        self.message_user(request, f'تم طلب تعديل {queryset.count()} ملف')


@admin.register(ReviewLog)
class ReviewLogAdmin(admin.ModelAdmin):
    list_display = ['get_target', 'action', 'user', 'timestamp', 'short_notes']
    list_filter = ['action', 'timestamp']
    search_fields = ['data_file__name', 'entity_submission__entity__name', 'notes']
    readonly_fields = ['data_file', 'entity_submission', 'action', 'user', 'timestamp', 'extra_data']
    date_hierarchy = 'timestamp'
    
    def get_target(self, obj):
        if obj.data_file:
            return f"ملف: {obj.data_file.name}"
        if obj.entity_submission:
            return f"تسليم: {obj.entity_submission.entity.name}"
        return '-'
    get_target.short_description = 'الهدف'
    
    def short_notes(self, obj):
        if len(obj.notes) > 50:
            return obj.notes[:50] + '...'
        return obj.notes
    short_notes.short_description = 'ملاحظات'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
