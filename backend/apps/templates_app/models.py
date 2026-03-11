"""
Template models for dynamic report structure.

هذا الملف يحتوي على كل Models القوالب الديناميكية:
- Template: القالب الرئيسي
- Axis: المحور (مثل: البحث العلمي، الاعتمادية)
- Item: البند/KPI (مثل: عدد الأبحاث، نسبة الرضا)
- Entity: الجهة المسؤولة (مثل: عمادة البحث، الدائرة المالية)
- TableDefinition: تعريف الجداول
- ChartDefinition: تعريف الرسوم البيانية
"""

from django.db import models
from django.conf import settings as django_settings


class Template(models.Model):
    """
    قالب التقرير الرئيسي
    مثال: التقرير السنوي للجامعات الأردنية
    """
    CATEGORY_CHOICES = [
        ('higher_education', 'التعليم العالي'),
        ('government', 'الحكومة'),
        ('corporate', 'الشركات'),
        ('healthcare', 'الصحة'),
        ('other', 'أخرى'),
    ]
    
    organization = models.ForeignKey(
        'organizations.Organization',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='templates',
        verbose_name='المؤسسة'
    )
    
    name = models.CharField('اسم القالب', max_length=255)
    name_en = models.CharField('الاسم بالإنجليزية', max_length=255, blank=True)
    description = models.TextField('الوصف', blank=True)
    category = models.CharField(
        'الفئة',
        max_length=50,
        choices=CATEGORY_CHOICES,
        default='other'
    )
    
    # Public templates can be used by any organization
    is_public = models.BooleanField('قالب عام', default=False)
    is_default = models.BooleanField('افتراضي', default=False)
    is_active = models.BooleanField('مفعّل', default=True)
    
    # Version for tracking changes
    version = models.CharField('الإصدار', max_length=20, default='1.0')
    
    # Export settings (Word template, styles, etc.)
    export_settings = models.JSONField('إعدادات التصدير', default=dict, blank=True)
    
    # Legacy field - kept for backward compatibility
    structure = models.JSONField('الهيكل', default=dict, blank=True)
    settings = models.JSONField('الإعدادات', default=dict, blank=True)
    
    created_by = models.ForeignKey(
        django_settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_templates',
        verbose_name='أنشئ بواسطة'
    )
    created_at = models.DateTimeField('تاريخ الإنشاء', auto_now_add=True)
    updated_at = models.DateTimeField('تاريخ التعديل', auto_now=True)
    
    class Meta:
        verbose_name = 'قالب'
        verbose_name_plural = 'القوالب'
        ordering = ['-is_default', '-is_public', 'name']
    
    def __str__(self):
        if self.organization:
            return f"{self.name} ({self.organization.name})"
        return f"{self.name} (عام)"
    
    @property
    def axes_count(self):
        return self.axes.count()
    
    @property
    def items_count(self):
        return Item.objects.filter(axis__template=self).count()
    
    @property
    def entities_count(self):
        return self.entities.count()
    
    @property
    def tables_count(self):
        return self.table_definitions.count()
    
    def duplicate(self, new_name=None, new_organization=None):
        """Create a full copy of this template including all related objects"""
        new_template = Template.objects.create(
            organization=new_organization or self.organization,
            name=new_name or f"{self.name} (نسخة)",
            name_en=self.name_en,
            description=self.description,
            category=self.category,
            is_public=False,
            is_default=False,
            export_settings=self.export_settings.copy() if self.export_settings else {},
            settings=self.settings.copy() if self.settings else {},
            created_by=self.created_by,
        )
        
        # Map old IDs to new objects for relationships
        axis_map = {}
        item_map = {}
        entity_map = {}
        
        # Duplicate axes and items
        for axis in self.axes.all():
            new_axis = Axis.objects.create(
                template=new_template,
                code=axis.code,
                name=axis.name,
                name_en=axis.name_en,
                description=axis.description,
                order=axis.order,
            )
            axis_map[axis.id] = new_axis
            
            for item in axis.items.all():
                new_item = Item.objects.create(
                    axis=new_axis,
                    code=item.code,
                    name=item.name,
                    name_en=item.name_en,
                    description=item.description,
                    field_type=item.field_type,
                    config=item.config.copy() if item.config else {},
                    formula=item.formula,
                    dependencies=item.dependencies.copy() if item.dependencies else [],
                    aggregation=item.aggregation,
                    required=item.required,
                    unit=item.unit,
                    order=item.order,
                    ai_prompt=item.ai_prompt,
                    notes=item.notes,
                )
                item_map[item.id] = new_item
        
        # Duplicate entities
        for entity in self.entities.all():
            new_entity = Entity.objects.create(
                template=new_template,
                name=entity.name,
                name_en=entity.name_en,
                contact_role=entity.contact_role,
                priority=entity.priority,
                is_college=entity.is_college,
                notes=entity.notes,
            )
            # Map items to new entity
            for item in entity.items.all():
                if item.id in item_map:
                    new_entity.items.add(item_map[item.id])
            entity_map[entity.id] = new_entity
        
        # Duplicate table definitions
        for table_def in self.table_definitions.all():
            new_table = TableDefinition.objects.create(
                template=new_template,
                axis=axis_map.get(table_def.axis_id) if table_def.axis_id else None,
                code=table_def.code,
                name=table_def.name,
                name_en=table_def.name_en,
                table_type=table_def.table_type,
                columns=table_def.columns.copy() if table_def.columns else [],
                fixed_rows=table_def.fixed_rows.copy() if table_def.fixed_rows else [],
                levels=table_def.levels.copy() if table_def.levels else [],
                entity=entity_map.get(table_def.entity_id) if table_def.entity_id else None,
                order=table_def.order,
                notes=table_def.notes,
            )
        
        # Duplicate chart definitions
        for chart_def in self.chart_definitions.all():
            ChartDefinition.objects.create(
                template=new_template,
                axis=axis_map.get(chart_def.axis_id) if chart_def.axis_id else None,
                code=chart_def.code,
                name=chart_def.name,
                name_en=chart_def.name_en,
                chart_type=chart_def.chart_type,
                data_source=chart_def.data_source.copy() if chart_def.data_source else {},
                config=chart_def.config.copy() if chart_def.config else {},
                order=chart_def.order,
            )
        
        return new_template


