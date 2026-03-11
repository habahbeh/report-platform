# 🔧 تقرير.ai — المواصفات التقنية للمطورين

> كل التفاصيل التقنية: Models, APIs, Services, Code Structure

---

# البنية التقنية

## Tech Stack

```
Backend:
├── Python 3.12
├── Django 5.x
├── Django REST Framework
├── PostgreSQL (production) / SQLite (dev)
└── Claude CLI (AI generation)

Frontend:
├── Next.js 16 (App Router)
├── React 19
├── TypeScript
├── TailwindCSS 4
├── shadcn/ui (Radix UI)      ← UI Components
├── Lucide Icons              ← أيقونات
├── i18n (عربي/إنجليزي)       ← نظام اللغات
└── Turbopack (dev)

Infrastructure:
├── Docker (optional)
├── DigitalOcean (production)
└── Nginx (reverse proxy)
```

## Project Structure

```
report-platform/
├── backend/
│   ├── apps/
│   │   ├── accounts/         # المستخدمين والصلاحيات
│   │   ├── templates_app/    # القوالب والمحاور والبنود
│   │   ├── data_collection/  # فترات الجمع والتسليمات
│   │   ├── reports/          # المسودات والتوليد
│   │   ├── ai_engine/        # خدمات الذكاء الاصطناعي
│   │   ├── export/           # التصدير (HTML, Word, PDF)
│   │   └── organizations/    # المنظمات
│   ├── config/               # إعدادات Django
│   ├── media/                # الملفات المرفوعة
│   ├── fixtures/             # بيانات أولية
│   └── manage.py
│
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router pages (32 صفحة)
│   │   ├── components/
│   │   │   ├── ui/           # shadcn/ui components (15 component)
│   │   │   └── layout/       # Sidebar, Header, DashboardLayout
│   │   ├── contexts/         # LanguageContext (i18n)
│   │   ├── locales/          # ar.ts, en.ts (ترجمات)
│   │   ├── hooks/            # useApi, etc.
│   │   └── lib/              # api.ts, utils.ts
│   ├── public/
│   └── package.json
│
└── habahbeh/                 # Documentation
```

---

# Database Models

## App: templates_app

### Template (القالب)
```python
class Template(models.Model):
    name = CharField(max_length=255)           # اسم القالب
    description = TextField(blank=True)        # الوصف
    organization = ForeignKey(Organization)    # المنظمة
    academic_year = CharField(max_length=20)   # السنة الأكاديمية
    is_active = BooleanField(default=True)
    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)
```

### Axis (المحور)
```python
class Axis(models.Model):
    template = ForeignKey(Template, related_name='axes')
    code = CharField(max_length=10)            # مثل: "1", "2", "3"
    name = CharField(max_length=255)           # اسم المحور
    description = TextField(blank=True)
    order = PositiveIntegerField(default=0)    # الترتيب
    
    class Meta:
        ordering = ['order']
        unique_together = ['template', 'code']
```

### Item (البند)
```python
class Item(models.Model):
    FIELD_TYPES = [
        ('text', 'نص'),
        ('number', 'رقم'),
        ('percentage', 'نسبة'),
        ('currency', 'مبلغ'),
        ('date', 'تاريخ'),
        ('file', 'ملف'),
        ('textarea', 'نص طويل'),
    ]
    
    axis = ForeignKey(Axis, related_name='items')
    code = CharField(max_length=20)            # مثل: "1.1", "2.3"
    name = CharField(max_length=255)           # اسم البند
    description = TextField(blank=True)
    field_type = CharField(choices=FIELD_TYPES)
    is_required = BooleanField(default=True)
    order = PositiveIntegerField(default=0)
    
    # علاقة many-to-many مع الجهات
    entities = ManyToManyField('Entity', related_name='items')
    
    class Meta:
        ordering = ['order']
```

