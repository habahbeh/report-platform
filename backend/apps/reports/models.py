"""
Report and Project models.

هذا الملف يحتوي على:
- Project: مشروع التقرير (الجديد)
- Contributor: المساهم في المشروع
- Response: البيانات المدخلة
- TableData: بيانات الجداول
- Report, ReportSection: النظام القديم (للتوافق)
"""

import uuid
from django.db import models
from django.conf import settings as django_settings
from django.utils import timezone


class Project(models.Model):
    """
    مشروع التقرير
    يمثل instance من قالب معين لفترة زمنية محددة
    مثال: التقرير السنوي 2024-2025 لجامعة البترا
    """
    STATUS_CHOICES = [
        ('draft', 'مسودة'),
        ('collecting', 'جمع البيانات'),
        ('reviewing', 'مراجعة'),
        ('generating', 'جاري التوليد'),
        ('published', 'منشور'),
        ('archived', 'مؤرشف'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    template = models.ForeignKey(
        'templates_app.Template',
        on_delete=models.PROTECT,
        related_name='projects',
        verbose_name='القالب'
    )
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='projects',
        verbose_name='المؤسسة'
    )
    
    name = models.CharField('اسم المشروع', max_length=255)
    period = models.CharField('الفترة', max_length=50)  # "2024-2025"
    period_start = models.DateField('بداية الفترة', null=True, blank=True)
    period_end = models.DateField('نهاية الفترة', null=True, blank=True)
    
    status = models.CharField(
        'الحالة',
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft'
    )
    
    # Deadline for data collection
    deadline = models.DateField('الموعد النهائي', null=True, blank=True)
    
    # Previous year data for comparison
    previous_year_data = models.JSONField(
        'بيانات السنة السابقة',
        default=dict,
        blank=True
    )
    
    # Settings for this project
    settings = models.JSONField('الإعدادات', default=dict, blank=True)
    
    # Timestamps
    created_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_projects',
        verbose_name='أنشئ بواسطة'
    )
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    updated_at = models.DateTimeField('تاريخ التعديل', auto_now=True)
    published_at = models.DateTimeField('تاريخ النشر', null=True, blank=True)
    
    class Meta:
        verbose_name = 'مشروع'
        verbose_name_plural = 'المشاريع'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.period})"
    
    @property
    def progress(self):
        """Calculate data collection progress"""
        total_contributors = self.contributors.count()
        if total_contributors == 0:
            return 0
        completed = self.contributors.filter(status='completed').count()
        return int((completed / total_contributors) * 100)
    
    @property
    def items_progress(self):
        """Calculate item completion progress"""
        from apps.templates_app.models import Item
        total_items = Item.objects.filter(axis__template=self.template).count()
        if total_items == 0:
            return 0
        completed_items = self.responses.values('item').distinct().count()
        return int((completed_items / total_items) * 100)
    
    @property
    def days_remaining(self):
        """Days until deadline"""
        if not self.deadline:
            return None
        delta = self.deadline - timezone.now().date()
        return delta.days
    
    def create_contributors_from_template(self):
        """Create contributors for all entities in the template"""
        for entity in self.template.entities.all():
            Contributor.objects.get_or_create(
                project=self,
                entity=entity,
                defaults={
                    'name': entity.contact_role or entity.name,
                }
            )