class Axis(models.Model):
    """
    المحور في التقرير
    مثال: البحث العلمي، الاعتمادية، التدريس
    """
    template = models.ForeignKey(
        Template,
        on_delete=models.CASCADE,
        related_name='axes',
        verbose_name='القالب'
    )
    
    code = models.CharField('الرمز', max_length=10)  # "1", "2", "3"
    name = models.CharField('الاسم', max_length=255)
    name_en = models.CharField('الاسم بالإنجليزية', max_length=255, blank=True)
    description = models.TextField('الوصف', blank=True)
    order = models.PositiveIntegerField('الترتيب', default=0)
    
    # AI prompt for generating axis introduction
    ai_prompt = models.TextField('Prompt للمقدمة', blank=True)
    
    class Meta:
        verbose_name = 'محور'
        verbose_name_plural = 'المحاور'
        ordering = ['order']
        unique_together = ['template', 'code']
    
    def __str__(self):
        return f"{self.code}. {self.name}"
    
    @property
    def items_count(self):
        return self.items.count()


class Item(models.Model):
    """
    البند أو مؤشر الأداء (KPI)
    مثال: عدد الأبحاث في SCOPUS، نسبة رضا الطلبة
    
    هذا هو العنصر الأساسي الذي يحدد:
    - نوع البيانات (رقم، نسبة، نص، ملف، إلخ)
    - المعادلة إن وجدت
    - طريقة التجميع عند تعدد المدخلين
    """
    FIELD_TYPE_CHOICES = [
        # Basic types
        ('text', 'نص قصير'),
        ('number', 'رقم'),
        ('percentage', 'نسبة مئوية'),
        ('currency', 'مبلغ مالي'),
        ('date', 'تاريخ'),
        ('rich_text', 'نص طويل منسق'),
        
        # Selection
        ('select', 'اختيار من قائمة'),
        ('multi_select', 'اختيار متعدد'),
        
        # Files
        ('file', 'ملف'),
        ('image', 'صورة'),
        ('excel_import', 'استيراد من Excel'),
        
        # Complex
        ('table_static', 'جدول ثابت الصفوف'),
        ('table_dynamic', 'جدول متغير الصفوف'),
        ('table_hierarchical', 'جدول هرمي'),
        
        # Computed
        ('computed', 'محسوب تلقائياً'),
        ('year_comparison', 'مقارنة سنوية'),
    ]
    
    AGGREGATION_CHOICES = [
        ('none', 'لا يوجد'),
        ('sum', 'مجموع'),
        ('average', 'متوسط'),
        ('count', 'عدد'),
        ('list', 'قائمة'),
        ('latest', 'آخر قيمة'),
        ('min', 'أقل قيمة'),
        ('max', 'أعلى قيمة'),
        ('concat', 'دمج نصي'),
    ]
    
    axis = models.ForeignKey(
        Axis,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='المحور'
    )
    
    code = models.CharField('الرمز', max_length=20)  # "1.1", "3.2"
    name = models.CharField('الاسم', max_length=255)
    name_en = models.CharField('الاسم بالإنجليزية', max_length=255, blank=True)
    description = models.TextField('الوصف', blank=True)
    
    # Field configuration
    field_type = models.CharField(
        'نوع الحقل',
        max_length=30,
        choices=FIELD_TYPE_CHOICES,
        default='text'
    )
    
    # Dynamic configuration based on field_type
    # Examples:
    # number: {"min": 0, "max": null, "decimals": 0}
    # percentage: {"decimals": 2}
    # currency: {"currency": "JOD"}
    # select: {"options": ["خيار1", "خيار2"], "multiple": false}
    # excel_import: {"template_file": "research.xlsx", "columns": [...]}
    # table_dynamic: {"columns": [...], "min_rows": 1, "max_rows": null}
    config = models.JSONField('إعدادات الحقل', default=dict, blank=True)
    
    # Formula for computed fields
    # Example: "(kpi_1_8 / total_students) * 100"
    formula = models.TextField('المعادلة', blank=True)
    dependencies = models.JSONField('الاعتماديات', default=list, blank=True)
    
    # Aggregation when multiple contributors enter the same item
    aggregation = models.CharField(
        'طريقة التجميع',
        max_length=20,
        choices=AGGREGATION_CHOICES,
        default='none'
    )
    
    # Validation
    required = models.BooleanField('إلزامي', default=True)
    
    # Display
    unit = models.CharField('الوحدة', max_length=50, blank=True)  # "بحث", "%", "دينار"
    order = models.PositiveIntegerField('الترتيب', default=0)
    
    # AI prompt for generating analysis text
    ai_prompt = models.TextField('Prompt للتحليل', blank=True)
    
    # Notes for contributors
    notes = models.TextField('ملاحظات', blank=True)
    
    class Meta:
        verbose_name = 'بند'
        verbose_name_plural = 'البنود'
        ordering = ['order']
        unique_together = ['axis', 'code']
    
    def __str__(self):
        return f"{self.code} - {self.name}"
    
    @property
    def template(self):
        return self.axis.template
    
    def get_config_value(self, key, default=None):
        """Get a value from config with default"""
        return self.config.get(key, default) if self.config else default