### ItemComponent (مكوّن البند) ⭐
```python
class ItemComponent(models.Model):
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
    
    item = ForeignKey(Item, related_name='components')
    component_type = CharField(choices=COMPONENT_TYPES)
    source = CharField(choices=SOURCE_TYPES, default='auto')
    
    # مراجع لتعريفات الجداول والرسوم
    table_ref = ForeignKey(TableDefinition, null=True, blank=True)
    chart_ref = ForeignKey(ChartDefinition, null=True, blank=True)
    
    # إعدادات JSON
    config = JSONField(default=dict)
    # مثال للنص: {"prompt_key": "intro", "max_words": 200}
    # مثال للرسم: {"show_legend": true, "colors": [...]}
    
    title = CharField(max_length=255, blank=True)
    order = PositiveIntegerField(default=0)
    required = BooleanField(default=True)
    notes = TextField(blank=True)
    
    class Meta:
        ordering = ['order']
        unique_together = ['item', 'order']
```

### Entity (الجهة)
```python
class Entity(models.Model):
    ENTITY_TYPES = [
        ('college', 'كلية'),
        ('department', 'دائرة'),
        ('center', 'مركز'),
        ('deanship', 'عمادة'),
        ('unit', 'وحدة'),
    ]
    
    template = ForeignKey(Template, related_name='entities')
    code = CharField(max_length=20)            # مثل: "ENG", "SCI"
    name = CharField(max_length=255)
    entity_type = CharField(choices=ENTITY_TYPES)
    email = EmailField(blank=True)
    contact_person = CharField(max_length=255, blank=True)
    
    class Meta:
        unique_together = ['template', 'code']
```

### TableDefinition (تعريف جدول)
```python
class TableDefinition(models.Model):
    template = ForeignKey(Template, related_name='tables')
    code = CharField(max_length=20)            # مثل: "1-1", "2-3"
    name = CharField(max_length=255)           # عنوان الجدول
    
    # هيكل الجدول
    columns = JSONField()
    # مثال: [
    #   {"key": "college", "label": "الكلية", "type": "text"},
    #   {"key": "count", "label": "العدد", "type": "number"},
    # ]
    
    # مصدر البيانات
    data_source = CharField(max_length=100, blank=True)
    # مثال: "item:2.1" أو "entity:publications"
    
    config = JSONField(default=dict)
    # إعدادات: show_totals, highlight_max, etc.
```

### ChartDefinition (تعريف رسم)
```python
class ChartDefinition(models.Model):
    CHART_TYPES = [
        ('pie', 'دائري'),
        ('bar', 'أعمدة'),
        ('line', 'خطي'),
        ('gauge', 'مؤشر'),
    ]
    
    template = ForeignKey(Template, related_name='charts')
    code = CharField(max_length=20)
    name = CharField(max_length=255)
    chart_type = CharField(choices=CHART_TYPES)
    
    # مصدر البيانات
    data_source = CharField(max_length=100, blank=True)
    
    config = JSONField(default=dict)
    # إعدادات: colors, show_legend, show_values, etc.
```

---

## App: data_collection

### DataCollectionPeriod (فترة الجمع)
```python
class DataCollectionPeriod(models.Model):
    STATUS_CHOICES = [
        ('upcoming', 'قادمة'),
        ('open', 'مفتوحة'),
        ('extended', 'ممددة'),
        ('closed', 'مغلقة'),
    ]
    
    template = ForeignKey(Template, related_name='periods')
    organization = ForeignKey(Organization, null=True)
    name = CharField(max_length=255)
    academic_year = CharField(max_length=20)
    
    start_date = DateField()
    end_date = DateField()
    extended_date = DateField(null=True, blank=True)
    
    status = CharField(choices=STATUS_CHOICES, default='upcoming')
    
    # للمقارنة مع السنة السابقة
    previous_period = ForeignKey('self', null=True, blank=True)
    
    # إحصائيات (computed)
    @property
    def progress(self):
        # حساب نسبة الإنجاز
        ...
    
    @property
    def submissions_count(self):
        return self.submissions.count()
    
    @property
    def completed_count(self):
        return self.submissions.filter(status='approved').count()
```

