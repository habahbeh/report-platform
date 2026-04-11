# نظام جمع البيانات للتقرير السنوي

## 📖 الشرح البسيط (لأي شخص)

### المشكلة اللي بنحلها

تخيل إنك مدير في جامعة وبدك تجهز التقرير السنوي. التقرير فيه 48 موضوع مختلف:
- أعداد الطلاب
- الأبحاث العلمية  
- الاتفاقيات الدولية
- الأنشطة الطلابية
- ... وغيرها

كل موضوع، المعلومات تيجي من جهة مختلفة:
- **أعداد الطلاب** ← من عمادة القبول
- **الأبحاث** ← من عمادة البحث العلمي
- **الأنشطة** ← من عمادة شؤون الطلبة
- **الموازنة** ← من الدائرة المالية

### كيف الوضع الحالي؟ 😫

```
المدير يرسل إيميل لـ 38 جهة ← 
الجهات ترد بملفات Excel مختلفة ←
المدير يجمع الملفات يدوياً ←
يكتشف إن 10 جهات ما ردوا ←
يرسل تذكيرات ←
جهة ترسل بيانات غلط ←
يرجعها للتصحيح ←
... شهور من المعاناة! 😵
```

### كيف بده يصير مع النظام؟ 😎

```
1. المدير يفتح "فترة جمع بيانات" جديدة
2. كل جهة تستلم إشعار: "مطلوب منك 5 بنود، الموعد بعد أسبوعين"
3. الجهة تدخل بياناتها مباشرة بالنظام (نماذج جاهزة)
4. النظام يرسل تذكيرات تلقائية قبل الموعد
5. المراجع يشوف البيانات ويوافق أو يرجعها للتعديل
6. لما الكل يخلص → النظام يجمّع البيانات تلقائياً
7. الذكاء الاصطناعي يكتب نصوص التقرير من البيانات
8. تصدير Word/PDF جاهز! 🎉
```

### مثال عملي

**بند: أعداد الطلبة المسجلين**

| الخطوة | بدون النظام | مع النظام |
|--------|-------------|-----------|
| الطلب | إيميل يدوي | إشعار تلقائي |
| الإدخال | Excel بصيغة مختلفة كل مرة | نموذج موحد جاهز |
| التذكير | المدير يتذكر يتابع | تذكير تلقائي قبل 7، 3، 1 يوم |
| المراجعة | المدير يفتح الملف ويدقق | زر "موافقة" أو "مرفوض مع ملاحظات" |
| التجميع | Copy paste يدوي | تلقائي 100% |

### الأدوار بالنظام

```
👤 مدخل البيانات (Data Officer)
   - يدخل بيانات جهته
   - يرفع الملفات المطلوبة
   - يرى ملاحظات المراجع

👁️ المراجع (Reviewer)  
   - يراجع التسليمات
   - يوافق أو يرفض
   - يضيف ملاحظات

👑 المدير (Admin)
   - يرى نسبة الإنجاز الكلية
   - يتابع المتأخرين
   - يصدر التقرير النهائي
```

### الفوائد

| قبل | بعد |
|-----|-----|
| شهور لجمع البيانات | أسابيع |
| 50+ إيميل | 0 إيميلات |
| لا يوجد تتبع | تعرف مين سلّم ومين لأ بثانية |
| أخطاء بالنقل | لا أخطاء (البيانات من المصدر) |
| لا يوجد أرشيف | كل شي محفوظ ومقارن مع السنوات السابقة |

---

## 🔧 التفاصيل التقنية (للمطورين)

### البنية العامة

```
┌─────────────────────────────────────────────────────────────┐
│                    نظام التقارير السنوية                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ جمع البيانات │→│   المراجعة   │→│  التوليد     │       │
│  │ Collection   │  │   Review     │  │  Generation  │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         ↓                ↓                 ↓                │
│  ┌──────────────────────────────────────────────────┐       │
│  │              قاعدة البيانات المركزية              │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 1. نماذج البيانات (Models)

#### Entity - الجهات
```python
class Entity(models.Model):
    """الجهات المسؤولة عن تقديم البيانات"""
    name_ar = models.CharField(max_length=200)
    name_en = models.CharField(max_length=200, blank=True)
    type = models.CharField(choices=[
        ('college', 'كلية'),
        ('deanship', 'عمادة'),
        ('department', 'دائرة'),
        ('center', 'مركز'),
        ('unit', 'وحدة'),
    ])
    
    # المسؤولين
    head_name = models.CharField(max_length=100)
    head_email = models.EmailField()
    head_phone = models.CharField(max_length=20, blank=True)
    
    data_officer_name = models.CharField(max_length=100)
    data_officer_email = models.EmailField()
    
    # التسلسل الهرمي
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

