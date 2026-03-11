# 🤖 Claude Code Briefing — مشروع تقرير.ai

> **اقرأ هذا الملف أولاً قبل أي شي**

---

## 🎯 الهدف بجملة واحدة

أبني **منصة تولّد تقارير مؤسسية تلقائياً بالذكاء الاصطناعي** — زر واحد ينتج تقرير Word كامل.

---

## 📌 السياق

### المشكلة اللي أحلها:
جامعة البترا (مثال) تنتج تقرير سنوي:
- 784 فقرة نصية
- 63 جدول
- 67 رسم بياني
- بيانات من 30+ جهة داخلية

**حالياً:** يستغرق 3-4 أشهر عمل يدوي.

**المطلوب:** ضغطة زر → تقرير جاهز.

---

## 💡 الفكرة الأساسية

```
1. أعرّف قالب (Template) = هيكل التقرير
   └── محاور (Axes) ← بنود (Items) ← جهات مسؤولة (Entities)

2. أجمع البيانات
   └── كل جهة تدخل بياناتها عبر رابط خاص
   └── أو أستورد من Excel

3. AI يولّد المحتوى
   └── نصوص تحليلية لكل بند
   └── جداول من البيانات
   └── رسوم بيانية

4. أصدّر Word
   └── تقرير كامل منسق بالعربي
```

---

## 🗂️ هيكل المشروع

```
/Users/mohammadhabahbeh/Desktop/My File/Project/report-platform/
├── backend/                    # Django + DRF
│   ├── apps/
│   │   ├── templates_app/      # القوالب والمحاور والبنود
│   │   ├── data_collection/    # جمع البيانات
│   │   ├── reports/            # التوليد والتصدير
│   │   │   ├── models.py       # AxisDraft, ItemDraft
│   │   │   ├── generation_service.py  # توليد AI
│   │   │   ├── chart_service.py       # رسوم بيانية
│   │   │   ├── export_service.py      # تصدير Word
│   │   │   └── data_import_service.py # استيراد Excel
│   │   └── ...
│   └── config/settings.py
│
├── frontend/                   # Next.js + React
│   └── src/app/dashboard/
│       ├── generate/page.tsx   # صفحة التوليد الرئيسية
│       ├── data/               # جمع البيانات
│       └── ...
│
├── PROJECT_SUMMARY.md          # ملخص تقني شامل
└── CLAUDE_BRIEF.md             # هذا الملف
```

---

## 📊 وين وصلت (الحالة الحالية)

### ✅ مكتمل:
| العنصر | الحالة |
|--------|--------|
| Backend كامل (Django) | ✅ 100% |
| Frontend كامل (Next.js) | ✅ 100% |
| نظام القوالب | ✅ 100% |
| جمع البيانات من الجهات | ✅ 100% |
| استيراد Excel | ✅ 100% |
| توليد AI للنصوص | ✅ 100% |
| توليد الرسوم البيانية | ✅ 100% |
| تصدير Word | ✅ 100% |

### ⏳ قيد الإنجاز:
| العنصر | الحالة | التفاصيل |
|--------|--------|----------|
| البيانات | 86% | 42 من 49 بند عندهم بيانات |
| المحتوى النصي | 57% | 28 بند مولّد، 21 ينتظر |
| الجداول | 44% | 28 من 63 |
| الرسوم | 28% | 19 من 67 |

### 📍 الخطوة التالية:
**توليد المحتوى للـ 21 بند الناقصين** — لكن أنتظر أن أتأكد إن كل شي جاهز أولاً.

---

## 🔑 الملفات المهمة

### Backend:
```python
# التوليد
backend/apps/reports/generation_service.py

# الرسوم البيانية
backend/apps/reports/chart_service.py

# التصدير
backend/apps/reports/export_service.py

# Models
backend/apps/reports/models.py  # AxisDraft, ItemDraft
backend/apps/templates_app/models.py  # Template, Axis, Item, Entity
```

### Frontend:
```typescript
// صفحة التوليد الرئيسية
frontend/src/app/dashboard/generate/page.tsx

// API Client
frontend/src/lib/api.ts
```

### البيانات المرجعية:
```
# التقرير الأصلي (المرجع)
/Users/mohammadhabahbeh/Desktop/report yearly/2023-2024/
  └── التقرير السنوي لجامعة البترا 2023-2024.docx

# ملفات Excel
/Users/mohammadhabahbeh/Desktop/report yearly/platform/need/data_complete/
  └── 145 ملف Excel
```

---

## 🛠️ كيف تشغّل المشروع

```bash
# Backend
cd "/Users/mohammadhabahbeh/Desktop/My File/Project/report-platform/backend"
source venv/bin/activate
python manage.py runserver 8002

# Frontend
cd "/Users/mohammadhabahbeh/Desktop/My File/Project/report-platform/frontend"
npm run dev
```

**URLs:**
- Dashboard: http://localhost:3000/dashboard
- API: http://localhost:8002/api/

---

## 📝 أوامر مفيدة

### تصدير تقرير:
```python
from apps.data_collection.models import DataCollectionPeriod
from apps.reports.export_service import ExportService

period = DataCollectionPeriod.objects.first()
service = ExportService(period)
output = service.export_to_word(include_charts=True)
```

### توليد محتوى:
```python
from apps.reports.generation_service import GenerationService

service = GenerationService(period, model='cli')
result = service.generate_items(item_ids=[1, 2, 3])
```

### فحص حالة البنود:
```python
from apps.reports.models import ItemDraft

for draft in ItemDraft.objects.filter(period=period):
    print(f"{draft.item.code}: data={bool(draft.current_value)}, content={bool(draft.content)}")
```

---

## ⚠️ ملاحظات مهمة

1. **لا تولّد محتوى** إلا لما أقول "جاهز" — أريد التأكد من البيانات أولاً.

2. **التقرير الأصلي** هو المرجع — أي مخرج يجب أن يكون بنفس الجودة أو أفضل.

3. **الـ AI Model الافتراضي:** `cli` (Claude CLI) — يستخدم اشتراك Pro.

4. **اللغة:** كل المحتوى عربي فصيح أكاديمي.

---

## 🎯 الهدف النهائي

```
زر واحد → Word كامل = التقرير الأصلي (784 فقرة + 63 جدول + 67 رسم)
```

**حالياً المخرج:**
- 464 فقرة (59%)
- 28 جدول (44%)
- 19 رسم (28%)

**المتبقي:** توليد المحتوى للبنود الناقصة + المزيد من الرسوم.

---

*للمزيد من التفاصيل التقنية: اقرأ `PROJECT_SUMMARY.md`*