### EntitySubmission (تسليم الجهة)
```python
class EntitySubmission(models.Model):
    STATUS_CHOICES = [
        ('pending', 'لم يبدأ'),
        ('in_progress', 'قيد العمل'),
        ('submitted', 'تم التسليم'),
        ('approved', 'معتمد'),
        ('rejected', 'مرفوض'),
    ]
    
    period = ForeignKey(DataCollectionPeriod, related_name='submissions')
    entity = ForeignKey(Entity, related_name='submissions')
    
    status = CharField(choices=STATUS_CHOICES, default='pending')
    progress = PositiveIntegerField(default=0)  # 0-100
    
    submitted_at = DateTimeField(null=True)
    approved_at = DateTimeField(null=True)
    approved_by = ForeignKey(User, null=True)
    
    notes = TextField(blank=True)
    
    class Meta:
        unique_together = ['period', 'entity']
```

### DataFile (ملف بيانات)
```python
class DataFile(models.Model):
    STATUS_CHOICES = [
        ('pending', 'قيد الانتظار'),
        ('parsing', 'جاري التحليل'),
        ('parsed', 'تم التحليل'),
        ('approved', 'معتمد'),
        ('rejected', 'مرفوض'),
    ]
    
    submission = ForeignKey(EntitySubmission, related_name='files')
    entity = ForeignKey(Entity)
    item = ForeignKey(Item, null=True)
    
    file = FileField(upload_to='data_files/')
    original_name = CharField(max_length=255)
    file_type = CharField(max_length=50)
    file_size = PositiveIntegerField()
    
    status = CharField(choices=STATUS_CHOICES, default='pending')
    
    # البيانات المستخرجة من الملف
    parsed_data = JSONField(null=True)
    
    uploaded_at = DateTimeField(auto_now_add=True)
    uploaded_by = ForeignKey(User, null=True)
    
    # نظام الإصدارات
    version = PositiveIntegerField(default=1)
    is_current = BooleanField(default=True)
    previous_version = ForeignKey('self', null=True)
```

### ReviewLog (سجل المراجعة)
```python
class ReviewLog(models.Model):
    ACTION_CHOICES = [
        ('submit', 'تسليم'),
        ('approve', 'اعتماد'),
        ('reject', 'رفض'),
        ('request_revision', 'طلب تعديل'),
        ('comment', 'تعليق'),
    ]
    
    submission = ForeignKey(EntitySubmission, related_name='logs')
    file = ForeignKey(DataFile, null=True, related_name='logs')
    
    action = CharField(choices=ACTION_CHOICES)
    comment = TextField(blank=True)
    
    created_at = DateTimeField(auto_now_add=True)
    created_by = ForeignKey(User)
```

---

## App: reports

### AxisDraft (مسودة محور)
```python
class AxisDraft(models.Model):
    STATUS_CHOICES = [
        ('pending', 'قيد الانتظار'),
        ('generating', 'جاري التوليد'),
        ('generated', 'تم التوليد'),
        ('reviewed', 'تمت المراجعة'),
        ('approved', 'معتمد'),
    ]
    
    period = ForeignKey(DataCollectionPeriod, related_name='axis_drafts')
    axis = ForeignKey(Axis, related_name='drafts')
    
    content = TextField(blank=True)           # النص المولّد
    status = CharField(choices=STATUS_CHOICES, default='pending')
    
    # معلومات التوليد
    generated_at = DateTimeField(null=True)
    generation_model = CharField(max_length=50, blank=True)  # claude, gemini
    generation_prompt = TextField(blank=True)
    
    # نظام الإصدارات
    version = PositiveIntegerField(default=1)
    
    class Meta:
        unique_together = ['period', 'axis']
```

