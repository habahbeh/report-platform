# Report Generation Platform - SPEC

> منصة توليد التقارير بالذكاء الاصطناعي
> Arabic-First AI Report Generation Platform

---

## 1. نظرة عامة (Overview)

### الهدف
منصة تولّد تقارير مؤسسية كاملة باللغة العربية باستخدام الذكاء الاصطناعي.

### أول تطبيق
التقرير السنوي لجامعة البترا (2023-2024)

### القيمة
| قبل | بعد |
|-----|-----|
| 3-4 أشهر عمل يدوي | ساعات قليلة |
| جمع من 35 جهة بالإيميل | نظام موحد |
| كتابة يدوية | AI يكتب |
| أخطاء ونسيان | بيانات متكاملة |

---

## 2. Tech Stack

| المكون | التقنية |
|--------|---------|
| **Backend** | Django 5.0 + DRF |
| **Database** | PostgreSQL 16 + pgvector |
| **AI Engine** | LangGraph + Claude API |
| **RAG** | pgvector embeddings |
| **Documents** | python-docx + WeasyPrint |
| **Charts** | Matplotlib / Plotly |
| **Frontend** | Next.js 14 + TailwindCSS |
| **Queue** | Celery + Redis |
| **Storage** | Local / S3 |

---

## 3. المتطلبات الوظيفية (Functional Requirements)

### 3.1 إدارة القوالب (Templates)
- [ ] إنشاء قالب جديد
- [ ] تعديل قالب (إضافة/حذف/ترتيب أقسام)
- [ ] نسخ قالب
- [ ] حذف قالب
- [ ] قالب افتراضي (التقرير السنوي للبترا)

### 3.2 إدارة التقارير (Reports)
- [ ] إنشاء تقرير جديد من قالب
- [ ] تحديد الفترة الزمنية
- [ ] ربط مصادر البيانات
- [ ] توليد التقرير (AI)
- [ ] مراجعة وتعديل
- [ ] تصدير (Word / PDF)

### 3.3 جمع البيانات (Data Collection)
- [ ] رفع ملفات Excel
- [ ] APIs خارجية (Scopus, etc.)
- [ ] إرسال طلبات للكليات/الدوائر
- [ ] تتبع حالة الاستجابة

### 3.4 توليد المحتوى (AI Generation)
- [ ] توليد نص لكل قسم
- [ ] توليد رسوم بيانية
- [ ] توليد جداول
- [ ] إعادة توليد قسم معين
- [ ] تعديل الأسلوب (رسمي/مختصر/تفصيلي)

### 3.5 الصور والمرفقات
- [ ] رفع صور
- [ ] ربط صور بأقسام
- [ ] توليد charts تلقائي
- [ ] معاينة قبل الإدراج

### 3.6 التصدير (Export)
- [ ] Word (.docx) مع تنسيق عربي RTL
- [ ] PDF
- [ ] معاينة قبل التصدير

### 3.7 المستخدمين والصلاحيات
- [ ] تسجيل دخول (SSO/Local)
- [ ] أدوار: Admin, Editor, Viewer, Contributor
- [ ] صلاحيات على مستوى القالب/التقرير

---

## 4. قاعدة البيانات (Models)

### 4.1 Organization (المؤسسة)
```python
class Organization(models.Model):
    name = models.CharField(max_length=255)
    name_en = models.CharField(max_length=255, blank=True)
    logo = models.ImageField(upload_to='logos/', blank=True)
    settings = models.JSONField(default=dict)  # ألوان، خطوط، etc.
    created_at = models.DateTimeField(auto_now_add=True)
```

### 4.2 Template (القالب)
```python
class Template(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_default = models.BooleanField(default=False)
    structure = models.JSONField()  # هيكل الأقسام
    settings = models.JSONField(default=dict)  # إعدادات التنسيق
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### 4.3 TemplateSection (قسم في القالب)
```python
class TemplateSection(models.Model):
    template = models.ForeignKey(Template, on_delete=models.CASCADE, related_name='sections')
    title = models.CharField(max_length=255)
    title_en = models.CharField(max_length=255, blank=True)
    order = models.PositiveIntegerField()
    section_type = models.CharField(max_length=50, choices=[
        ('text', 'نص'),
        ('table', 'جدول'),
        ('chart', 'رسم بياني'),
        ('images', 'صور'),
        ('mixed', 'مختلط'),
    ])
    data_source = models.JSONField(null=True, blank=True)  # مصدر البيانات
    ai_prompt = models.TextField(blank=True)  # prompt للـ AI
    settings = models.JSONField(default=dict)
    
    class Meta:
        ordering = ['order']