class Contributor(models.Model):
    """
    المساهم في المشروع
    يمثل جهة مسؤولة عن إدخال بيانات معينة
    يمكنه الوصول بدون تسجيل دخول عبر invite_token
    """
    STATUS_CHOICES = [
        ('pending', 'معلق'),
        ('invited', 'تم الدعوة'),
        ('in_progress', 'جاري الإدخال'),
        ('submitted', 'تم الإرسال'),
        ('completed', 'مكتمل'),
        ('rejected', 'مرفوض'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='contributors',
        verbose_name='المشروع'
    )
    entity = models.ForeignKey(
        'templates_app.Entity',
        on_delete=models.CASCADE,
        related_name='contributors',
        verbose_name='الجهة'
    )
    
    # Contact info
    name = models.CharField('اسم المسؤول', max_length=255)
    email = models.EmailField('البريد الإلكتروني', blank=True)
    phone = models.CharField('رقم الهاتف', max_length=20, blank=True)
    
    # Invite token for access without login
    invite_token = models.CharField(
        'رمز الدعوة',
        max_length=100,
        unique=True,
        default=uuid.uuid4
    )
    
    # Status
    status = models.CharField(
        'الحالة',
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    # Tracking
    invite_sent_at = models.DateTimeField('تاريخ إرسال الدعوة', null=True, blank=True)
    last_reminder_at = models.DateTimeField('آخر تذكير', null=True, blank=True)
    reminder_count = models.PositiveIntegerField('عدد التذكيرات', default=0)
    
    first_access_at = models.DateTimeField('أول وصول', null=True, blank=True)
    last_access_at = models.DateTimeField('آخر وصول', null=True, blank=True)
    submitted_at = models.DateTimeField('تاريخ الإرسال', null=True, blank=True)
    
    # Admin notes
    notes = models.TextField('ملاحظات', blank=True)
    rejection_reason = models.TextField('سبب الرفض', blank=True)
    
    class Meta:
        verbose_name = 'مساهم'
        verbose_name_plural = 'المساهمون'
        unique_together = ['project', 'entity']
        ordering = ['entity__priority', 'entity__name']
    
    def __str__(self):
        return f"{self.entity.name} - {self.project.name}"
    
    @property
    def invite_url(self):
        """Generate the invitation URL"""
        # This should be configured based on frontend URL
        return f"/contribute/{self.invite_token}"
    
    @property
    def items(self):
        """Get items this contributor is responsible for"""
        return self.entity.items.all()
    
    @property
    def items_count(self):
        return self.entity.items.count()
    
    @property
    def completed_items_count(self):
        return self.responses.values('item').distinct().count()
    
    @property
    def progress(self):
        """Calculate completion progress"""
        total = self.items_count
        if total == 0:
            return 100
        completed = self.completed_items_count
        return int((completed / total) * 100)
    
    def mark_accessed(self):
        """Mark contributor as having accessed the form"""
        now = timezone.now()
        if not self.first_access_at:
            self.first_access_at = now
            self.status = 'in_progress'
        self.last_access_at = now
        self.save(update_fields=['first_access_at', 'last_access_at', 'status'])


class Response(models.Model):
    """
    استجابة (بيانات مدخلة)
    تمثل قيمة بند واحد من مساهم واحد
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='responses',
        verbose_name='المشروع'
    )
    contributor = models.ForeignKey(
        Contributor,
        on_delete=models.CASCADE,
        related_name='responses',
        verbose_name='المساهم'
    )
    item = models.ForeignKey(
        'templates_app.Item',
        on_delete=models.CASCADE,
        related_name='responses',
        verbose_name='البند'
    )
    
    # Value stored as JSON for flexibility
    # Examples:
    # Number: {"value": 1427}
    # Text: {"value": "نص..."}
    # Percentage: {"value": 85.5}
    # Select: {"value": "option1"} or {"value": ["opt1", "opt2"]}
    # Table: {"rows": [{"col1": "...", "col2": "..."}, ...]}
    value = models.JSONField('القيمة', null=True, blank=True)
    
    # Attachments (for file/excel_import types)
    # [{"id": "uuid", "filename": "...", "url": "...", "size": 1234}]
    attachments = models.JSONField('المرفقات', default=list, blank=True)
    
    # Validation
    is_valid = models.BooleanField('صالح', default=True)
    validation_errors = models.JSONField('أخطاء التحقق', default=list, blank=True)
    
    # Admin override
    admin_value = models.JSONField('قيمة المدير', null=True, blank=True)
    admin_note = models.TextField('ملاحظة المدير', blank=True)
    overridden_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='overridden_responses',
        verbose_name='عُدّل بواسطة'
    )
    overridden_at = models.DateTimeField('تاريخ التعديل', null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    updated_at = models.DateTimeField('تاريخ التعديل', auto_now=True)
    
    class Meta:
        verbose_name = 'استجابة'
        verbose_name_plural = 'الاستجابات'
        unique_together = ['project', 'contributor', 'item']
        ordering = ['item__axis__order', 'item__order']
    
    def __str__(self):
        return f"{self.item.code}: {self.get_display_value()}"
    
    def get_display_value(self):
        """Get the final value (admin override or original)"""
        if self.admin_value is not None:
            return self.admin_value
        return self.value
    
    def get_simple_value(self):
        """Get the simple value (not the full JSON)"""
        val = self.get_display_value()
        if isinstance(val, dict):
            return val.get('value')
        return val


class TableData(models.Model):
    """
    بيانات جدول
    للجداول الكبيرة التي تحتاج تخزين منفصل
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='table_data',
        verbose_name='المشروع'
    )
    contributor = models.ForeignKey(
        Contributor,
        on_delete=models.CASCADE,
        related_name='table_data',
        verbose_name='المساهم'
    )
    table_definition = models.ForeignKey(
        'templates_app.TableDefinition',
        on_delete=models.CASCADE,
        related_name='data',
        verbose_name='تعريف الجدول'
    )
    
    # Table rows
    # [{"col1": "...", "col2": "...", "_order": 0}, ...]
    rows = models.JSONField('الصفوف', default=list)
    
    # Source file (for excel_import)
    source_file = models.FileField(
        'الملف المصدر',
        upload_to='table_data/',
        null=True,
        blank=True
    )
    
    # Validation
    is_valid = models.BooleanField('صالح', default=True)
    validation_errors = models.JSONField('أخطاء التحقق', default=list, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    updated_at = models.DateTimeField('تاريخ التعديل', auto_now=True)
    
    class Meta:
        verbose_name = 'بيانات جدول'
        verbose_name_plural = 'بيانات الجداول'
        unique_together = ['project', 'contributor', 'table_definition']
    
    def __str__(self):
        return f"{self.table_definition.name} - {self.contributor.entity.name}"
    
    @property
    def rows_count(self):
        return len(self.rows) if self.rows else 0


class DraftStatusMixin:
    """Mixin للحالات المشتركة بين المسودات"""
    STATUS_CHOICES = [
        ('not_started', 'لم يبدأ'),
        ('generating', 'جاري التوليد'),
        ('generated', 'تم التوليد'),
        ('edited', 'معدّل'),
        ('approved', 'معتمد'),
    ]


class ItemDraft(models.Model):
    """
    مسودة بند — كل بند/مؤشر له مسودة مستقلة
    
    مثال: البند 3.1 "عدد الأبحاث في SCOPUS" له مسودة تحليلية خاصة
    """
    
    STATUS_CHOICES = DraftStatusMixin.STATUS_CHOICES
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # الربط
    period = models.ForeignKey(
        'data_collection.DataCollectionPeriod',
        on_delete=models.CASCADE,
        related_name='item_drafts',
        verbose_name='فترة الجمع'
    )
    item = models.ForeignKey(
        'templates_app.Item',
        on_delete=models.CASCADE,
        related_name='drafts',
        verbose_name='البند'
    )
    
    # قالب المخرجات (اختياري — يمكن تجاوز القالب الافتراضي)
    output_template = models.ForeignKey(
        'OutputTemplate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='item_drafts',
        verbose_name='قالب المخرجات'
    )
    
    # === المحتوى المولّد ===
    content = models.TextField('المحتوى', blank=True)
    
    # بيانات الجدول المولّد (من البيانات)
    table_data = models.JSONField('بيانات الجدول', default=list, blank=True)
    # [{"col1": "...", "col2": "..."}, ...]
    
    # إعدادات الرسم المولّد (من البيانات)
    chart_config = models.JSONField('إعدادات الرسم', default=dict, blank=True)
    # {"type": "bar", "data": [...], "labels": [...]}
    
    # === المحتوى اليدوي ===
    manual_content = models.JSONField('محتوى يدوي', default=list, blank=True)
    # [
    #   {"type": "image", "attachment_id": "uuid", "caption": "...", "order": 1},
    #   {"type": "table", "data": [[...]], "title": "...", "order": 2},
    #   {"type": "text", "content": "فقرة إضافية...", "order": 3},
    # ]
    
    # البيانات المستخدمة
    current_value = models.JSONField('القيمة الحالية', null=True, blank=True)
    previous_value = models.JSONField('القيمة السابقة', null=True, blank=True)
    change_percentage = models.DecimalField(
        'نسبة التغير',
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True
    )
    
    # === الحالة ===
    status = models.CharField(
        'الحالة',
        max_length=20,
        choices=STATUS_CHOICES,
        default='not_started'
    )
    
    # === Versioning ===
    version = models.PositiveIntegerField('رقم الإصدار', default=1)
    previous_content = models.TextField('المحتوى السابق', blank=True)
    
    # === AI Metadata ===
    ai_model = models.CharField('نموذج AI', max_length=50, blank=True)
    ai_tokens_input = models.PositiveIntegerField('Tokens الإدخال', default=0)
    ai_tokens_output = models.PositiveIntegerField('Tokens الإخراج', default=0)
    ai_cost = models.DecimalField('التكلفة', max_digits=10, decimal_places=6, default=0)
    generation_time_ms = models.PositiveIntegerField('وقت التوليد (ms)', default=0)
    
    # === التواريخ ===
    generated_at = models.DateTimeField('تاريخ التوليد', null=True, blank=True)
    edited_at = models.DateTimeField('تاريخ التعديل', null=True, blank=True)
    approved_at = models.DateTimeField('تاريخ الاعتماد', null=True, blank=True)
    
    # === المسؤولين ===
    generated_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_item_drafts',
        verbose_name='ولّده'
    )
    
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    updated_at = models.DateTimeField('تاريخ التعديل', auto_now=True)
    
    class Meta:
        verbose_name = 'مسودة بند'
        verbose_name_plural = 'مسودات البنود'
        unique_together = ['period', 'item']
        ordering = ['item__axis__order', 'item__order']
    
    def __str__(self):
        return f"{self.item.code} - {self.item.name}"
    
    @property
    def axis(self):
        return self.item.axis
    
    def complete_generation(self, content, ai_metadata=None, user=None):
        """إكمال التوليد"""
        if self.content:
            self.previous_content = self.content
            self.version += 1
        
        self.content = content
        self.status = 'generated'
        self.generated_at = timezone.now()
        self.generated_by = user
        
        if ai_metadata:
            self.ai_model = ai_metadata.get('model', '')
            self.ai_tokens_input = ai_metadata.get('input_tokens', 0)
            self.ai_tokens_output = ai_metadata.get('output_tokens', 0)
            self.ai_cost = ai_metadata.get('cost', 0)
            self.generation_time_ms = ai_metadata.get('duration_ms', 0)
        
        self.save()


class AxisDraft(models.Model):
    """
    مسودة محور — كل محور له مسودة مستقلة قابلة للتوليد والتعديل
    يمكن تجميعها من ItemDrafts أو توليدها مباشرة
    
    Workflow:
    - not_started: لم يُولّد بعد
    - generating: جاري التوليد (AI)
    - generated: تم التوليد، جاهز للمراجعة
    - edited: تم التعديل يدوياً
    - approved: معتمد نهائياً
    """
    
    STATUS_CHOICES = DraftStatusMixin.STATUS_CHOICES
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # الربط بفترة الجمع والمحور
    period = models.ForeignKey(
        'data_collection.DataCollectionPeriod',
        on_delete=models.CASCADE,
        related_name='axis_drafts',
        verbose_name='فترة الجمع'
    )
    axis = models.ForeignKey(
        'templates_app.Axis',
        on_delete=models.CASCADE,
        related_name='drafts',
        verbose_name='المحور'
    )
    
    # === المحتوى ===
    content = models.TextField('المحتوى', blank=True)
    content_html = models.TextField('المحتوى HTML', blank=True)
    
    # بيانات الجداول والرسوم المولّدة
    tables_data = models.JSONField('بيانات الجداول', default=list, blank=True)
    charts_data = models.JSONField('بيانات الرسوم', default=list, blank=True)
    
    # البيانات الخام المستخدمة للتوليد (للـ cache)
    source_data = models.JSONField('البيانات المصدرية', default=dict, blank=True)
    source_data_hash = models.CharField('hash البيانات', max_length=64, blank=True)
    
    # === الحالة ===
    status = models.CharField(
        'الحالة',
        max_length=20,
        choices=STATUS_CHOICES,
        default='not_started'
    )
    
    # === Versioning ===
    version = models.PositiveIntegerField('رقم الإصدار', default=1)
    previous_content = models.TextField('المحتوى السابق', blank=True)  # للـ undo
    
    # === AI Metadata ===
    ai_model = models.CharField('نموذج AI', max_length=50, blank=True)
    ai_tokens_input = models.PositiveIntegerField('Tokens الإدخال', default=0)
    ai_tokens_output = models.PositiveIntegerField('Tokens الإخراج', default=0)
    ai_cost = models.DecimalField('التكلفة', max_digits=10, decimal_places=6, default=0)
    generation_time_ms = models.PositiveIntegerField('وقت التوليد (ms)', default=0)
    
    # === التواريخ ===
    generated_at = models.DateTimeField('تاريخ التوليد', null=True, blank=True)
    edited_at = models.DateTimeField('تاريخ التعديل', null=True, blank=True)
    approved_at = models.DateTimeField('تاريخ الاعتماد', null=True, blank=True)
    
    # === المسؤولين ===
    generated_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_drafts',
        verbose_name='ولّده'
    )
    edited_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='edited_drafts',
        verbose_name='عدّله'
    )
    approved_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_drafts',
        verbose_name='اعتمده'
    )
    
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    updated_at = models.DateTimeField('تاريخ التعديل', auto_now=True)
    
    class Meta:
        verbose_name = 'مسودة محور'
        verbose_name_plural = 'مسودات المحاور'
        unique_together = ['period', 'axis']
        ordering = ['axis__order']
    
    def __str__(self):
        return f"{self.axis.name} - {self.period.academic_year}"
    
    @property
    def can_generate(self):
        """هل يمكن التوليد؟"""
        return self.status in ['not_started', 'generated', 'edited', 'approved']
    
    @property
    def is_data_changed(self):
        """هل تغيرت البيانات منذ آخر توليد؟"""
        if not self.source_data_hash:
            return True
        current_hash = self._compute_data_hash()
        return current_hash != self.source_data_hash
    
    def _compute_data_hash(self):
        """حساب hash للبيانات الحالية"""
        import hashlib
        import json
        data_str = json.dumps(self.source_data, sort_keys=True, ensure_ascii=False)
        return hashlib.sha256(data_str.encode()).hexdigest()
    
    def start_generation(self, user=None):
        """بدء التوليد"""
        self.status = 'generating'
        self.generated_by = user
        self.save(update_fields=['status', 'generated_by', 'updated_at'])
    
    def complete_generation(self, content, ai_metadata=None, user=None):
        """إكمال التوليد"""
        # حفظ المحتوى السابق
        if self.content:
            self.previous_content = self.content
            self.version += 1
        
        self.content = content
        self.status = 'generated'
        self.generated_at = timezone.now()
        self.generated_by = user
        self.source_data_hash = self._compute_data_hash()
        
        if ai_metadata:
            self.ai_model = ai_metadata.get('model', '')
            self.ai_tokens_input = ai_metadata.get('input_tokens', 0)
            self.ai_tokens_output = ai_metadata.get('output_tokens', 0)
            self.ai_cost = ai_metadata.get('cost', 0)
            self.generation_time_ms = ai_metadata.get('duration_ms', 0)
        
        self.save()
    
    def edit(self, new_content, user=None):
        """تعديل المحتوى"""
        if self.content != new_content:
            self.previous_content = self.content
            self.content = new_content
            self.status = 'edited'
            self.edited_at = timezone.now()
            self.edited_by = user
            self.version += 1
            self.save()
    
    def approve(self, user=None):
        """اعتماد المسودة"""
        self.status = 'approved'
        self.approved_at = timezone.now()
        self.approved_by = user
        self.save(update_fields=['status', 'approved_at', 'approved_by', 'updated_at'])
    
    def revert(self):
        """التراجع للمحتوى السابق"""
        if self.previous_content:
            self.content, self.previous_content = self.previous_content, self.content
            self.version += 1
            self.save(update_fields=['content', 'previous_content', 'version', 'updated_at'])
            return True
        return False