### ItemDraft (مسودة بند)
```python
class ItemDraft(models.Model):
    STATUS_CHOICES = [
        ('pending', 'قيد الانتظار'),
        ('generating', 'جاري التوليد'),
        ('generated', 'تم التوليد'),
        ('reviewed', 'تمت المراجعة'),
        ('approved', 'معتمد'),
    ]
    
    period = ForeignKey(DataCollectionPeriod, related_name='item_drafts')
    item = ForeignKey(Item, related_name='drafts')
    
    # المحتوى
    content = TextField(blank=True)            # النص التحليلي
    
    # بيانات الجدول
    table_data = JSONField(null=True)
    # مثال: [
    #   {"الكلية": "الهندسة", "العدد": 45},
    #   {"الكلية": "العلوم", "العدد": 32},
    # ]
    
    # إعدادات الرسم
    chart_config = JSONField(null=True)
    # مثال: {
    #   "type": "pie",
    #   "data": [45, 32, 28],
    #   "labels": ["الهندسة", "العلوم", "الآداب"],
    #   "colors": ["#3b82f6", "#f59e0b", "#10b981"]
    # }
    
    # المحتوى اليدوي (مكونات مرتبة)
    manual_content = JSONField(null=True)
    # مثال: [
    #   {"type": "text", "content": "...", "order": 1},
    #   {"type": "chart", "chart_type": "pie", "data": [...], "order": 2},
    #   {"type": "table", "headers": [...], "rows": [...], "order": 3},
    #   {"type": "image", "url": "...", "caption": "...", "order": 4},
    # ]
    
    status = CharField(choices=STATUS_CHOICES, default='pending')
    
    # قيم المقارنة
    current_value = DecimalField(null=True)
    previous_value = DecimalField(null=True)
    change_percentage = DecimalField(null=True)
    
    # معلومات التوليد
    generated_at = DateTimeField(null=True)
    generation_model = CharField(max_length=50, blank=True)
    
    version = PositiveIntegerField(default=1)
    
    class Meta:
        unique_together = ['period', 'item']
```

---

# API Endpoints

## Templates App

```
GET    /api/templates/                      # قائمة القوالب
POST   /api/templates/                      # إنشاء قالب
GET    /api/templates/{id}/                 # تفاصيل قالب
PATCH  /api/templates/{id}/                 # تحديث قالب
DELETE /api/templates/{id}/                 # حذف قالب

GET    /api/templates/axes/                 # قائمة المحاور
POST   /api/templates/axes/                 # إنشاء محور
GET    /api/templates/axes/{id}/            # تفاصيل محور
PATCH  /api/templates/axes/{id}/            # تحديث محور
DELETE /api/templates/axes/{id}/            # حذف محور

GET    /api/templates/items/                # قائمة البنود
POST   /api/templates/items/                # إنشاء بند
GET    /api/templates/items/{id}/           # تفاصيل بند
PATCH  /api/templates/items/{id}/           # تحديث بند
DELETE /api/templates/items/{id}/           # حذف بند

GET    /api/templates/item-components/      # قائمة المكونات
POST   /api/templates/item-components/      # إنشاء مكوّن
GET    /api/templates/item-components/{id}/ # تفاصيل مكوّن
PATCH  /api/templates/item-components/{id}/ # تحديث مكوّن
DELETE /api/templates/item-components/{id}/ # حذف مكوّن

GET    /api/templates/entities/             # قائمة الجهات
POST   /api/templates/entities/             # إنشاء جهة
...
```

## Data Collection App

