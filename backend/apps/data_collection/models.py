"""
Data collection models.
نماذج جمع البيانات للتقارير السنوية
"""

import uuid
from decimal import Decimal
from django.db import models
from django.conf import settings as django_settings
from django.utils import timezone


class DataSource(models.Model):
    """مصدر بيانات"""
    SOURCE_TYPES = [
        ('excel', 'ملف Excel'),
        ('api', 'API خارجي'),
        ('database', 'قاعدة بيانات'),
        ('manual', 'إدخال يدوي'),
    ]
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='data_sources',
        verbose_name='المؤسسة'
    )
    name = models.CharField('الاسم', max_length=255)
    description = models.TextField('الوصف', blank=True)
    source_type = models.CharField('النوع', max_length=20, choices=SOURCE_TYPES)
    
    # Configuration (API URL, credentials, etc.)
    config = models.JSONField('الإعدادات', default=dict, blank=True)
    
    is_active = models.BooleanField('مفعّل', default=True)
    last_sync = models.DateTimeField('آخر مزامنة', null=True, blank=True)
    
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    updated_at = models.DateTimeField('تاريخ التعديل', auto_now=True)
    
    class Meta:
        verbose_name = 'مصدر بيانات'
        verbose_name_plural = 'مصادر البيانات'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.get_source_type_display()})"


class DataRequest(models.Model):
    """طلب بيانات من جهة"""
    STATUS_CHOICES = [
        ('pending', 'بانتظار الرد'),
        ('submitted', 'تم التقديم'),
        ('approved', 'معتمد'),
        ('rejected', 'مرفوض'),
    ]
    
    report = models.ForeignKey(
        'reports.Report',
        on_delete=models.CASCADE,
        related_name='data_requests',
        verbose_name='التقرير'
    )
    section = models.ForeignKey(
        'reports.ReportSection',
        on_delete=models.CASCADE,
        related_name='data_requests',
        verbose_name='القسم'
    )
    
    # Requester info
    requested_from = models.CharField('الجهة المطلوب منها', max_length=255)
    email = models.EmailField('البريد الإلكتروني')
    
    # Token for submission link
    token = models.UUIDField('رمز الوصول', default=uuid.uuid4, unique=True)
    
    # Template and submission
    template_file = models.FileField('ملف القالب', upload_to='data_templates/')
    submitted_file = models.FileField('الملف المرفوع', upload_to='data_submissions/', blank=True)
    
    # Status
    status = models.CharField('الحالة', max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Notes
    notes = models.TextField('ملاحظات', blank=True)
    rejection_reason = models.TextField('سبب الرفض', blank=True)
    
    # Dates
    due_date = models.DateField('تاريخ الاستحقاق')
    requested_at = models.DateTimeField('تاريخ الطلب', auto_now_add=True)
    submitted_at = models.DateTimeField('تاريخ التقديم', null=True, blank=True)
    
    # Reminder tracking
    last_reminder_at = models.DateTimeField('آخر تذكير', null=True, blank=True)
    reminder_count = models.PositiveIntegerField('عدد التذكيرات', default=0)
    
    class Meta:
        verbose_name = 'طلب بيانات'
        verbose_name_plural = 'طلبات البيانات'
        ordering = ['-requested_at']
    
    def __str__(self):
        return f"{self.requested_from} - {self.report.title}"
    
    @property
    def submission_url(self):
        """Generate the submission URL"""
        # This would be configured based on your frontend URL
        return f"/submit/{self.token}/"


class DataCollectionPeriod(models.Model):
    """فترة جمع البيانات"""
    
    STATUS_CHOICES = [
        ('upcoming', 'قادمة'),
        ('open', 'مفتوحة'),
        ('extended', 'ممددة'),
        ('closed', 'مغلقة'),
    ]
    
    name = models.CharField('اسم الفترة', max_length=255)
    academic_year = models.CharField('السنة الأكاديمية', max_length=20)  # "2023-2024"
    
    # التواريخ
    start_date = models.DateField('تاريخ البدء')
    end_date = models.DateField('تاريخ الانتهاء')
    extended_date = models.DateField('تاريخ التمديد', null=True, blank=True)
    
    status = models.CharField('الحالة', max_length=20, choices=STATUS_CHOICES, default='upcoming')
    
    # الإشعارات - أيام قبل الموعد لإرسال تذكير
    reminder_days = models.JSONField('أيام التذكير', default=list, blank=True)  # [7, 3, 1]
    
    template = models.ForeignKey(
        'templates_app.Template',
        on_delete=models.CASCADE,
        related_name='collection_periods',
        verbose_name='القالب المستخدم'
    )
    
    # الفترة السابقة (للمقارنة والسحب التلقائي)
    previous_period = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='next_periods',
        verbose_name='الفترة السابقة'
    )
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='collection_periods',
        verbose_name='المؤسسة',
        null=True,
        blank=True
    )
    
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    updated_at = models.DateTimeField('تاريخ التعديل', auto_now=True)
    
    class Meta:
        verbose_name = 'فترة جمع بيانات'
        verbose_name_plural = 'فترات جمع البيانات'
        ordering = ['-start_date']
    
    def __str__(self):
        return f"{self.name} ({self.academic_year})"
    
    @property
    def is_active(self):
        """هل الفترة مفتوحة حالياً؟"""
        return self.status in ['open', 'extended']
    
    @property
    def effective_end_date(self):
        """تاريخ الانتهاء الفعلي (مع التمديد)"""
        return self.extended_date or self.end_date
    
    def get_previous_values(self):
        """
        جلب قيم الفترة السابقة للمقارنة
        Returns: {item_id: value, ...}
        """
        if not self.previous_period:
            return {}
        
        from apps.reports.models import ItemDraft
        previous_drafts = ItemDraft.objects.filter(
            period=self.previous_period
        ).select_related('item')
        
        return {
            draft.item_id: draft.current_value
            for draft in previous_drafts
            if draft.current_value is not None
        }
    
    def copy_from_previous(self, overwrite=False):
        """
        نسخ بيانات الفترة السابقة كـ previous_value
        
        Args:
            overwrite: هل يتم الكتابة فوق القيم الموجودة؟
        
        Returns:
            int: عدد القيم المنسوخة
        """
        if not self.previous_period:
            return 0
        
        from apps.reports.models import ItemDraft
        
        previous_values = self.get_previous_values()
        if not previous_values:
            return 0
        
        count = 0
        current_drafts = ItemDraft.objects.filter(period=self)
        
        for draft in current_drafts:
            if draft.item_id in previous_values:
                if overwrite or draft.previous_value is None:
                    draft.previous_value = previous_values[draft.item_id]
                    draft.save(update_fields=['previous_value', 'updated_at'])
                    count += 1
        
        return count