class GeneratedReport(models.Model):
    """
    تقرير مولّد
    ملف التقرير النهائي (Word/PDF)
    """
    FORMAT_CHOICES = [
        ('docx', 'Word'),
        ('pdf', 'PDF'),
        ('html', 'HTML'),
        ('xlsx', 'Excel'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'قيد الانتظار'),
        ('processing', 'جاري المعالجة'),
        ('completed', 'مكتمل'),
        ('failed', 'فشل'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='generated_reports',
        verbose_name='المشروع'
    )
    
    format = models.CharField(
        'الصيغة',
        max_length=10,
        choices=FORMAT_CHOICES
    )
    status = models.CharField(
        'الحالة',
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    
    # Progress tracking (0-100)
    progress = models.PositiveIntegerField('التقدم', default=0)
    current_step = models.CharField('الخطوة الحالية', max_length=100, blank=True)
    
    # Generated file
    file = models.FileField('الملف', upload_to='generated_reports/', blank=True)
    file_size = models.PositiveIntegerField('حجم الملف', default=0)
    
    # Generation options
    options = models.JSONField('خيارات التوليد', default=dict, blank=True)
    
    # Error message if failed
    error_message = models.TextField('رسالة الخطأ', blank=True)
    
    # Timestamps
    created_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name='أنشئ بواسطة'
    )
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    completed_at = models.DateTimeField('تاريخ الاكتمال', null=True, blank=True)
    
    class Meta:
        verbose_name = 'تقرير مولّد'
        verbose_name_plural = 'التقارير المولّدة'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.project.name} - {self.get_format_display()}"