#### DataCollectionPeriod - فترات جمع البيانات
```python
class DataCollectionPeriod(models.Model):
    """فترة جمع البيانات لتقرير معين"""
    template = models.ForeignKey('Template', on_delete=models.CASCADE)
    academic_year = models.CharField(max_length=20)  # "2023-2024"
    name = models.CharField(max_length=200)
    
    # التواريخ
    start_date = models.DateField()  # بداية جمع البيانات
    end_date = models.DateField()    # نهاية جمع البيانات
    report_date = models.DateField(null=True)  # تاريخ إصدار التقرير
    
    status = models.CharField(choices=[
        ('draft', 'مسودة'),
        ('collecting', 'جاري الجمع'),
        ('reviewing', 'جاري المراجعة'),
        ('generating', 'جاري التوليد'),
        ('closed', 'مغلق'),
    ], default='draft')
    
    # إعدادات التذكير
    reminder_days = models.JSONField(default=list)  # [7, 3, 1]
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

#### ItemAssignment - تعيين البنود للجهات
```python
class ItemAssignment(models.Model):
    """ربط بند معين بجهة معينة في فترة معينة"""
    item = models.ForeignKey('Item', on_delete=models.CASCADE)
    entity = models.ForeignKey('Entity', on_delete=models.CASCADE)
    period = models.ForeignKey('DataCollectionPeriod', on_delete=models.CASCADE)
    
    role = models.CharField(choices=[
        ('primary', 'مسؤول رئيسي'),      # الجهة المسؤولة عن البند
        ('contributor', 'مساهم'),         # جهة تقدم جزء من البيانات
    ], default='primary')
    
    # نوع البيانات المطلوبة
    data_type = models.CharField(choices=[
        ('value', 'قيم رقمية'),
        ('table', 'جدول'),
        ('file', 'ملف'),
        ('text', 'نص'),
        ('mixed', 'مختلط'),
    ])
    
    deadline = models.DateField(null=True, blank=True)  # موعد خاص
    instructions = models.TextField(blank=True)  # تعليمات خاصة
    
    class Meta:
        unique_together = ['item', 'entity', 'period']
```

#### ItemDataTemplate - قالب البيانات المطلوبة
```python
class ItemDataField(models.Model):
    """تعريف حقول البيانات المطلوبة لكل بند"""
    item = models.ForeignKey('Item', on_delete=models.CASCADE, related_name='data_fields')
    
    field_name = models.CharField(max_length=100)
    field_name_en = models.CharField(max_length=100, blank=True)
    
    field_type = models.CharField(choices=[
        ('number', 'رقم'),
        ('text', 'نص'),
        ('textarea', 'نص طويل'),
        ('date', 'تاريخ'),
        ('file', 'ملف'),
        ('image', 'صورة'),
        ('table', 'جدول'),
        ('select', 'اختيار'),
    ])
    
    is_required = models.BooleanField(default=True)
    
    # التحقق
    validation = models.JSONField(default=dict)
    # مثال: {"min": 0, "max": 10000} للأرقام
    # مثال: {"options": ["نعم", "لا"]} للاختيار
    # مثال: {"columns": ["الكلية", "العدد"]} للجداول
    
    help_text = models.TextField(blank=True)
    default_value = models.CharField(max_length=200, blank=True)
    
    order = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['order']