class EntitySubmission(models.Model):
    """تسليم جهة لفترة معينة - يتتبع تقدم كل جهة"""
    
    STATUS_CHOICES = [
        ('not_started', 'لم يبدأ'),
        ('in_progress', 'قيد العمل'),
        ('submitted', 'مُسلَّم'),
        ('under_review', 'قيد المراجعة'),
        ('approved', 'معتمد'),
        ('needs_revision', 'يحتاج مراجعة'),
    ]
    
    entity = models.ForeignKey(
        'templates_app.Entity',
        on_delete=models.CASCADE,
        related_name='submissions',
        verbose_name='الجهة'
    )
    period = models.ForeignKey(
        DataCollectionPeriod,
        on_delete=models.CASCADE,
        related_name='submissions',
        verbose_name='فترة الجمع'
    )
    
    status = models.CharField('الحالة', max_length=20, choices=STATUS_CHOICES, default='not_started')
    
    # التقدم
    total_items = models.PositiveIntegerField('إجمالي البنود', default=0)
    completed_items = models.PositiveIntegerField('البنود المكتملة', default=0)
    progress_percentage = models.DecimalField(
        'نسبة الإنجاز',
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # التواريخ
    started_at = models.DateTimeField('بدأ في', null=True, blank=True)
    submitted_at = models.DateTimeField('سُلِّم في', null=True, blank=True)
    approved_at = models.DateTimeField('اعتُمد في', null=True, blank=True)
    
    # المسؤولين
    submitted_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='entity_submissions',
        verbose_name='سلّمه'
    )
    approved_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_entity_submissions',
        verbose_name='اعتمده'
    )
    
    notes = models.TextField('ملاحظات', blank=True)
    
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    updated_at = models.DateTimeField('تاريخ التعديل', auto_now=True)
    
    class Meta:
        verbose_name = 'تسليم جهة'
        verbose_name_plural = 'تسليمات الجهات'
        unique_together = ['entity', 'period']
        ordering = ['entity__name']
    
    def __str__(self):
        return f"{self.entity.name} - {self.period.academic_year}"
    
    def update_progress(self):
        """تحديث نسبة الإنجاز"""
        if self.total_items > 0:
            self.progress_percentage = Decimal(self.completed_items) / Decimal(self.total_items) * 100
        else:
            self.progress_percentage = Decimal('0.00')
        self.save(update_fields=['progress_percentage'])
    
    def mark_started(self):
        """تعليم البدء"""
        if not self.started_at:
            self.started_at = timezone.now()
            self.status = 'in_progress'
            self.save(update_fields=['started_at', 'status'])
    
    def submit(self, user):
        """تسليم"""
        self.status = 'submitted'
        self.submitted_at = timezone.now()
        self.submitted_by = user
        self.save(update_fields=['status', 'submitted_at', 'submitted_by'])
    
    def approve(self, user):
        """اعتماد"""
        self.status = 'approved'
        self.approved_at = timezone.now()
        self.approved_by = user
        self.save(update_fields=['status', 'approved_at', 'approved_by'])