class Entity(models.Model):
    """
    الجهة المسؤولة عن إدخال البيانات
    مثال: عمادة البحث العلمي، الدائرة المالية، كلية الهندسة
    """
    PRIORITY_CHOICES = [
        ('critical', 'حرج'),
        ('high', 'عالي'),
        ('medium', 'متوسط'),
        ('low', 'منخفض'),
    ]
    
    template = models.ForeignKey(
        Template,
        on_delete=models.CASCADE,
        related_name='entities',
        verbose_name='القالب'
    )
    
    name = models.CharField('الاسم', max_length=255)
    name_en = models.CharField('الاسم بالإنجليزية', max_length=255, blank=True)
    contact_role = models.CharField('المسمى الوظيفي', max_length=255, blank=True)
    
    priority = models.CharField(
        'الأولوية',
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='medium'
    )
    
    # Items this entity is responsible for
    items = models.ManyToManyField(
        Item,
        related_name='entities',
        blank=True,
        verbose_name='البنود المسؤول عنها'
    )
    
    # Is this a college (for college-specific tables)
    is_college = models.BooleanField('كلية', default=False)
    
    notes = models.TextField('ملاحظات', blank=True)
    
    class Meta:
        verbose_name = 'جهة'
        verbose_name_plural = 'الجهات'
        ordering = ['priority', 'name']
    
    def __str__(self):
        return self.name
    
    @property
    def items_count(self):
        return self.items.count()