```

### 4.4 Report (التقرير)
```python
class Report(models.Model):
    STATUS_CHOICES = [
        ('draft', 'مسودة'),
        ('collecting', 'جمع البيانات'),
        ('generating', 'جاري التوليد'),
        ('review', 'قيد المراجعة'),
        ('approved', 'معتمد'),
        ('exported', 'تم التصدير'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    template = models.ForeignKey(Template, on_delete=models.SET_NULL, null=True)
    title = models.CharField(max_length=255)
    period_start = models.DateField()
    period_end = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    generated_at = models.DateTimeField(null=True, blank=True)
    exported_file = models.FileField(upload_to='exports/', blank=True)
```

### 4.5 ReportSection (قسم في التقرير)
```python
class ReportSection(models.Model):
    STATUS_CHOICES = [
        ('pending', 'بانتظار البيانات'),
        ('ready', 'جاهز للتوليد'),
        ('generating', 'جاري التوليد'),
        ('generated', 'تم التوليد'),
        ('edited', 'معدّل'),
        ('approved', 'معتمد'),
    ]
    
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='sections')
    template_section = models.ForeignKey(TemplateSection, on_delete=models.SET_NULL, null=True)
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField()
    content = models.TextField(blank=True)  # المحتوى المولّد
    content_html = models.TextField(blank=True)  # للعرض
    data = models.JSONField(default=dict)  # البيانات المستخدمة
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    generated_at = models.DateTimeField(null=True, blank=True)
    edited_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    edited_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['order']
```

### 4.6 DataSource (مصدر بيانات)
```python
class DataSource(models.Model):
    SOURCE_TYPES = [
        ('excel', 'ملف Excel'),
        ('api', 'API خارجي'),
        ('database', 'قاعدة بيانات'),
        ('manual', 'إدخال يدوي'),
    ]
    
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    source_type = models.CharField(max_length=20, choices=SOURCE_TYPES)
    config = models.JSONField()  # إعدادات الاتصال
    is_active = models.BooleanField(default=True)
    last_sync = models.DateTimeField(null=True, blank=True)
```

### 4.7 DataCollection (طلب بيانات)
```python
class DataCollection(models.Model):
    STATUS_CHOICES = [
        ('pending', 'بانتظار الرد'),
        ('submitted', 'تم التقديم'),
        ('approved', 'معتمد'),
        ('rejected', 'مرفوض'),
    ]
    
    report = models.ForeignKey(Report, on_delete=models.CASCADE)
    section = models.ForeignKey(ReportSection, on_delete=models.CASCADE)
    requested_from = models.CharField(max_length=255)  # الكلية/الدائرة
    email = models.EmailField()
    template_file = models.FileField(upload_to='templates/')  # قالب Excel
    submitted_file = models.FileField(upload_to='submissions/', blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    requested_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    due_date = models.DateField()
```

### 4.8 ReportImage (صورة في التقرير)
```python
class ReportImage(models.Model):
    report = models.ForeignKey(Report, on_delete=models.CASCADE)
    section = models.ForeignKey(ReportSection, on_delete=models.CASCADE, null=True)
    image = models.ImageField(upload_to='report_images/')
    caption = models.CharField(max_length=500, blank=True)
    order = models.PositiveIntegerField(default=0)
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
```

### 4.9 AIGeneration (سجل التوليد)
```python
class AIGeneration(models.Model):
    section = models.ForeignKey(ReportSection, on_delete=models.CASCADE)
    prompt = models.TextField()
    context = models.TextField()  # البيانات المرسلة
    response = models.TextField()
    model = models.CharField(max_length=100)  # claude-3-opus, etc.
    tokens_used = models.IntegerField()
    cost = models.DecimalField(max_digits=10, decimal_places=4)
    generated_at = models.DateTimeField(auto_now_add=True)
```

### 4.10 Embedding (للـ RAG)
```python
class Embedding(models.Model):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    content_type = models.CharField(max_length=50)  # report, document, etc.
    content_id = models.IntegerField()
    chunk_index = models.IntegerField()
    text = models.TextField()
    embedding = VectorField(dimensions=1536)  # pgvector
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
```

---

## 5. APIs

### 5.1 Templates API
```
GET    /api/templates/                 # قائمة القوالب
POST   /api/templates/                 # إنشاء قالب
GET    /api/templates/{id}/            # تفاصيل قالب
PUT    /api/templates/{id}/            # تعديل قالب
DELETE /api/templates/{id}/            # حذف قالب
POST   /api/templates/{id}/duplicate/  # نسخ قالب

# أقسام القالب
GET    /api/templates/{id}/sections/
POST   /api/templates/{id}/sections/
PUT    /api/templates/{id}/sections/{section_id}/
DELETE /api/templates/{id}/sections/{section_id}/
POST   /api/templates/{id}/sections/reorder/
```

### 5.2 Reports API
```
GET    /api/reports/                   # قائمة التقارير
POST   /api/reports/                   # إنشاء تقرير
GET    /api/reports/{id}/              # تفاصيل تقرير
PUT    /api/reports/{id}/              # تعديل تقرير
DELETE /api/reports/{id}/              # حذف تقرير

# أقسام التقرير
GET    /api/reports/{id}/sections/
PUT    /api/reports/{id}/sections/{section_id}/
POST   /api/reports/{id}/sections/{section_id}/generate/    # توليد قسم
POST   /api/reports/{id}/sections/{section_id}/regenerate/  # إعادة توليد

# التوليد الكامل
POST   /api/reports/{id}/generate/     # توليد كل الأقسام
GET    /api/reports/{id}/status/       # حالة التوليد

# التصدير
POST   /api/reports/{id}/export/       # تصدير
GET    /api/reports/{id}/download/     # تحميل الملف
GET    /api/reports/{id}/preview/      # معاينة
```

### 5.3 Data Collection API
```
GET    /api/reports/{id}/data-requests/           # طلبات البيانات
POST   /api/reports/{id}/data-requests/           # إرسال طلب
GET    /api/data-requests/{token}/                # صفحة التقديم (public)
POST   /api/data-requests/{token}/submit/         # تقديم البيانات
```

### 5.4 Images API
```
GET    /api/reports/{id}/images/
POST   /api/reports/{id}/images/
DELETE /api/reports/{id}/images/{image_id}/
```

### 5.5 Data Sources API
```
GET    /api/data-sources/
POST   /api/data-sources/
POST   /api/data-sources/{id}/sync/   # مزامنة
POST   /api/data-sources/{id}/test/   # اختبار الاتصال
```

---

## 6. الشاشات (Screens)

### 6.1 Dashboard
```
┌─────────────────────────────────────────────────────────┐
│  📊 لوحة التحكم                                        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ التقارير   │ │ قيد العمل   │ │ مكتملة     │       │
│  │     12     │ │      3      │ │     9       │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                         │
│  📋 التقارير الأخيرة                                   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ التقرير السنوي 2023-2024    │ قيد العمل │ [→]  │   │
│  │ تقرير الاعتماد              │ مكتمل    │ [→]  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [+ تقرير جديد]                                        │
└─────────────────────────────────────────────────────────┘
```

### 6.2 Templates List
```
┌─────────────────────────────────────────────────────────┐
│  📄 القوالب                              [+ قالب جديد] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📄 التقرير السنوي الجامعي                       │   │
│  │    6 أقسام • افتراضي                            │   │
│  │    [تعديل] [نسخ] [حذف]                          │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ 📄 تقرير الاعتماد                               │   │
│  │    8 أقسام                                      │   │
│  │    [تعديل] [نسخ] [حذف]                          │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 6.3 Template Builder
```
┌─────────────────────────────────────────────────────────┐
│  📝 تعديل القالب: التقرير السنوي            [حفظ]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  الأقسام:                          إعدادات القسم:      │
│  ┌─────────────────────┐          ┌─────────────────┐  │
│  │ ☰ 1. المقدمة       │          │ العنوان:        │  │
│  │   [↑][↓][⚙️][🗑️]   │          │ [المقدمة    ]   │  │
│  ├─────────────────────┤          │                 │  │
│  │ ☰ 2. البحث العلمي  │ ←        │ النوع:          │  │
│  │   [↑][↓][⚙️][🗑️]   │  selected│ [مختلط     ▼]   │  │
│  ├─────────────────────┤          │                 │  │
│  │ ☰ 3. الموارد البشرية│          │ مصدر البيانات:  │  │
│  │   [↑][↓][⚙️][🗑️]   │          │ [Scopus API ▼]  │  │
│  ├─────────────────────┤          │                 │  │
│  │ ☰ 4. خدمة المجتمع  │          │ AI Prompt:      │  │
│  │   [↑][↓][⚙️][🗑️]   │          │ ┌─────────────┐ │  │
│  └─────────────────────┘          │ │اكتب فقرة   │ │  │
│                                   │ │عن البحث... │ │  │
│  [+ إضافة قسم]                    │ └─────────────┘ │  │
│                                   └─────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 6.4 Report Editor
```
┌─────────────────────────────────────────────────────────┐
│  📝 التقرير السنوي 2023-2024                           │
│  الحالة: قيد التوليد (4/6)            [تصدير] [معاينة] │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  الأقسام              │  المحتوى                        │
│  ┌─────────────────┐  │  ┌────────────────────────────┐ │
│  │ ✅ المقدمة      │  │  │ المعيار الثالث:            │ │
│  │ ✅ البحث العلمي │←─│  │ البحث العلمي               │ │
│  │ ⏳ الموارد...   │  │  │                            │ │
│  │ ⏳ البيئة...    │  │  │ حققت الجامعة إنجازات       │ │
│  │ ○ خدمة المجتمع  │  │  │ بحثية متميزة خلال العام    │ │
│  │ ○ الخاتمة      │  │  │ الأكاديمي 2023-2024...     │ │
│  └─────────────────┘  │  │                            │ │
│                       │  │ 📊 [رسم بياني]             │ │
│  [توليد الكل]        │  │                            │ │
│                       │  │ [تعديل] [إعادة توليد]     │ │
│                       │  └────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 6.5 Data Collection
```
┌─────────────────────────────────────────────────────────┐
│  📥 جمع البيانات - التقرير السنوي 2023-2024            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ✅ تم الاستلام: 8/11                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━░░░░░░ 73%                    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ كلية الهندسة          │ ✅ تم │ 2024-01-15    │   │
│  │ كلية تكنولوجيا المعلومات│ ✅ تم │ 2024-01-14    │   │
│  │ كلية العلوم            │ ⏳ بانتظار │ [تذكير]    │   │
│  │ كلية الآداب            │ ⏳ بانتظار │ [تذكير]    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  [إرسال تذكير للجميع]                                  │
└─────────────────────────────────────────────────────────┘
```

---

## 7. AI Prompts

### 7.1 System Prompt (Base)
```
أنت كاتب تقارير مؤسسية محترف باللغة العربية.

مهمتك: كتابة أقسام تقارير رسمية بناءً على البيانات المقدمة.

قواعد الكتابة:
1. استخدم اللغة العربية الفصحى الرسمية
2. كن دقيقاً في ذكر الأرقام والإحصائيات
3. اربط البيانات بالسياق المؤسسي
4. استخدم صيغة الغائب (حققت الجامعة، بلغ عدد...)
5. أضف مقارنات مع السنوات السابقة إن توفرت
6. لا تخترع أرقاماً غير موجودة في البيانات
7. اجعل النص متماسكاً ومترابطاً
```

### 7.2 Section Prompt Template
```
اكتب قسم "{section_title}" للتقرير السنوي.

الفترة: {period_start} إلى {period_end}
المؤسسة: {organization_name}

البيانات المتوفرة:
{data_json}

المطلوب:
- فقرة افتتاحية تلخص الإنجازات
- عرض الإحصائيات الرئيسية
- تحليل موجز للنتائج
- فقرة ختامية

الطول المطلوب: {word_count} كلمة تقريباً
```

### 7.3 Research Section Prompt
```
اكتب قسم البحث العلمي (المعيار الثالث) للتقرير السنوي.

البيانات:
- عدد المنشورات في Scopus: {publications_count}
- عدد الاقتباسات: {citations_count}
- H-index: {h_index}
- توزيع المنشورات حسب الكلية: {by_faculty}
- المشاريع البحثية الممولة: {funded_projects}
- براءات الاختراع: {patents}

اكتب:
1. مقدمة عن الإنجازات البحثية
2. تفصيل المنشورات العلمية
3. المشاريع البحثية
4. مقارنة مع العام السابق (إن توفرت)
5. خاتمة
```

---

## 8. Template Structure (JSON)

### القالب الافتراضي - التقرير السنوي للبترا
```json
{
  "id": "uop-annual-report",
  "name": "التقرير السنوي - جامعة البترا",
  "version": "1.0",
  "sections": [
    {
      "id": "intro",
      "title": "المقدمة",
      "order": 1,
      "type": "text",
      "data_source": null,
      "ai_prompt": "اكتب مقدمة للتقرير السنوي تتضمن نبذة عن الجامعة وأبرز إنجازات العام.",
      "settings": {
        "word_count": 300
      }
    },
    {
      "id": "research",
      "title": "المعيار الثالث: البحث العلمي",
      "order": 2,
      "type": "mixed",
      "data_source": {
        "type": "multi",
        "sources": [
          {"name": "scopus", "type": "api"},
          {"name": "research_projects", "type": "excel"}
        ]
      },
      "ai_prompt": "research_section_prompt",
      "settings": {
        "word_count": 800,
        "include_chart": true,
        "include_table": true
      }
    },
    {
      "id": "hr_finance",
      "title": "المعيار الرابع: الموارد البشرية والمالية",
      "order": 3,
      "type": "mixed",
      "data_source": {
        "type": "multi",
        "sources": [
          {"name": "hr_data", "type": "excel"},
          {"name": "finance_data", "type": "excel"}
        ]
      },
      "settings": {
        "word_count": 600
      }
    },
    {
      "id": "environment",
      "title": "المعيار الخامس: البيئة الجامعية",
      "order": 4,
      "type": "mixed",
      "data_source": {
        "type": "excel",
        "template": "environment_template.xlsx"
      },
      "settings": {
        "word_count": 500,
        "include_images": true
      }
    },
    {
      "id": "community",
      "title": "المعيار السادس: خدمة المجتمع",
      "order": 5,
      "type": "mixed",
      "data_source": {
        "type": "excel",
        "template": "community_template.xlsx"
      },
      "settings": {
        "word_count": 500,
        "include_images": true
      }
    },
    {
      "id": "conclusion",
      "title": "الخاتمة",
      "order": 6,
      "type": "text",
      "data_source": null,
      "ai_prompt": "اكتب خاتمة تلخص إنجازات العام وتستشرف المستقبل.",
      "settings": {
        "word_count": 200
      }
    }
  ]
}
```

---

## 9. مراحل التنفيذ (Phases)

### Phase 1: Foundation (الأسبوع 1-2)
- [ ] إعداد Django project
- [ ] إعداد PostgreSQL + pgvector
- [ ] Models الأساسية (Organization, Template, Report)
- [ ] APIs الأساسية
- [ ] إعداد Next.js project
- [ ] Authentication

### Phase 2: Templates (الأسبوع 2-3)
- [ ] Template CRUD
- [ ] Template Builder UI
- [ ] Section management
- [ ] قالب البترا الافتراضي

### Phase 3: Data Collection (الأسبوع 3-4)
- [ ] Excel upload & parsing
- [ ] Data request workflow
- [ ] Email notifications
- [ ] Scopus API integration

### Phase 4: AI Engine (الأسبوع 4-5)
- [ ] LangGraph setup
- [ ] Claude integration
- [ ] RAG pipeline
- [ ] Section generation
- [ ] Chart generation

### Phase 5: Report Editor (الأسبوع 5-6)
- [ ] Report creation flow
- [ ] Section editing
- [ ] Regeneration
- [ ] Image management

### Phase 6: Export (الأسبوع 6-7)
- [ ] Word generation (python-docx)
- [ ] RTL formatting
- [ ] PDF generation
- [ ] Preview

### Phase 7: Polish (الأسبوع 7)
- [ ] Testing with real data
- [ ] Performance optimization
- [ ] Bug fixes
- [ ] Documentation

---

## 10. File Structure

```
report-platform/
├── SPEC.md
├── README.md
├── docker-compose.yml
│
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── config/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── celery.py
│   ├── apps/
│   │   ├── accounts/
│   │   ├── organizations/
│   │   ├── templates_app/
│   │   ├── reports/
│   │   ├── data_collection/
│   │   ├── ai_engine/
│   │   └── export/
│   └── utils/
│
├── frontend/
│   ├── package.json
│   ├── next.config.js
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── styles/
│   └── public/
│
└── docs/
    ├── api.md
    ├── deployment.md
    └── user-guide.md
```

---

## 11. Environment Variables

```env
# Django
SECRET_KEY=
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgres://user:pass@localhost:5432/report_platform

# Redis
REDIS_URL=redis://localhost:6379/0

# AI
ANTHROPIC_API_KEY=

# Storage
MEDIA_ROOT=/path/to/media
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=

# Email
EMAIL_HOST=
EMAIL_PORT=
EMAIL_HOST_USER=
EMAIL_HOST_PASSWORD=

# Scopus API
SCOPUS_API_KEY=
```

---

## 12. Success Metrics

| المقياس | الهدف |
|---------|-------|
| وقت توليد التقرير | < 5 دقائق |
| دقة البيانات | 100% (مطابقة للمصدر) |
| جودة النص العربي | مراجعة بشرية إيجابية |
| وقت التصدير | < 30 ثانية |

---

*آخر تحديث: 2026-02-20*