```
GET    /api/data/periods/                   # قائمة الفترات
POST   /api/data/periods/                   # إنشاء فترة
GET    /api/data/periods/{id}/              # تفاصيل فترة
PATCH  /api/data/periods/{id}/              # تحديث فترة
POST   /api/data/periods/{id}/open/         # فتح الفترة
POST   /api/data/periods/{id}/close/        # إغلاق الفترة
POST   /api/data/periods/{id}/extend/       # تمديد الفترة

GET    /api/data/submissions/               # قائمة التسليمات
GET    /api/data/submissions/{id}/          # تفاصيل تسليم
POST   /api/data/submissions/{id}/submit/   # تسليم
POST   /api/data/submissions/{id}/approve/  # اعتماد
POST   /api/data/submissions/{id}/reject/   # رفض
GET    /api/data/submissions/{id}/files/    # ملفات التسليم
GET    /api/data/submissions/{id}/logs/     # سجل المراجعة
GET    /api/data/submissions/portal_links/  # روابط البوابة

GET    /api/data/files/                     # قائمة الملفات
POST   /api/data/files/                     # رفع ملف
GET    /api/data/files/{id}/                # تفاصيل ملف
POST   /api/data/files/{id}/approve/        # اعتماد ملف
POST   /api/data/files/{id}/reject/         # رفض ملف
```

## Reports App

```
GET    /api/reports/periods/{id}/drafts/           # مسودات المحاور
GET    /api/reports/periods/{id}/item-drafts/      # مسودات البنود
GET    /api/reports/periods/{id}/generation-status/ # حالة التوليد

POST   /api/reports/axis-drafts/                   # إنشاء مسودة محور
PATCH  /api/reports/axis-drafts/{id}/              # تحديث مسودة محور
POST   /api/reports/axis-drafts/{id}/generate/     # توليد محور

POST   /api/reports/item-drafts/                   # إنشاء مسودة بند
PATCH  /api/reports/item-drafts/{id}/              # تحديث مسودة بند
POST   /api/reports/item-drafts/{id}/generate/     # توليد بند

# استيراد البيانات السابقة
GET    /api/reports/periods/{id}/previous-data/template/  # قالب Excel
POST   /api/reports/periods/{id}/previous-data/import/    # استيراد
GET    /api/reports/periods/{id}/previous-data/export/    # تصدير
POST   /api/reports/periods/{id}/previous-data/pull/      # سحب تلقائي
```

## Export App

```
GET    /api/export/period/{id}/html/               # تصدير HTML
GET    /api/export/period/{id}/html/?download=1    # تحميل HTML
GET    /api/export/period/{id}/item/{item_id}/preview/  # معاينة بند

# Legacy (Report model)
POST   /api/export/{report_id}/export/             # تصدير Word/PDF
GET    /api/export/{report_id}/preview/            # معاينة
```

## Entity Portal (بدون auth)

```
GET    /api/portal/{token}/                        # بيانات البوابة
GET    /api/portal/{token}/items/                  # البنود المطلوبة
POST   /api/portal/{token}/upload/                 # رفع ملف
POST   /api/portal/{token}/submit/                 # تسليم
```

---

# AI Generation Service

## كيف يعمل التوليد؟

### 1. جمع البيانات
```python
# apps/ai_engine/services.py

def collect_item_data(item, period):
    """جمع كل البيانات المتعلقة ببند معين"""
    
    data = {
        'item_code': item.code,
        'item_name': item.name,
        'axis_name': item.axis.name,
        'current_year': period.academic_year,
    }
    
    # البيانات من الملفات المرفوعة
    files = DataFile.objects.filter(
        submission__period=period,
        item=item,
        status='approved'
    )
    
    for file in files:
        if file.parsed_data:
            data['tables'] = data.get('tables', [])
            data['tables'].append(file.parsed_data)
    
    # بيانات السنة السابقة
    if period.previous_period:
        prev_draft = ItemDraft.objects.filter(
            period=period.previous_period,
            item=item
        ).first()
        if prev_draft:
            data['previous_value'] = prev_draft.current_value
    
    return data
```

