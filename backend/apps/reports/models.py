"""
Report and Project models.

هذا الملف يحتوي على:
- Project: مشروع التقرير
- Contributor: المساهم في المشروع
- Response: البيانات المدخلة
- TableData: بيانات الجداول
- ItemStructure: هيكل البند (Skeleton-First)
- GeneratedContent: النص المولّد لكل فقرة
- GeneratedReport: التقرير النهائي المولّد
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

    value = models.JSONField('القيمة', null=True, blank=True)
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


# ============================================
# Skeleton-First Workflow Models
# هيكل أولاً: بناء الهيكل → ملء الجداول → توليد النصوص
# ============================================

class ItemStructure(models.Model):
    """
    هيكل البند على مستوى المشروع

    ItemComponent في templates_app = الهيكل الافتراضي (template-level)
    ItemStructure هنا = الهيكل الفعلي لمشروع معين (قد يختلف عن القالب)
    """

    SOURCE_CHOICES = [
        ('template', 'من القالب الافتراضي'),
        ('previous_report', 'من تقرير سابق'),
        ('manual', 'إدخال يدوي'),
        ('ai_suggested', 'اقتراح AI'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='item_structures',
        verbose_name='المشروع'
    )
    item = models.ForeignKey(
        'templates_app.Item',
        on_delete=models.CASCADE,
        related_name='structures',
        verbose_name='البند'
    )

    # قائمة المكونات بالترتيب
    components = models.JSONField(
        'المكونات',
        default=list,
        help_text='قائمة مكونات البند بالترتيب: فقرات، جداول، أشكال'
    )

    # مصدر الهيكل
    source = models.CharField(
        'المصدر',
        max_length=20,
        choices=SOURCE_CHOICES,
        default='template'
    )

    # عينة أسلوب من التقرير السابق (للـ AI)
    style_sample = models.TextField(
        'عينة الأسلوب',
        blank=True,
        help_text='نص من التقرير السابق يُستخدم كمرجع أسلوب للـ AI'
    )

    # هل الهيكل معتمد من المستخدم؟
    is_approved = models.BooleanField('معتمد', default=False)

    # Timestamps
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    updated_at = models.DateTimeField('تاريخ التعديل', auto_now=True)

    class Meta:
        verbose_name = 'هيكل بند'
        verbose_name_plural = 'هياكل البنود'
        unique_together = ['project', 'item']
        ordering = ['item__axis__order', 'item__order']

    def __str__(self):
        return f"{self.item.code} - {self.project.name}"

    @property
    def components_count(self):
        return len(self.components) if self.components else 0

    @property
    def paragraphs_count(self):
        if not self.components:
            return 0
        return sum(1 for c in self.components if c.get('type') == 'paragraph')

    @property
    def tables_count(self):
        if not self.components:
            return 0
        return sum(1 for c in self.components if c.get('type') == 'table')

    @property
    def charts_count(self):
        if not self.components:
            return 0
        return sum(1 for c in self.components if c.get('type') == 'chart')

    def get_component(self, component_id):
        """الحصول على مكون بـ ID معين"""
        if not self.components:
            return None
        for c in self.components:
            if c.get('id') == component_id:
                return c
        return None

    def get_paragraphs(self):
        """الحصول على كل الفقرات"""
        if not self.components:
            return []
        return [c for c in self.components if c.get('type') == 'paragraph']

    def get_context_for_paragraph(self, paragraph_id):
        """
        الحصول على السياق المحيط بفقرة معينة
        يُرجع: {before: [...], after: [...], references: [...]}
        """
        if not self.components:
            return {'before': [], 'after': [], 'references': []}

        idx = None
        for i, c in enumerate(self.components):
            if c.get('id') == paragraph_id:
                idx = i
                break

        if idx is None:
            return {'before': [], 'after': [], 'references': []}

        paragraph = self.components[idx]

        return {
            'before': self.components[max(0, idx-2):idx],
            'after': self.components[idx+1:min(len(self.components), idx+3)],
            'references': paragraph.get('references', []),
        }

    @classmethod
    def create_from_template(cls, project, item):
        """
        إنشاء هيكل بند من ItemComponents في القالب
        """
        from apps.templates_app.models import ItemComponent

        components_qs = ItemComponent.objects.filter(
            item=item
        ).select_related('table_ref', 'chart_ref').order_by('order')

        components = []
        p_count, t_count, c_count = 0, 0, 0

        for comp in components_qs:
            if comp.component_type in ('text', 'text_ai'):
                p_count += 1
                components.append({
                    'id': f'p{p_count}',
                    'type': 'paragraph',
                    'title': comp.title or f'فقرة {p_count}',
                    'description': comp.notes,
                    'order': comp.order,
                    'source': 'ai' if comp.component_type == 'text_ai' else 'manual',
                    'config': comp.config or {},
                })
            elif comp.component_type == 'table':
                t_count += 1
                comp_data = {
                    'id': f't{t_count}',
                    'type': 'table',
                    'title': comp.title or (comp.table_ref.name if comp.table_ref else f'جدول {t_count}'),
                    'order': comp.order,
                    'config': comp.config or {},
                }
                if comp.table_ref_id:
                    comp_data['table_def_id'] = comp.table_ref_id
                components.append(comp_data)
            elif comp.component_type == 'chart':
                c_count += 1
                comp_data = {
                    'id': f'c{c_count}',
                    'type': 'chart',
                    'title': comp.title or (comp.chart_ref.name if comp.chart_ref else f'شكل {c_count}'),
                    'order': comp.order,
                    'config': comp.config or {},
                }
                if comp.chart_ref_id:
                    comp_data['chart_def_id'] = comp.chart_ref_id
                components.append(comp_data)

        # إذا ما في components في القالب — نضيف فقرة واحدة كافتراضي
        if not components:
            components = [{
                'id': 'p1',
                'type': 'paragraph',
                'title': 'التحليل',
                'order': 1,
                'source': 'ai',
            }]

        return cls.objects.create(
            project=project,
            item=item,
            components=components,
            source='template',
        )


class GeneratedContent(models.Model):
    """
    النص المولّد لكل فقرة في الهيكل

    القاعدة الذهبية: الـ AI يكتب النصوص فقط.
    كل فقرة (paragraph) في ItemStructure لها GeneratedContent مستقل.
    يمكن إعادة توليد فقرة واحدة بدون المس بالباقي.
    """

    STATUS_CHOICES = [
        ('not_started', 'لم يبدأ'),
        ('generating', 'جاري التوليد'),
        ('generated', 'تم التوليد'),
        ('edited', 'معدّل يدوياً'),
        ('approved', 'معتمد'),
        ('failed', 'فشل التوليد'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # الربط
    item_structure = models.ForeignKey(
        ItemStructure,
        on_delete=models.CASCADE,
        related_name='generated_contents',
        verbose_name='هيكل البند'
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='generated_contents',
        verbose_name='المشروع'
    )

    # معرّف المكون في الهيكل (مثل "p1", "p2", "p3")
    component_id = models.CharField(
        'معرّف المكون',
        max_length=20,
        help_text='مثل: p1, p2, p3'
    )

    # === المحتوى ===
    content = models.TextField(
        'المحتوى المولّد',
        blank=True,
        help_text='النص المولّد بالـ AI — قد يحتوي على {ref:t1} للمراجع'
    )

    # المحتوى المعدّل يدوياً (إذا عدّله المستخدم)
    manual_edit = models.TextField(
        'التعديل اليدوي',
        blank=True,
        help_text='إذا عدّل المستخدم النص — يُستخدم بدل content'
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

    # الـ Prompt المستخدم (للـ debug والتحسين)
    prompt_used = models.TextField('الـ Prompt المستخدم', blank=True)

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
        related_name='generated_contents',
        verbose_name='ولّده'
    )

    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    updated_at = models.DateTimeField('تاريخ التعديل', auto_now=True)

    class Meta:
        verbose_name = 'محتوى مولّد'
        verbose_name_plural = 'المحتويات المولّدة'
        unique_together = ['item_structure', 'component_id']
        ordering = ['item_structure__item__axis__order', 'item_structure__item__order']

    def __str__(self):
        return f"{self.item_structure.item.code} / {self.component_id} — {self.get_status_display()}"

    @property
    def final_content(self):
        """المحتوى النهائي: التعديل اليدوي إن وجد، وإلا المولّد"""
        if self.manual_edit:
            return self.manual_edit
        return self.content

    def complete_generation(self, content, ai_metadata=None, user=None, prompt=''):
        """إكمال توليد الفقرة"""
        if self.content:
            self.previous_content = self.content
            self.version += 1

        self.content = content
        self.status = 'generated'
        self.generated_at = timezone.now()
        self.generated_by = user
        self.prompt_used = prompt

        if ai_metadata:
            self.ai_model = ai_metadata.get('model', '')
            self.ai_tokens_input = ai_metadata.get('input_tokens', 0)
            self.ai_tokens_output = ai_metadata.get('output_tokens', 0)
            self.ai_cost = ai_metadata.get('cost', 0)
            self.generation_time_ms = ai_metadata.get('duration_ms', 0)

        self.save()

    def edit(self, new_content, user=None):
        """تعديل يدوي للمحتوى"""
        self.manual_edit = new_content
        self.status = 'edited'
        self.edited_at = timezone.now()
        self.save()

    def approve(self, user=None):
        """اعتماد المحتوى"""
        self.status = 'approved'
        self.approved_at = timezone.now()
        self.save()

    def regenerate(self):
        """تجهيز لإعادة التوليد"""
        self.status = 'generating'
        self.save(update_fields=['status', 'updated_at'])


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