class TableDefinition(models.Model):
    """
    تعريف الجدول في التقرير
    يحدد هيكل الجدول (الأعمدة) ونوعه (ثابت، متغير، هرمي، استيراد Excel)
    """
    TABLE_TYPE_CHOICES = [
        ('static', 'ثابت الصفوف'),
        ('dynamic', 'متغير الصفوف'),
        ('hierarchical', 'هرمي'),
        ('excel_import', 'استيراد من Excel'),
    ]
    
    template = models.ForeignKey(
        Template,
        on_delete=models.CASCADE,
        related_name='table_definitions',
        verbose_name='القالب'
    )
    
    axis = models.ForeignKey(
        Axis,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='tables',
        verbose_name='المحور'
    )
    
    code = models.CharField('الرمز', max_length=20)  # "1-1", "3-2"
    name = models.CharField('الاسم', max_length=255)
    name_en = models.CharField('الاسم بالإنجليزية', max_length=255, blank=True)
    
    table_type = models.CharField(
        'نوع الجدول',
        max_length=20,
        choices=TABLE_TYPE_CHOICES,
        default='dynamic'
    )
    
    # Column definitions
    # [{"id": "col1", "name": "الاسم", "type": "text", "required": true}, ...]
    columns = models.JSONField('الأعمدة', default=list)
    
    # For static tables - predefined rows
    # ["صف 1", "صف 2", ...]
    fixed_rows = models.JSONField('الصفوف الثابتة', default=list, blank=True)
    
    # For hierarchical tables - level definitions
    # ["college", "department", "program"]
    levels = models.JSONField('المستويات', default=list, blank=True)
    
    # Template file for Excel import
    template_file = models.FileField(
        'ملف القالب',
        upload_to='table_templates/',
        null=True,
        blank=True
    )
    
    # Entity responsible for this table
    entity = models.ForeignKey(
        Entity,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tables',
        verbose_name='الجهة المسؤولة'
    )
    
    order = models.PositiveIntegerField('الترتيب', default=0)
    notes = models.TextField('ملاحظات', blank=True)
    
    class Meta:
        verbose_name = 'تعريف جدول'
        verbose_name_plural = 'تعريفات الجداول'
        ordering = ['order']
        unique_together = ['template', 'code']
    
    def __str__(self):
        return f"جدول {self.code}: {self.name}"


class ChartDefinition(models.Model):
    """
    تعريف الرسم البياني
    يحدد نوع الرسم ومصدر البيانات
    """
    CHART_TYPE_CHOICES = [
        ('bar', 'أعمدة'),
        ('pie', 'دائري'),
        ('line', 'خطي'),
        ('area', 'مساحة'),
        ('stacked_bar', 'أعمدة متراكمة'),
        ('donut', 'حلقي'),
    ]
    
    template = models.ForeignKey(
        Template,
        on_delete=models.CASCADE,
        related_name='chart_definitions',
        verbose_name='القالب'
    )
    
    axis = models.ForeignKey(
        Axis,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='charts',
        verbose_name='المحور'
    )
    
    code = models.CharField('الرمز', max_length=20)
    name = models.CharField('الاسم', max_length=255)
    name_en = models.CharField('الاسم بالإنجليزية', max_length=255, blank=True)
    
    chart_type = models.CharField(
        'نوع الرسم',
        max_length=20,
        choices=CHART_TYPE_CHOICES,
        default='bar'
    )
    
    # Data source - which items or tables to use
    # {"type": "item", "item_codes": ["3.1", "3.2"]}
    # {"type": "table", "table_code": "1-5", "column": "total"}
    data_source = models.JSONField('مصدر البيانات', default=dict)
    
    # Chart configuration (colors, labels, etc.)
    config = models.JSONField('الإعدادات', default=dict, blank=True)
    
    order = models.PositiveIntegerField('الترتيب', default=0)
    
    class Meta:
        verbose_name = 'تعريف رسم بياني'
        verbose_name_plural = 'تعريفات الرسوم البيانية'
        ordering = ['order']
    
    def __str__(self):
        return f"شكل {self.code}: {self.name}"