### 2. بناء الـ Prompt
```python
def build_generation_prompt(item, data, components):
    """بناء prompt للذكاء الاصطناعي"""
    
    prompt = f"""
أنت خبير في كتابة التقارير المؤسسية باللغة العربية.

المطلوب: كتابة محتوى للبند "{item.code}: {item.name}"
المحور: {item.axis.name}
السنة: {data['current_year']}

البيانات المتاحة:
{json.dumps(data['tables'], ensure_ascii=False, indent=2)}

"""
    
    if data.get('previous_value'):
        prompt += f"""
بيانات السنة السابقة: {data['previous_value']}
احسب نسبة التغيير وأذكرها في التحليل.
"""
    
    prompt += """
المطلوب توليده (بالترتيب):
"""
    
    for i, comp in enumerate(components, 1):
        if comp.component_type == 'text_ai':
            prompt += f"{i}. فقرة تحليلية ({comp.title or 'تحليل'})\n"
        elif comp.component_type == 'table':
            prompt += f"{i}. جدول: {comp.title}\n"
        elif comp.component_type == 'chart':
            prompt += f"{i}. رسم بياني: {comp.title}\n"
    
    prompt += """
التعليمات:
- اكتب بأسلوب أكاديمي رسمي
- استخدم الأرقام بين قوسين مثل (150)
- قارن مع السنة السابقة إن توفرت البيانات
- كل فقرة 2-3 جمل
"""
    
    return prompt
```

### 3. استدعاء Claude CLI
```python
import subprocess

def generate_with_claude(prompt):
    """توليد باستخدام Claude CLI"""
    
    result = subprocess.run(
        ['claude', '-p', prompt],
        capture_output=True,
        text=True,
        timeout=120
    )
    
    if result.returncode != 0:
        raise Exception(f"Claude error: {result.stderr}")
    
    return result.stdout
```

### 4. معالجة الناتج
```python
def parse_generation_output(output, components):
    """تحويل ناتج Claude لمكونات منظمة"""
    
    manual_content = []
    
    # تحليل النص وتقسيمه حسب المكونات
    # ... parsing logic ...
    
    return manual_content
```

### 5. حفظ المسودة
```python
def save_item_draft(item, period, content, manual_content):
    """حفظ المسودة"""
    
    draft, created = ItemDraft.objects.update_or_create(
        item=item,
        period=period,
        defaults={
            'content': content,
            'manual_content': manual_content,
            'status': 'generated',
            'generated_at': timezone.now(),
            'generation_model': 'claude',
        }
    )
    
    return draft
```

---

# HTML Generator

## كيف يُولّد HTML؟

### الملف الرئيسي
```
backend/apps/export/html_generator.py
```

### الدوال الرئيسية

```python
def generate_full_report_html(period):
    """توليد التقرير الكامل"""
    
    # 1. جمع البيانات
    template = period.template
    axes = template.axes.all().order_by('order')
    
    # 2. توليد HTML لكل محور
    axes_html = ''
    for axis in axes:
        axis_html = generate_axis_html(axis, period)
        axes_html += axis_html
    
    # 3. تجميع الـ HTML النهائي
    html = f'''
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <style>{get_report_css()}</style>
    </head>
    <body>
        <header>
            <h1>{template.name}</h1>
            <p>{period.academic_year}</p>
        </header>
        <main>{axes_html}</main>
    </body>
    </html>
    '''
    
    return html


def generate_item_html(item, period):
    """توليد HTML لبند واحد"""
    
    # جلب المسودة
    draft = ItemDraft.objects.get(period=period, item=item)
    
    # إذا في manual_content، استخدم المكونات
    if draft.manual_content:
        return generate_item_from_components(item, draft.manual_content)
    
    # وإلا استخدم الطريقة القديمة
    return generate_item_html_legacy(item, draft)


def generate_item_from_components(item, components):
    """توليد من المكونات المرتبة"""
    
    html = ''
    
    for comp in sorted(components, key=lambda x: x.get('order', 0)):
        if comp['type'] == 'text':
            html += f"<p>{comp['content']}</p>"
        
        elif comp['type'] == 'chart':
            html += generate_chart_html(comp)
        
        elif comp['type'] == 'table':
            html += generate_table_html(comp)
        
        elif comp['type'] == 'image':
            html += f"<img src='{comp['url']}' alt='{comp.get('caption', '')}'/>"
    
    return f'''
    <article class="item">
        <h3>{item.code}: {item.name}</h3>
        {html}
    </article>
    '''
```