class DataFile(models.Model):
    """ملف بيانات مرفوع من جهة"""
    
    FILE_TYPES = [
        ('excel', 'Excel'),
        ('csv', 'CSV'),
        ('json', 'JSON'),
        ('pdf', 'PDF'),
        ('word', 'Word'),
        ('image', 'صورة'),
        ('other', 'أخرى'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'مسودة'),
        ('submitted', 'مُقدَّم'),
        ('under_review', 'قيد المراجعة'),
        ('approved', 'معتمد'),
        ('rejected', 'مرفوض'),
        ('needs_revision', 'يحتاج تعديل'),
    ]
    
    # === الربط الأساسي ===
    entity = models.ForeignKey(
        'templates_app.Entity',
        on_delete=models.CASCADE,
        related_name='data_files',
        verbose_name='الجهة المسؤولة'
    )
    item = models.ForeignKey(
        'templates_app.Item',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='data_files',
        verbose_name='البند/المؤشر'
    )
    submission = models.ForeignKey(
        EntitySubmission,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='files',
        verbose_name='التسليم'
    )
    report = models.ForeignKey(
        'reports.Report',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='data_files',
        verbose_name='التقرير'
    )
    section = models.ForeignKey(
        'reports.ReportSection',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='data_files',
        verbose_name='القسم'
    )
    
    # === معلومات الملف ===
    name = models.CharField('اسم الملف', max_length=255)
    file = models.FileField('الملف', upload_to='data_files/%Y/%m/')
    file_type = models.CharField('نوع الملف', max_length=20, choices=FILE_TYPES, default='excel')
    description = models.TextField('وصف/ملاحظات', blank=True)
    
    # === الفترة الزمنية ===
    period_start = models.DateField('بداية الفترة', null=True, blank=True)
    period_end = models.DateField('نهاية الفترة', null=True, blank=True)
    academic_year = models.CharField('السنة الأكاديمية', max_length=20, blank=True)  # "2023-2024"
    
    # === حالة المراجعة ===
    status = models.CharField('الحالة', max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # === الرفع ===
    uploaded_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_data_files',
        verbose_name='رُفع بواسطة'
    )
    uploaded_at = models.DateTimeField('تاريخ الرفع', auto_now_add=True)
    
    # === المراجعة ===
    reviewed_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_data_files',
        verbose_name='راجعه'
    )
    reviewed_at = models.DateTimeField('تاريخ المراجعة', null=True, blank=True)
    review_notes = models.TextField('ملاحظات المراجعة', blank=True)
    
    # === الإصدارات ===
    version = models.PositiveIntegerField('رقم الإصدار', default=1)
    is_current = models.BooleanField('الإصدار الحالي', default=True)
    previous_version = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='newer_versions',
        verbose_name='الإصدار السابق'
    )
    
    # === البيانات المستخرجة ===
    parsed_data = models.JSONField('البيانات المستخرجة', default=dict, blank=True)
    is_parsed = models.BooleanField('تم التحليل', default=False)
    
    class Meta:
        verbose_name = 'ملف بيانات'
        verbose_name_plural = 'ملفات البيانات'
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.name} - {self.entity.name if self.entity else 'بدون جهة'}"
    
    def create_new_version(self, new_file, user):
        """إنشاء إصدار جديد من الملف"""
        # إلغاء الإصدار الحالي
        self.is_current = False
        self.save(update_fields=['is_current'])
        
        # إنشاء إصدار جديد
        new_version = DataFile.objects.create(
            entity=self.entity,
            item=self.item,
            submission=self.submission,
            report=self.report,
            section=self.section,
            name=self.name,
            file=new_file,
            file_type=self.file_type,
            description=self.description,
            period_start=self.period_start,
            period_end=self.period_end,
            academic_year=self.academic_year,
            status='draft',
            uploaded_by=user,
            version=self.version + 1,
            is_current=True,
            previous_version=self,
        )
        return new_version


class ReviewLog(models.Model):
    """سجل المراجعات والإجراءات"""
    
    ACTION_CHOICES = [
        ('created', 'تم الإنشاء'),
        ('uploaded', 'تم الرفع'),
        ('submitted', 'تم التسليم'),
        ('approved', 'تمت الموافقة'),
        ('rejected', 'تم الرفض'),
        ('revision_requested', 'طُلب تعديل'),
        ('revised', 'تم التعديل'),
        ('comment', 'تعليق'),
    ]
    
    # يمكن الربط بملف أو بتسليم جهة
    data_file = models.ForeignKey(
        DataFile,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='review_logs',
        verbose_name='الملف'
    )
    entity_submission = models.ForeignKey(
        EntitySubmission,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='review_logs',
        verbose_name='تسليم الجهة'
    )
    
    action = models.CharField('الإجراء', max_length=20, choices=ACTION_CHOICES)
    user = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name='المستخدم'
    )
    timestamp = models.DateTimeField('الوقت', auto_now_add=True)
    notes = models.TextField('ملاحظات', blank=True)
    
    # بيانات إضافية (مثل الحالة السابقة)
    extra_data = models.JSONField('بيانات إضافية', default=dict, blank=True)
    
    class Meta:
        verbose_name = 'سجل مراجعة'
        verbose_name_plural = 'سجلات المراجعة'
        ordering = ['-timestamp']
    
    def __str__(self):
        target = self.data_file or self.entity_submission
        return f"{self.get_action_display()} - {target}"