# Keep the old TemplateSection for backward compatibility
class TemplateSection(models.Model):
    """
    قسم في القالب (للتوافق مع الإصدار القديم)
    يُنصح باستخدام Axis و Item بدلاً منه
    """
    SECTION_TYPES = [
        ('text', 'نص'),
        ('table', 'جدول'),
        ('chart', 'رسم بياني'),
        ('images', 'صور'),
        ('mixed', 'مختلط'),
    ]
    
    template = models.ForeignKey(
        Template,
        on_delete=models.CASCADE,
        related_name='sections',
        verbose_name='القالب'
    )
    title = models.CharField('العنوان', max_length=255)
    title_en = models.CharField('العنوان بالإنجليزية', max_length=255, blank=True)
    order = models.PositiveIntegerField('الترتيب', default=0)
    section_type = models.CharField('نوع القسم', max_length=20, choices=SECTION_TYPES, default='mixed')
    
    data_source = models.JSONField('مصدر البيانات', null=True, blank=True)
    ai_prompt = models.TextField('Prompt للذكاء الاصطناعي', blank=True)
    settings = models.JSONField('إعدادات القسم', default=dict, blank=True)
    
    class Meta:
        verbose_name = 'قسم القالب (قديم)'
        verbose_name_plural = 'أقسام القالب (قديم)'
        ordering = ['order']
    
    def __str__(self):
        return f"{self.template.name} - {self.title}"


class ItemComponent(models.Model):
    """
    مكوّن في البند — يحدد ترتيب العناصر داخل البند
    
    مثال للبند 1.8:
    1. نص تحليلي (AI)
    2. رسم دائري (شكل 1-2)
    3. نص إضافي (AI)
    4. جدول (جدول 1-3)
    """
    
    COMPONENT_TYPES = [
        ('text', 'نص'),
        ('text_ai', 'نص (توليد AI)'),
        ('table', 'جدول'),
        ('chart', 'رسم بياني'),
        ('image', 'صورة'),
        ('divider', 'فاصل'),
    ]
    
    SOURCE_TYPES = [
        ('auto', 'تلقائي من البيانات'),
        ('ai', 'توليد AI'),
        ('manual', 'إدخال يدوي'),
        ('reference', 'مرجع لتعريف موجود'),
    ]
    
    item = models.ForeignKey(
        Item,
        on_delete=models.CASCADE,
        related_name='components',
        verbose_name='البند'
    )
    
    # نوع المكوّن
    component_type = models.CharField(
        'نوع المكوّن',
        max_length=20,
        choices=COMPONENT_TYPES
    )
    
    # مصدر المحتوى
    source = models.CharField(
        'المصدر',
        max_length=20,
        choices=SOURCE_TYPES,
        default='auto'
    )
    
    # مرجع لـ TableDefinition أو ChartDefinition
    table_ref = models.ForeignKey(
        TableDefinition,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='item_components',
        verbose_name='مرجع الجدول'
    )
    chart_ref = models.ForeignKey(
        ChartDefinition,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='item_components',
        verbose_name='مرجع الرسم'
    )
    
    # إعدادات إضافية
    # للنص: {"prompt_key": "intro", "max_words": 200}
    # للرسم: {"show_legend": true, "colors": [...]}
    # للجدول: {"show_totals": true, "highlight_max": true}
    config = models.JSONField('الإعدادات', default=dict, blank=True)
    
    # عنوان المكوّن (اختياري)
    title = models.CharField('العنوان', max_length=255, blank=True)
    
    # الترتيب داخل البند
    order = models.PositiveIntegerField('الترتيب', default=0)
    
    # هل مطلوب؟
    required = models.BooleanField('مطلوب', default=True)
    
    # ملاحظات
    notes = models.TextField('ملاحظات', blank=True)
    
    class Meta:
        verbose_name = 'مكوّن بند'
        verbose_name_plural = 'مكوّنات البنود'
        ordering = ['order']
        unique_together = ['item', 'order']
    
    def __str__(self):
        return f"{self.item.code} - {self.get_component_type_display()} ({self.order})"
    
    @property
    def template(self):
        return self.item.axis.template