### توليد الرسوم البيانية بـ CSS
```python
def generate_pie_chart_css(data, labels, colors, title):
    """رسم دائري بـ CSS conic-gradient"""
    
    # حساب الزوايا
    total = sum(data)
    gradient_parts = []
    current_deg = 0
    
    for i, value in enumerate(data):
        pct = value / total * 100
        end_deg = current_deg + (pct * 3.6)
        color = colors[i % len(colors)]
        gradient_parts.append(f'{color} {current_deg}deg {end_deg}deg')
        current_deg = end_deg
    
    gradient = ', '.join(gradient_parts)
    
    return f'''
    <div class="chart-container">
        <div class="chart-title">{title}</div>
        <div class="pie-chart" style="background: conic-gradient({gradient});"></div>
    </div>
    '''


def generate_bar_chart_css(data, labels, colors, title):
    """رسم أعمدة بـ CSS"""
    
    max_val = max(data)
    
    bars_html = ''
    for i, (value, label) in enumerate(zip(data, labels)):
        height_pct = (value / max_val * 100) if max_val > 0 else 0
        color = colors[i % len(colors)]
        
        bars_html += f'''
        <div class="bar-group">
            <div class="bar-value">{value}</div>
            <div class="bar" style="height: {height_pct}%; background: {color};"></div>
            <div class="bar-label">{label}</div>
        </div>
        '''
    
    return f'''
    <div class="chart-container">
        <div class="chart-title">{title}</div>
        <div class="bar-chart">{bars_html}</div>
    </div>
    '''
```

---

# Frontend API Client

## ملف api.ts

```typescript
// frontend/src/lib/api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api';

async function fetchAPI(endpoint: string, options?: RequestInit) {
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }
  
  return res.json();
}

export const api = {
  // Templates
  templates: {
    list: () => fetchAPI('/templates/'),
    get: (id: number) => fetchAPI(`/templates/${id}/`),
    create: (data: any) => fetchAPI('/templates/', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: any) => fetchAPI(`/templates/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: number) => fetchAPI(`/templates/${id}/`, { method: 'DELETE' }),
  },
  
  // Axes
  axes: {
    list: (templateId: number) => fetchAPI(`/templates/axes/?template=${templateId}`),
    // ...
  },
  
  // Items
  items: {
    list: (params: { axis?: number }) => {
      const query = new URLSearchParams();
      if (params.axis) query.set('axis', String(params.axis));
      return fetchAPI(`/templates/items/?${query}`);
    },
    // ...
  },
  
  // Data Collection
  data: {
    periods: {
      list: () => fetchAPI('/data/periods/'),
      get: (id: number | string) => fetchAPI(`/data/periods/${id}/`),
      open: (id: number) => fetchAPI(`/data/periods/${id}/open/`, { method: 'POST' }),
      close: (id: number) => fetchAPI(`/data/periods/${id}/close/`, { method: 'POST' }),
      // ...
    },
    submissions: {
      list: (params?: { period?: string }) => {
        const query = new URLSearchParams();
        if (params?.period) query.set('period', params.period);
        return fetchAPI(`/data/submissions/?${query}`);
      },
      // ...
    },
  },
  
  // Reports
  reports: {
    getDrafts: (periodId: number) => fetchAPI(`/reports/periods/${periodId}/drafts/`),
    generateItem: (itemDraftId: number) => fetchAPI(`/reports/item-drafts/${itemDraftId}/generate/`, { method: 'POST' }),
    // ...
  },
};
```

---

# Environment Variables

## Backend (.env)
```bash
# Django
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgres://user:pass@localhost:5432/taqrir

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000

# AI
ANTHROPIC_API_KEY=sk-ant-...  # إذا تستخدم API
# أو استخدم Claude CLI (بدون key)
```

## Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:8002/api
```

---

# Running the Project

## Development

```bash
# Terminal 1: Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8002

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

## Production

```bash
# Backend with Gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8002