# ============================================
# Legacy models (kept for backward compatibility)
# ============================================

class Report(models.Model):
    """التقرير (النظام القديم - للتوافق)"""
    STATUS_CHOICES = [
        ('draft', 'مسودة'),
        ('collecting', 'جمع البيانات'),
        ('generating', 'جاري التوليد'),
        ('review', 'قيد المراجعة'),
        ('approved', 'معتمد'),
        ('exported', 'تم التصدير'),
    ]
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        related_name='reports',
        verbose_name='المؤسسة'
    )
    template = models.ForeignKey(
        'templates_app.Template',
        on_delete=models.SET_NULL,
        null=True,
        related_name='reports',
        verbose_name='القالب'
    )
    title = models.CharField('عنوان التقرير', max_length=255)
    
    period_start = models.DateField('بداية الفترة')
    period_end = models.DateField('نهاية الفترة')
    
    status = models.CharField('الحالة', max_length=20, choices=STATUS_CHOICES, default='draft')
    
    created_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_reports',
        verbose_name='أنشئ بواسطة'
    )
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    updated_at = models.DateTimeField('تاريخ التعديل', auto_now=True)
    generated_at = models.DateTimeField('تاريخ التوليد', null=True, blank=True)
    
    exported_file = models.FileField('الملف المصدّر', upload_to='exports/', blank=True)
    exported_at = models.DateTimeField('تاريخ التصدير', null=True, blank=True)
    
    class Meta:
        verbose_name = 'تقرير (قديم)'
        verbose_name_plural = 'التقارير (قديم)'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title
    
    @property
    def period_display(self):
        return f"{self.period_start} - {self.period_end}"
    
    @property
    def progress(self):
        total = self.sections.count()
        if total == 0:
            return 0
        completed = self.sections.filter(status__in=['generated', 'edited', 'approved']).count()
        return int((completed / total) * 100)