```

#### EntitySubmission - تسليمات الجهات
```python
class EntitySubmission(models.Model):
    """تسليم جهة لبيانات بند معين"""
    assignment = models.ForeignKey('ItemAssignment', on_delete=models.CASCADE)
    
    # البيانات
    data = models.JSONField(default=dict)
    # مثال: {"طلبة_البكالوريوس": 5000, "طلبة_الماجستير": 800}
    
    # الحالة
    status = models.CharField(choices=[
        ('draft', 'مسودة'),
        ('submitted', 'مُسلَّم'),
        ('under_review', 'قيد المراجعة'),
        ('approved', 'معتمد'),
        ('rejected', 'مرفوض'),
        ('needs_revision', 'يحتاج تعديل'),
    ], default='draft')
    
    # الإصدار (للتتبع)
    version = models.PositiveIntegerField(default=1)
    
    # ملاحظات الجهة
    notes = models.TextField(blank=True)
    
    # التواريخ
    submitted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    submitted_at = models.DateTimeField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class SubmissionFile(models.Model):
    """ملفات مرفقة بالتسليم"""
    submission = models.ForeignKey('EntitySubmission', on_delete=models.CASCADE, related_name='files')
    file = models.FileField(upload_to='submissions/%Y/%m/')
    
    file_type = models.CharField(choices=[
        ('data', 'ملف بيانات'),
        ('supporting', 'مستند داعم'),
        ('image', 'صورة'),
    ])
    
    description = models.CharField(max_length=200, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
```

#### ReviewLog - سجل المراجعات
```python
class ReviewLog(models.Model):
    """سجل إجراءات المراجعة"""
    submission = models.ForeignKey('EntitySubmission', on_delete=models.CASCADE, related_name='reviews')
    reviewer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    action = models.CharField(choices=[
        ('approved', 'اعتماد'),
        ('rejected', 'رفض'),
        ('returned', 'إرجاع للتعديل'),
        ('commented', 'ملاحظة'),
    ])
    
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

#### ItemAggregation - تجميع البيانات
```python
class ItemAggregation(models.Model):
    """البيانات المجمعة لبند من عدة جهات"""
    item = models.ForeignKey('Item', on_delete=models.CASCADE)
    period = models.ForeignKey('DataCollectionPeriod', on_delete=models.CASCADE)
    
    aggregation_type = models.CharField(choices=[
        ('sum', 'مجموع'),
        ('average', 'متوسط'),
        ('list', 'قائمة'),
        ('latest', 'آخر قيمة'),
        ('custom', 'مخصص'),
    ])
    
    # البيانات المجمعة
    aggregated_data = models.JSONField(default=dict)
    
    # للمقارنة
    previous_period = models.ForeignKey('DataCollectionPeriod', null=True, blank=True,
                                         on_delete=models.SET_NULL, related_name='+')
    previous_data = models.JSONField(default=dict)
    change_percentage = models.JSONField(default=dict)  # نسبة التغيير لكل حقل
    
    is_final = models.BooleanField(default=False)
    generated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['item', 'period']
```

#### Notification - الإشعارات
```python
class Notification(models.Model):
    """إشعارات النظام"""
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    
    type = models.CharField(choices=[
        ('assignment', 'تعيين جديد'),
        ('reminder', 'تذكير'),
        ('status_change', 'تغيير حالة'),
        ('deadline', 'اقتراب موعد'),
        ('review', 'ملاحظة مراجع'),
        ('system', 'نظام'),
    ])
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    link = models.CharField(max_length=500, blank=True)  # رابط الإجراء
    
    is_read = models.BooleanField(default=False)
    sent_via = models.CharField(choices=[
        ('system', 'النظام فقط'),
        ('email', 'إيميل فقط'),
        ('both', 'النظام والإيميل'),
    ], default='both')
    
    created_at = models.DateTimeField(auto_now_add=True)
```

### 2. الـ APIs

```python
# === Entities ===
GET    /api/v1/entities/                      # قائمة الجهات
POST   /api/v1/entities/                      # إضافة جهة
GET    /api/v1/entities/{id}/                 # تفاصيل جهة
PATCH  /api/v1/entities/{id}/                 # تعديل جهة
GET    /api/v1/entities/{id}/assignments/     # تعيينات الجهة

# === Collection Periods ===
GET    /api/v1/periods/                       # قائمة الفترات
POST   /api/v1/periods/                       # فترة جديدة
GET    /api/v1/periods/{id}/                  # تفاصيل فترة
PATCH  /api/v1/periods/{id}/                  # تعديل فترة
GET    /api/v1/periods/{id}/progress/         # نسبة الإنجاز
POST   /api/v1/periods/{id}/open/             # فتح الفترة للجمع
POST   /api/v1/periods/{id}/close/            # إغلاق الفترة
POST   /api/v1/periods/{id}/send-reminders/   # إرسال تذكيرات

# === Assignments ===
GET    /api/v1/assignments/                   # كل التعيينات
POST   /api/v1/assignments/                   # تعيين جديد
POST   /api/v1/assignments/bulk/              # تعيينات متعددة
DELETE /api/v1/assignments/{id}/              # حذف تعيين

# === Submissions ===
GET    /api/v1/submissions/                   # للمراجعين: كل التسليمات
GET    /api/v1/my-submissions/                # للجهة: تسليماتي
GET    /api/v1/submissions/{id}/              # تفاصيل تسليم
POST   /api/v1/assignments/{id}/draft/        # حفظ مسودة
POST   /api/v1/assignments/{id}/submit/       # تسليم رسمي
POST   /api/v1/submissions/{id}/revise/       # تعديل بعد الإرجاع

# === Review ===
POST   /api/v1/submissions/{id}/approve/      # اعتماد
POST   /api/v1/submissions/{id}/reject/       # رفض
POST   /api/v1/submissions/{id}/return/       # إرجاع للتعديل
POST   /api/v1/submissions/{id}/comment/      # إضافة ملاحظة
GET    /api/v1/submissions/{id}/history/      # تاريخ المراجعات

# === Aggregation ===
GET    /api/v1/items/{id}/aggregated/         # البيانات المجمعة
POST   /api/v1/items/{id}/aggregate/          # تجميع البيانات
GET    /api/v1/periods/{id}/aggregations/     # كل التجميعات للفترة

# === Dashboards ===
GET    /api/v1/dashboard/entity/              # لوحة الجهة
GET    /api/v1/dashboard/reviewer/            # لوحة المراجع
GET    /api/v1/dashboard/admin/               # لوحة الإدارة
GET    /api/v1/dashboard/admin/late/          # المتأخرين

# === Notifications ===
GET    /api/v1/notifications/                 # إشعاراتي
POST   /api/v1/notifications/{id}/read/       # تحديد كمقروء
POST   /api/v1/notifications/read-all/        # تحديد الكل كمقروء
```

### 3. الصفحات (Frontend)

```
/dashboard/
├── data/
│   ├── periods/                    # إدارة فترات الجمع
│   │   ├── [id]/                   # تفاصيل فترة
│   │   └── [id]/progress/          # متابعة الإنجاز
│   ├── entities/                   # إدارة الجهات
│   │   └── [id]/                   # تفاصيل جهة
│   ├── assignments/                # تعيين البنود للجهات
│   ├── submissions/                # التسليمات (للمراجعين)
│   │   └── [id]/                   # مراجعة تسليم
│   └── review/                     # لوحة المراجعة
│
├── entity/                         # بوابة الجهة
│   ├── my-items/                   # البنود المطلوبة مني
│   ├── submit/[assignment_id]/     # نموذج الإدخال
│   └── history/                    # تسليماتي السابقة
│
└── admin/
    ├── late-report/                # تقرير المتأخرين
    └── aggregation/                # مراجعة التجميعات
```

### 4. Workflow كامل

```
┌────────────────────────────────────────────────────────────────┐
│                         المدير                                  │
│  1. إنشاء فترة جمع بيانات جديدة                                 │
│  2. تحديد المواعيد وأيام التذكير                                │
│  3. تعيين البنود للجهات (bulk import ممكن)                      │
│  4. فتح الفترة للجمع                                            │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│                      النظام (تلقائي)                            │
│  • إرسال إشعارات لكل الجهات                                     │
│  • تذكيرات قبل الموعد (7، 3، 1 يوم)                             │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│                     الجهات (مدخلي البيانات)                     │
│  1. استلام الإشعار                                              │
│  2. الدخول لبوابة الجهة                                         │
│  3. رؤية البنود المطلوبة                                        │
│  4. إدخال البيانات (حفظ مسودة ممكن)                             │
│  5. التسليم الرسمي                                              │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│                        المراجعون                                │
│  1. استلام إشعار بتسليم جديد                                    │
│  2. مراجعة البيانات                                             │
│  3. مقارنة مع السنة السابقة                                     │
│  4. اعتماد / رفض / إرجاع للتعديل                                │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│                     التجميع (تلقائي/يدوي)                       │
│  • تجميع بيانات كل بند من كل الجهات                            │
│  • حساب نسب التغيير عن السنة السابقة                           │
│  • تجهيز البيانات للتوليد                                       │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│                     توليد التقرير (AI)                          │
│  • كتابة نصوص تحليلية من البيانات                              │
│  • توليد الجداول والرسوم البيانية                               │
│  • تصدير Word/PDF                                               │
└────────────────────────────────────────────────────────────────┘
```

### 5. الصلاحيات (Permissions)

```python
# الأدوار
ROLES = {
    'admin': 'مدير النظام',
    'reviewer': 'مراجع',
    'entity_head': 'رئيس جهة',
    'data_officer': 'مدخل بيانات',
}

# الصلاحيات
PERMISSIONS = {
    'admin': [
        'manage_periods',
        'manage_entities', 
        'manage_assignments',
        'view_all_submissions',
        'review_submissions',
        'manage_aggregations',
        'generate_reports',
        'send_notifications',
    ],
    'reviewer': [
        'view_assigned_submissions',
        'review_submissions',
        'view_aggregations',
    ],
    'entity_head': [
        'view_entity_assignments',
        'submit_data',
        'view_entity_history',
    ],
    'data_officer': [
        'view_entity_assignments',
        'submit_data',
    ],
}
```

### 6. الإشعارات التلقائية

| الحدث | المستلم | القناة |
|-------|---------|--------|
| تعيين جديد | الجهة | إيميل + نظام |
| قبل الموعد 7 أيام | الجهة | إيميل |
| قبل الموعد 3 أيام | الجهة | إيميل |
| قبل الموعد 1 يوم | الجهة | إيميل + نظام |
| تم التسليم | المراجع | نظام |
| تم الاعتماد | الجهة | إيميل + نظام |
| تم الرفض | الجهة | إيميل + نظام |
| إرجاع للتعديل | الجهة | إيميل + نظام |
| تأخر عن الموعد | المدير | نظام |

### 7. التكامل مع نظام التقارير الحالي

```python
# الربط بين النظامين

# 1. بعد اعتماد كل تسليمات البند:
def on_item_fully_approved(item, period):
    # تجميع البيانات
    aggregation = aggregate_item_data(item, period)
    
    # تحديث ItemComponent.config
    for component in item.components.filter(component_type='table'):
        component.config['extracted_data'] = aggregation.aggregated_data
        component.save()

# 2. عند توليد التقرير:
def generate_report(period):
    for item in period.template.items.all():
        aggregation = ItemAggregation.objects.get(item=item, period=period)
        
        # توليد النص بالـ AI
        draft = generate_item_draft(item, aggregation.aggregated_data)
        
        # توليد الرسوم البيانية
        generate_charts(item, aggregation)
```

---

## ✅ قائمة التنفيذ

### Phase 1: الأساسيات (أسبوع 1)
- [ ] Models: Entity, DataCollectionPeriod, ItemAssignment
- [ ] Admin interface للنماذج الأساسية
- [ ] API: CRUD للجهات والفترات
- [ ] صفحة إدارة الجهات

### Phase 2: التسليمات (أسبوع 2)
- [ ] Models: EntitySubmission, SubmissionFile, ItemDataField
- [ ] API: التسليمات والملفات
- [ ] بوابة الجهة: عرض البنود المطلوبة
- [ ] نموذج الإدخال الديناميكي

### Phase 3: المراجعة (أسبوع 3)
- [ ] Models: ReviewLog
- [ ] API: المراجعة والاعتماد
- [ ] لوحة المراجعة
- [ ] Workflow الحالات

### Phase 4: التجميع والإشعارات (أسبوع 4)
- [ ] Models: ItemAggregation, Notification
- [ ] API: التجميع والإشعارات
- [ ] إشعارات تلقائية (Celery)
- [ ] لوحة المتابعة للمدير

### Phase 5: التكامل (أسبوع 5)
- [ ] ربط مع نظام التوليد
- [ ] Import/Export Excel
- [ ] تقارير الأداء
- [ ] اختبارات شاملة

---

## 📝 ملاحظات التنفيذ

1. **ابدأ بالـ Models** — البنية أولاً
2. **Admin قبل Frontend** — للاختبار السريع
3. **الـ API ثم Frontend** — فصل واضح
4. **الإشعارات آخر شي** — تحتاج Celery
5. **Import Excel مهم** — للبيانات التاريخية والتعيينات

---

*آخر تحديث: 2026-04-04*