# Frontend build
npm run build
npm start
```

---

# نهاية المواصفات التقنية

هذا كل شي تقنياً! 🔧

---

# Frontend Components & i18n

## shadcn/ui Components

الـ components موجودة في `src/components/ui/`:

```
alert-dialog.tsx    # نوافذ تأكيد
avatar.tsx          # صور المستخدمين
badge.tsx           # شارات
button.tsx          # أزرار (متعددة الأنماط)
card.tsx            # بطاقات
dialog.tsx          # نوافذ منبثقة
input.tsx           # حقول إدخال
label.tsx           # تسميات
progress.tsx        # أشرطة تقدم
rtl-wrapper.tsx     # دعم RTL
scroll-area.tsx     # مناطق التمرير
separator.tsx       # فواصل
skeleton.tsx        # هياكل تحميل
textarea.tsx        # حقول نص طويل
tooltip.tsx         # تلميحات
```

### استخدام الـ Components:

```tsx
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

// أنماط الأزرار
<Button variant="default">افتراضي</Button>
<Button variant="destructive">حذف</Button>
<Button variant="outline">محيط</Button>
<Button variant="secondary">ثانوي</Button>
<Button variant="ghost">شفاف</Button>
<Button variant="gradient">متدرج</Button>

// أحجام الأزرار
<Button size="sm">صغير</Button>
<Button size="default">عادي</Button>
<Button size="lg">كبير</Button>
<Button size="icon">أيقونة</Button>
```

---

## Layout Components

### Sidebar (`src/components/layout/Sidebar.tsx`)

القائمة الجانبية مع:
- تصنيف العناصر حسب المجموعات
- دعم RTL/LTR
- حالة مطوية/موسعة
- شارات للإشعارات

### Header (`src/components/layout/Header.tsx`)

الهيدر مع:
- Breadcrumbs تلقائية
- بحث
- إشعارات
- زر إنشاء سريع

### DashboardLayout (`src/components/layout/DashboardLayout.tsx`)

```tsx
import { DashboardLayout } from "@/components/layout/DashboardLayout"

export default function Page() {
  return (
    <DashboardLayout>
      {/* محتوى الصفحة */}
    </DashboardLayout>
  )
}
```

---

## نظام اللغات (i18n)

### الملفات:

```
src/
├── contexts/
│   └── LanguageContext.tsx   # Provider + hooks
└── locales/
    ├── ar.ts                 # الترجمة العربية
    ├── en.ts                 # الترجمة الإنجليزية
    └── index.ts              # تصدير
```

### LanguageContext:

```tsx
// في layout.tsx
import { LanguageProvider } from "@/contexts/LanguageContext"

export default function RootLayout({ children }) {
  return (
    <LanguageProvider>
      {children}
    </LanguageProvider>
  )
}
```

### استخدام الترجمات:

```tsx
import { useTranslation } from "@/contexts/LanguageContext"

export function MyComponent() {
  const { t, language, dir } = useTranslation();
  
  return (
    <div dir={dir}>
      <h1>{t.app.name}</h1>
      <p>{t.common.loading}</p>
    </div>
  );
}
```

### تبديل اللغة:

```tsx
import { useLanguage } from "@/contexts/LanguageContext"

export function LanguageSwitcher() {
  const { language, setLanguage, languages } = useLanguage();
  
  return (
    <select 
      value={language} 
      onChange={(e) => setLanguage(e.target.value as 'ar' | 'en')}
    >
      {languages.map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.nativeName}
        </option>
      ))}
    </select>
  );
}
```

### هيكل الترجمات:

```typescript
// locales/ar.ts
export const ar = {
  app: {
    name: 'تقرير.ai',
    tagline: 'منصة التقارير الذكية',
  },
  common: {
    loading: 'جاري التحميل...',
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    // ...
  },
  nav: {
    main: 'الرئيسية',
    templates: 'القوالب',
    data: 'البيانات',
    // ...
  },
  // ...
};
```

---

# آخر تحديث: 2026-03-11