class ReportSection(models.Model):
    """قسم في التقرير (النظام القديم)"""
    STATUS_CHOICES = [
        ('pending', 'بانتظار البيانات'),
        ('ready', 'جاهز للتوليد'),
        ('generating', 'جاري التوليد'),
        ('generated', 'تم التوليد'),
        ('edited', 'معدّل'),
        ('approved', 'معتمد'),
    ]
    
    report = models.ForeignKey(
        Report,
        on_delete=models.CASCADE,
        related_name='sections',
        verbose_name='التقرير'
    )
    template_section = models.ForeignKey(
        'templates_app.TemplateSection',
        on_delete=models.SET_NULL,
        null=True,
        related_name='report_sections',
        verbose_name='قسم القالب'
    )
    
    title = models.CharField('العنوان', max_length=255)
    order = models.PositiveIntegerField('الترتيب', default=0)
    
    content = models.TextField('المحتوى', blank=True)
    content_html = models.TextField('المحتوى HTML', blank=True)
    data = models.JSONField('البيانات', default=dict, blank=True)
    
    status = models.CharField('الحالة', max_length=20, choices=STATUS_CHOICES, default='pending')
    generated_at = models.DateTimeField('تاريخ التوليد', null=True, blank=True)
    
    edited_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='edited_sections',
        verbose_name='عدّل بواسطة'
    )
    edited_at = models.DateTimeField('تاريخ التعديل', null=True, blank=True)
    
    class Meta:
        verbose_name = 'قسم التقرير (قديم)'
        verbose_name_plural = 'أقسام التقرير (قديم)'
        ordering = ['order']
    
    def __str__(self):
        return f"{self.report.title} - {self.title}"


class ReportImage(models.Model):
    """صورة في التقرير"""
    report = models.ForeignKey(
        Report,
        on_delete=models.CASCADE,
        related_name='images',
        verbose_name='التقرير'
    )
    section = models.ForeignKey(
        ReportSection,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='images',
        verbose_name='القسم'
    )
    
    image = models.ImageField('الصورة', upload_to='report_images/')
    caption = models.CharField('التعليق', max_length=500, blank=True)
    order = models.PositiveIntegerField('الترتيب', default=0)
    
    uploaded_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name='رُفعت بواسطة'
    )
    uploaded_at = models.DateTimeField('تاريخ الرفع', auto_now_add=True)
    
    class Meta:
        verbose_name = 'صورة'
        verbose_name_plural = 'الصور'
        ordering = ['order']
    
    def __str__(self):
        return f"صورة - {self.report.title}"


class ReportChart(models.Model):
    """رسم بياني في التقرير"""
    CHART_TYPES = [
        ('bar', 'أعمدة'),
        ('pie', 'دائري'),
        ('line', 'خطي'),
        ('area', 'مساحة'),
    ]
    
    section = models.ForeignKey(
        ReportSection,
        on_delete=models.CASCADE,
        related_name='charts',
        verbose_name='القسم'
    )
    
    title = models.CharField('العنوان', max_length=255)
    chart_type = models.CharField('نوع الرسم', max_length=20, choices=CHART_TYPES, default='bar')
    data = models.JSONField('البيانات')
    settings = models.JSONField('الإعدادات', default=dict, blank=True)
    
    image = models.ImageField('صورة الرسم', upload_to='charts/', blank=True)
    
    order = models.PositiveIntegerField('الترتيب', default=0)
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    
    class Meta:
        verbose_name = 'رسم بياني'
        verbose_name_plural = 'الرسوم البيانية'
        ordering = ['order']
    
    def __str__(self):
        return f"{self.title} - {self.section.title}"


# ============================================
# Output Templates & Components (New System)
# ============================================

class OutputTemplate(models.Model):
    """
    قالب المخرجات — يحدد كيف يظهر البند في التقرير النهائي
    
    مثال:
    - "text_only": نص تحليلي فقط
    - "text_table": نص + جدول
    - "full": نص + جدول + رسم + صورة
    """
    
    code = models.CharField('الكود', max_length=50, unique=True)
    name = models.CharField('الاسم', max_length=100)
    description = models.TextField('الوصف', blank=True)
    
    # Default template for new items
    is_default = models.BooleanField('افتراضي', default=False)
    
    # Preview image
    preview = models.ImageField('معاينة', upload_to='output_templates/', blank=True)
    
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    updated_at = models.DateTimeField('تاريخ التعديل', auto_now=True)
    
    class Meta:
        verbose_name = 'قالب مخرجات'
        verbose_name_plural = 'قوالب المخرجات'
        ordering = ['name']
    
    def __str__(self):
        return self.name


class OutputComponent(models.Model):
    """
    مكون في قالب المخرجات
    
    Types:
    - text: نص (AI يولّد أو يدوي)
    - table: جدول (من البيانات أو يدوي)
    - chart: رسم بياني (من البيانات)
    - image: صورة (يدوي دائماً)
    
    Source:
    - auto: النظام يولّد تلقائياً
    - manual: المستخدم يضيف
    - mixed: الاثنين معاً
    """
    
    TYPE_CHOICES = [
        ('text', 'نص'),
        ('table', 'جدول'),
        ('chart', 'رسم بياني'),
        ('image', 'صورة'),
    ]
    
    SOURCE_CHOICES = [
        ('auto', 'تلقائي'),
        ('manual', 'يدوي'),
        ('mixed', 'مختلط'),
    ]
    
    template = models.ForeignKey(
        OutputTemplate,
        on_delete=models.CASCADE,
        related_name='components',
        verbose_name='القالب'
    )
    
    type = models.CharField('النوع', max_length=20, choices=TYPE_CHOICES)
    source = models.CharField('المصدر', max_length=20, choices=SOURCE_CHOICES, default='auto')
    
    # Display settings
    title = models.CharField('العنوان', max_length=200, blank=True)
    order = models.PositiveIntegerField('الترتيب', default=0)
    
    # Size hints
    width = models.CharField('العرض', max_length=20, default='full')  # full, half, third
    
    # Required or optional
    required = models.BooleanField('مطلوب', default=True)
    
    # Settings specific to component type
    settings = models.JSONField('الإعدادات', default=dict, blank=True)
    # Examples:
    # text: {"word_count": 200, "style": "analysis"}
    # table: {"columns": ["col1", "col2"], "show_totals": true}
    # chart: {"type": "bar", "show_legend": true}
    # image: {"aspect_ratio": "16:9", "max_size_mb": 5}
    
    class Meta:
        verbose_name = 'مكون مخرجات'
        verbose_name_plural = 'مكونات المخرجات'
        ordering = ['order']
    
    def __str__(self):
        return f"{self.template.name} - {self.get_type_display()}"


class DraftAttachment(models.Model):
    """
    مرفق في المسودة — صور وملفات يرفعها المستخدم
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # يمكن ربطه بمسودة محور أو بند
    axis_draft = models.ForeignKey(
        AxisDraft,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='attachments',
        verbose_name='مسودة المحور'
    )
    item_draft = models.ForeignKey(
        ItemDraft,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='attachments',
        verbose_name='مسودة البند'
    )
    
    # File info
    file = models.FileField('الملف', upload_to='draft_attachments/')
    filename = models.CharField('اسم الملف', max_length=255)
    file_type = models.CharField('نوع الملف', max_length=50)  # image, document, etc.
    file_size = models.PositiveIntegerField('حجم الملف', default=0)
    
    # Display
    caption = models.CharField('التعليق', max_length=500, blank=True)
    order = models.PositiveIntegerField('الترتيب', default=0)
    
    # Metadata
    uploaded_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name='رفعه'
    )
    uploaded_at = models.DateTimeField('تاريخ الرفع', auto_now_add=True)
    
    class Meta:
        verbose_name = 'مرفق'
        verbose_name_plural = 'المرفقات'
        ordering = ['order', 'uploaded_at']
    
    def __str__(self):
        return self.filename


class DraftHistory(models.Model):
    """
    سجل تعديلات المسودة — Audit Trail كامل
    """
    
    ACTION_CHOICES = [
        ('create', 'إنشاء'),
        ('generate', 'توليد'),
        ('edit', 'تعديل'),
        ('approve', 'اعتماد'),
        ('revert', 'تراجع'),
        ('reject', 'رفض'),
        ('add_attachment', 'إضافة مرفق'),
        ('remove_attachment', 'حذف مرفق'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # ربط بمسودة محور أو بند
    axis_draft = models.ForeignKey(
        AxisDraft,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='history',
        verbose_name='مسودة المحور'
    )
    item_draft = models.ForeignKey(
        ItemDraft,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='history',
        verbose_name='مسودة البند'
    )
    
    # Action details
    action = models.CharField('الإجراء', max_length=20, choices=ACTION_CHOICES)
    field_changed = models.CharField('الحقل المتغير', max_length=100, blank=True)
    old_value = models.TextField('القيمة القديمة', blank=True)
    new_value = models.TextField('القيمة الجديدة', blank=True)
    
    # Metadata
    notes = models.TextField('ملاحظات', blank=True)
    
    # Who and when
    user = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name='المستخدم'
    )
    created_at = models.DateTimeField('التاريخ', auto_now_add=True)
    
    class Meta:
        verbose_name = 'سجل تعديل'
        verbose_name_plural = 'سجل التعديلات'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_action_display()} - {self.created_at}"
    
    @classmethod
    def log(cls, draft, action, user=None, field_changed='', old_value='', new_value='', notes=''):
        """Helper to create history entry"""
        kwargs = {
            'action': action,
            'field_changed': field_changed,
            'old_value': str(old_value)[:10000] if old_value else '',
            'new_value': str(new_value)[:10000] if new_value else '',
            'notes': notes,
            'user': user,
        }
        
        if isinstance(draft, AxisDraft):
            kwargs['axis_draft'] = draft
        elif isinstance(draft, ItemDraft):
            kwargs['item_draft'] = draft
        
        return cls.objects.create(**kwargs)
