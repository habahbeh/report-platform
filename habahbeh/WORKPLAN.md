# تقرير.ai — مخطط العمل التفصيلي
## آخر تحديث: 2026-03-18

---

## الرؤية
منصة توليد تقارير سنوية ذكية — هيكل أولاً، جداول من البيانات، نصوص بالـ AI.
أي شخص يفتح المنصة لأول مرة يفهم شو يسوي بدون تدريب.

## المستندات المرجعية
- `habahbeh/taqrir-ai-workflow.html` — الـ Workflow الكامل (7 مراحل)
- `habahbeh/taqrir-ai-flow.html` — التصميم القديم (مرجع تاريخي فقط)

## المشروع
- Backend: Django REST Framework — `backend/` — Port 8002
- Frontend: Next.js 16 — `frontend/` — Port 3000
- Project ID للتجربة: `f2bd81fc-5af5-495e-bd48-0d95fdc673bb` (جامعة البترا)

---

## ═══════════════════════════════════════════
## المرحلة 1: Backend — الموديلات الجديدة
## ═══════════════════════════════════════════
## الحالة: ✅ مكتملة

### القرار الاستراتيجي: بناء على الموجود
> اكتشفنا أن `ItemComponent`, `TableDefinition`, `ChartDefinition` موجودة في `templates_app`.
> بدل إنشاء موديلات مكررة، بنينا على الموجود:
> - `ItemComponent` → أضفنا `ref_id`, `references`, `heading` type
> - `TableDefinition` و `ChartDefinition` → موجودة وكافية
> - `TableData` → موجود في `reports/models.py`
> - أضفنا 3 موديلات جديدة فقط: `ItemStructure`, `GeneratedContent`, `DetailedResponse`

### 1.1 ✅ إنشاء موديل ItemStructure
- **الملف:** `backend/apps/reports/models.py` (سطر ~390)
- **الوصف:** هيكل البند على مستوى المشروع (project-level)
- **الحقول:** id(UUID), project(FK), item(FK), components(JSONField), source, style_sample, is_approved
- **ميزات:** `create_from_template()`, `get_paragraphs()`, `get_context_for_paragraph()`

### 1.2 ✅ تم دمجه مع ItemStructure
- **القرار:** بدل ComponentData منفصل، المكونات مخزّنة كـ JSONField في `ItemStructure.components`
- **السبب:** أبسط، أسرع، JSONField مرن بما يكفي

### 1.3 ✅ TableDefinition — موجود (لم نحتج إنشاءه)
- **الملف:** `backend/apps/templates_app/models.py` (سطر 418)
- **حالياً:** يدعم static/dynamic/hierarchical/excel_import

### 1.4 ✅ TableData — موجود (لم نحتج إنشاءه)
- **الملف:** `backend/apps/reports/models.py` (سطر 326)

### 1.5 ✅ ChartDefinition — موجود (لم نحتج إنشاءه)
- **الملف:** `backend/apps/templates_app/models.py` (سطر 500)

### 1.6 ✅ إنشاء موديل GeneratedContent
- **الملف:** `backend/apps/reports/models.py` (سطر ~599)
- **الوصف:** النص المولّد لكل فقرة (per-paragraph AI text)
- **الحقول:** id(UUID), item_structure(FK), project(FK), component_id, content, manual_edit, status, version, AI metadata, prompt_used
- **ميزات:** `final_content`, `complete_generation()`, `edit()`, `approve()`, `regenerate()`

### 1.7 ✅ إنشاء موديل DetailedResponse
- **الملف:** `backend/apps/reports/models.py` (سطر ~755)
- **الوصف:** بيانات تفصيلية إضافية (جداول، سلاسل زمنية، توزيعات)
- **الحقول:** id(UUID), response(FK), project(FK), item(FK), table_definition(FK), data_source, data_type, data(JSON), source_file

### 1.8 ✅ تعديل ItemComponent + Migrations + Admin
- **ItemComponent:** أُضيف `ref_id`, `references` JSONField, `heading` type
- **Migration templates_app:** `0004_itemcomponent_ref_id_itemcomponent_references_and_more`
- **Migration reports:** `0009_detailedresponse_itemstructure_generatedcontent`
- **Admin:** ItemStructureAdmin, GeneratedContentAdmin, DetailedResponseAdmin — مع واجهات كاملة

### 1.9 ✅ APIs — Serializers + Views + URLs
- **Serializers:** ItemStructureSerializer, GeneratedContentSerializer, DetailedResponseSerializer + Create/Edit/Regenerate serializers
- **ViewSets:**
  - `ItemStructureViewSet` — CRUD + `init_from_template` + `approve` + `context`
  - `GeneratedContentViewSet` — CRUD + `edit` + `approve` + `regenerate`
  - `DetailedResponseViewSet` — CRUD
- **Function Views:**
  - `build_skeleton` — POST `/api/reports/build-skeleton/`
  - `generate_text` — POST `/api/reports/generate-text/`
  - `project_skeleton_status` — GET `/api/reports/projects/{id}/skeleton-status/`
- **URLs registered in router:** `structures/`, `generated-contents/`, `detailed-responses/`

---

## ═══════════════════════════════════════════
## المرحلة 2: Backend — منطق التوليد الجديد
## ═══════════════════════════════════════════
## الحالة: ✅ مكتملة (5/5)

### 2.1 ✅ خدمة بناء الهيكل (SkeletonBuilder)
- **الملف:** `backend/apps/export/skeleton_builder.py` (~510 سطر)
- **الوظيفة:** يقرأ ItemStructure + بيانات Response ← يبني HTML skeleton
  - العناوين من Structure
  - الجداول من TableData (4 مصادر بيانات: DetailedResponse → TableData → DetailedResponse بـ item → TableDefinition static)
  - الأشكال من ChartDefinition + TableData (CSS-only charts: bar, pie, donut)
  - Placeholders للفقرات النصية مع عرض GeneratedContent إذا وُجد
- **ميزات:**
  - `build_full_report(progress_callback)` — تقرير كامل
  - `build_item_skeleton(structure)` — بند واحد
  - Caching ذكي (responses, table_data, detailed, generated_content)
  - CSS كامل مع دعم الطباعة (RTL, print media)
  - Fallback لبنود بدون Structure

### 2.2 ✅ خدمة توليد النصوص (TextGenerator)
- **الملف:** `backend/apps/reports/text_generator.py` (~748 سطر)
- **الوظيفة:** لكل فقرة (placeholder) في الهيكل:
  - يجمع السياق المحيط (before/after components)
  - يجمع بيانات البند من Response (مع aggregation: sum, average, count, latest)
  - يبني prompt سياقي مفصّل (الدور، الموضع، السياق، المراجع، البيانات، التعليمات)
  - يستدعي AI engine (cli, gemini, claude)
  - يحفظ النتيجة في GeneratedContent مع AI metadata
- **ميزات:**
  - `generate_paragraph(gc)` — فقرة واحدة مع سياق كامل
  - `generate_all(progress_callback)` — كل الفقرات مع تتبع التقدم
  - `generate_for_structure(structure)` — كل فقرات بند واحد
  - Table/Chart data summaries للـ prompt (إحصائيات + عينات)
  - Style sample support (محاكاة أسلوب كتابة)
- **التكامل:** مدمج في views.py عبر `regenerate` action و `generate_text` function view

### 2.3 ✅ نظام المراجع والترقيم (ReferenceManager)
- **الملف:** `backend/apps/export/reference_manager.py` (~180 سطر)
- **الوظيفة:**
  - عند التصدير: يعدّ كل الجداول والأشكال بالترتيب (per-axis numbering)
  - يستبدل {ref:t1} → "جدول (1-3)" في كل النصوص
  - يكتشف المراجع المكسورة (جدول محذوف) وينبّه المستخدم
- **ميزات:**
  - `build_registry()` — بناء فهرس الترقيم
  - `resolve_references(text, structure)` — حل المراجع في نص
  - `get_table_index()` / `get_chart_index()` — فهارس كاملة
  - `get_stats()` — إحصائيات (عدد الجداول/الأشكال/المراجع المكسورة)

### 2.4 ✅ تحديث خدمة التصدير
- **الملف:** `backend/apps/export/services.py`
- **ما تم:**
  - `generate_project_html_v2()` — HTML كامل باستخدام SkeletonBuilder + ReferenceManager
  - `export_project_v2_to_word()` — تحويل HTML → Word (python-docx + BeautifulSoup)
  - `export_project_v2_to_pdf()` — تحويل HTML → PDF (WeasyPrint)
  - `_build_indexes_html()` — فهرس الجداول وفهرس الأشكال
  - `_has_new_system_data()` — كشف تلقائي: V2 (ItemStructure) vs legacy (ItemDraft)
  - تحديث `export_project_to_word()` و `export_project_to_pdf()` للتوجيه التلقائي
- **التوافق:** النظام القديم يعمل بدون تغيير. المشاريع التي تحتوي ItemStructure تُصدَّر بالنظام الجديد تلقائياً

### 2.5 ✅ خدمة تحليل التقرير السابق (ReportAnalyzer)
- **الملف:** `backend/apps/reports/report_analyzer.py` (~300 سطر)
- **الوظيفة:** يحلل ملف Word (.docx) ويستخرج:
  - Structure كل بند (ترتيب الفقرات والجداول والأشكال) عبر regex patterns
  - تعريف أعمدة كل جدول (headers + column types: number/text/percentage)
  - أسلوب الكتابة (عينة نصية — أول 3 فقرات طويلة)
  - إحصائيات (عدد المحاور/البنود/الجداول/الفقرات)
- **API:** `POST /api/reports/analyze-report/` (multipart/form-data)
- **Frontend:** `api.projects.analyzeReport(file)` + خطوة اختيارية في Wizard (خطوة 3)
- **Patterns:** كشف عناوين المحاور + البنود + عناوين الجداول والأشكال (عربي)

---

## ═══════════════════════════════════════════
## المرحلة 3: Frontend — إعادة تصميم التجربة
## ═══════════════════════════════════════════
## الحالة: ✅ مكتملة (3.1-3.3 + 3.5-3.9 + APIs)

### 3.1 ✅ تبسيط القائمة الجانبية
- **الملف:** `frontend/src/components/layout/Sidebar.tsx`
- **التعديل:** من 4 مجموعات (13 رابط) إلى 5 روابط مسطحة:
  1. الرئيسية (`/dashboard`)
  2. المشاريع (`/dashboard/projects`) — مع matchPrefix
  3. البيانات (`/dashboard/data`) — مع matchPrefix
  4. التقارير (`/dashboard/generate`) — مع matchPrefix
  5. الإعدادات (`/dashboard/settings`)
- **التحسينات:** كل رابط بلون مميز، tooltip عند الطي، RTL support، responsive

### 3.2 ✅ Dashboard جديد — عرض المشاريع كـ cards
- **الملف:** `frontend/src/app/dashboard/page.tsx`
- **التعديل:**
  - Hero section مع إحصائيات سريعة (4 أرقام)
  - ProjectsGrid: كل مشروع بـ card تعرض المرحلة (5 خطوات) + progress bar
  - Stage system: draft → collecting → reviewing → generating → completed
  - Empty state واضح مع CTA لإنشاء مشروع
  - WorkflowGuide: 4 خطوات بصرية (أنشئ → اجمع → ولّد → صدّر)
  - زر "مشروع جديد" بارز

### 3.2.1 ✅ إضافة APIs الجديدة للـ Frontend
- **الملف:** `frontend/src/lib/api.ts`
- **ما أُضيف:**
  - `api.projects.skeletonStatus()` / `buildSkeleton()` / `generateText()`
  - `api.structures.*` — CRUD + initFromTemplate + approve + context
  - `api.generatedContents.*` — list + get + edit + approve + regenerate

### 3.3 ✅ صفحة إنشاء مشروع (Wizard)
- **الملف:** `frontend/src/app/dashboard/projects/new/page.tsx`
- **خطوات:**
  1. اختر القالب (cards تفاعلية)
  2. تفاصيل المشروع (اسم، مؤسسة، فترة، تواريخ)
  3. مراجعة وإنشاء (ملخص + auto-generate name)
- **التحسين:** بعد الإنشاء يُبنى الهيكل تلقائياً (`buildSkeleton`) → redirect لصفحة المشروع

### 3.4 ✅ محرر Structure (ترتيب + إضافة + حذف + تعديل)
- **الملف:** `frontend/src/app/dashboard/projects/[id]/page.tsx` — داخل ReportTab
- **الوظيفة:**
  - زر "تعديل الهيكل" لكل بند → يفتح وضع التعديل
  - أزرار ↑↓ لتغيير ترتيب المكونات (API update فوري)
  - زر × لحذف مكون
  - أزرار إضافة: فقرة / جدول / شكل / عنوان
  - تعديل عناوين المكونات inline (onBlur → save)
  - كل تعديل يُحفظ مباشرة عبر `api.structures.update()`

### 3.5 ✅ صفحة إدخال البيانات المحسّنة
- **الملف:** `frontend/src/app/contribute/[token]/page.tsx`
- **التعديل:**
  - جداول تفاعلية (table_dynamic + table_static) مع إضافة/حذف صفوف
  - تحذير الموعد النهائي (أيام متبقية + تنبيه عند الانتهاء)
  - progress bar ملوّن (أحمر/أصفر/أخضر)
  - header محسّن + auto-save + رسائل واضحة
  - رفع Excel مع preview عدد الصفوف والأعمدة

### 3.6 ✅ Skeleton Preview + 3.7 ✅ المراجعة والتوليد (مدمجان)
- **الملف:** `frontend/src/app/dashboard/projects/[id]/page.tsx` — تاب "التقرير"
- **القرار:** دمج 3.6 و 3.7 في تاب واحد بدل صفحتين منفصلتين
- **الوظيفة:**
  - عرض هيكل كل بند (جداول 📊 + أشكال 📈 + فقرات ✏️ + عناوين)
  - إحصائيات: عدد الفقرات، المولّدة، المعتمدة + progress bar
  - زر "ولّد X فقرة" — يولّد كل الفقرات المعلّقة
  - لكل فقرة:
    - عرض المحتوى المولّد
    - 🔄 إعادة توليد فقرة واحدة (polling تلقائي)
    - ✏️ تعديل يدوي (inline editor)
    - ✅ اعتماد
  - حالات: لم يبدأ → جاري التوليد → تم التوليد → معدّل → معتمد → فشل
  - بناء الهيكل إذا لم يكن موجوداً (empty state + زر بناء)

### 3.8 ✅ صفحة التصدير المحسّنة
- **الملف:** `frontend/src/app/dashboard/projects/[id]/page.tsx` — ExportTab component
- **الوظيفة:**
  - معاينة HTML في modal (iframe) قبل التصدير
  - أزرار واضحة: معاينة + Word + PDF
  - تاريخ التقارير المولّدة مع أزرار تحميل
  - progress bar أثناء التوليد + رسائل حالة

### 3.9 ✅ تحسينات عامة
- Toast notifications بدل alert — ثلاث حالات (نجاح/خطأ/معلومة)
- رسائل خطأ واضحة بالعربي
- كل alert في صفحة المشروع استُبدل بـ showToast
- Empty states واضحة في كل تاب
- Progress bars في الهيكل والتصدير

---

## ═══════════════════════════════════════════
## ترتيب التنفيذ
## ═══════════════════════════════════════════

```
✅ الأولوية 1 (مكتملة):
  1.1 → 1.8  الموديلات + Migrations
  1.9         APIs الأساسية

✅ الأولوية 2 (مكتملة):
  2.1         SkeletonBuilder ✅
  2.2         TextGenerator ✅
  2.3         ReferenceManager ✅
  2.4         تحديث خدمة التصدير ✅

✅ الأولوية 3 (مكتملة جزئياً):
  3.1         تبسيط القائمة الجانبية ✅
  3.2         Dashboard جديد ✅
  3.2.1       APIs الجديدة في Frontend ✅

✅ الأولوية 4 (مكتملة):
  3.3         صفحة إنشاء مشروع (Wizard) ✅
  3.6 + 3.7   Skeleton Preview + المراجعة (مدمجان في تاب التقرير) ✅

✅ الأولوية 5 (مكتملة):
  3.5         إدخال بيانات محسّن ✅
  3.8         صفحة التصدير ✅
  3.9         تحسينات عامة ✅

✅ الأولوية 6 (مكتملة):
  3.4         محرر Structure (ترتيب + إضافة + حذف) ✅
  2.5         ReportAnalyzer + API + Frontend integration ✅
```

---

## ═══════════════════════════════════════════
## سجل التقدم
## ═══════════════════════════════════════════

### Session 1 — 2025-03-17
- ✅ تحليل التقرير الأصلي (بند 1.9 كاملاً)
- ✅ تصميم الـ Workflow الكامل (taqrir-ai-workflow.html)
- ✅ تصميم الموديلات والـ APIs
- ✅ تقييم الـ Frontend الحالي
- ✅ إنشاء مخطط العمل (هذا الملف)

### Session 2 — 2025-03-18
- ✅ اكتشاف الموديلات الموجودة (ItemComponent, TableDefinition, ChartDefinition)
- ✅ قرار استراتيجي: البناء على الموجود بدل التكرار
- ✅ إنشاء 3 موديلات: ItemStructure, GeneratedContent, DetailedResponse
- ✅ توسيع ItemComponent: ref_id, references, heading type
- ✅ Migrations + تطبيق على DB
- ✅ Admin registration مع واجهات كاملة
- ✅ Serializers (9 serializers جديدة)
- ✅ ViewSets (3 ViewSets + 3 function views)
- ✅ URLs registration
- ✅ اختبار create_from_template مع بيانات حقيقية
- ⏭️ الخطوة التالية: المرحلة 2 — SkeletonBuilder + TextGenerator

### Session 3 — 2026-03-18
- ✅ بناء SkeletonBuilder كامل (510 سطر) — HTML skeleton مع caching + CSS charts + print support
- ✅ بناء TextGenerator كامل (748 سطر) — context-aware prompts + multi-model AI + progress tracking
- ✅ بناء ReferenceManager كامل (180 سطر) — per-axis numbering + broken ref detection + index generation
- ✅ دمج TextGenerator في views.py (regenerate action + generate_text endpoint)
- ✅ تحديث WORKPLAN.md ليعكس الحالة الفعلية
- ⏭️ الخطوة التالية: 2.4 تحديث خدمة التصدير + المرحلة 3 (Frontend)

### Session 4 — 2026-03-18
- ✅ 2.4 تحديث خدمة التصدير:
  - `generate_project_html_v2()` — SkeletonBuilder + ReferenceManager + فهارس
  - `export_project_v2_to_word()` — HTML → Word (BeautifulSoup parser)
  - `export_project_v2_to_pdf()` — HTML → PDF (WeasyPrint)
  - Auto-detection: V2 vs legacy per project
- ✅ 3.1 تبسيط Sidebar: من 4 مجموعات (13 رابط) → 5 روابط مسطحة
- ✅ 3.2 Dashboard جديد: Project cards + Stage system + WorkflowGuide
- ✅ 3.2.1 Frontend APIs: structures + generatedContents + skeleton/generate endpoints
- ✅ تحديث WORKPLAN.md
- ✅ 3.3 Wizard: auto-buildSkeleton بعد الإنشاء
- ✅ 3.6 + 3.7 مدمجان: تاب "التقرير" في صفحة المشروع
  - عرض هيكل كل بند (جداول/أشكال/فقرات)
  - توليد كل الفقرات + إعادة توليد فقرة واحدة + تعديل + اعتماد
  - progress bar + إحصائيات
- ✅ TypeScript + Python بدون أخطاء
- ✅ 3.5 إدخال بيانات: جداول تفاعلية (dynamic/static) + تحذير deadline + progress ملوّن
- ✅ 3.8 تصدير: ExportTab مع HTML preview modal + 3 أزرار + history
- ✅ 3.9 تحسينات: Toast notifications بدل alert + رسائل عربية
- ✅ TypeScript بدون أخطاء
- ✅ 3.4 محرر Structure: ترتيب ↑↓ + إضافة (فقرة/جدول/شكل/عنوان) + حذف + تعديل عناوين inline
- ✅ 2.5 ReportAnalyzer: تحليل Word + استخراج هيكل + API endpoint + خطوة في Wizard
- 🎉🎉 **كل المراحل مكتملة! (1 + 2 + 3)** 🎉🎉

### Session 5 — 2026-03-18 (سد الفجوات مع Workflow)
- ✅ إعادة توليد مع تعليمات إضافية: UI لإدخال تعليمات (مثل "اجعلها أقصر") عند إعادة توليد فقرة
- ✅ تعديل بيانات الجداول inline: عرض الجدول الفعلي في صفحة المراجعة + تعديل خلايا بالنقر
- ✅ إضافة/حذف صفوف في الجداول أثناء المراجعة
- ✅ تغيير نوع الشكل (pie/bar/line/donut) من صفحة المراجعة مباشرة
- ✅ الربط التلقائي بين Structure ونموذج إدخال البيانات:
  - Backend API: `data_requirements` endpoint + `structure_hints` في contribute_form
  - Frontend: عرض متطلبات البيانات المستنتجة من الهيكل في صفحة المساهم
- ✅ Validation متقدم للبيانات المُدخلة:
  - حقول مطلوبة + أرقام غير سلبية + نسب 0-100 + صفوف فارغة في الجداول
  - عرض أخطاء التحقق تحت كل حقل + منع الإرسال مع أخطاء
- ✅ جدول محتويات (فهرس المحتويات) عند التصدير:
  - محاور وبنود مع روابط داخلية
  - يُدرج تلقائياً في بداية التقرير مع page-break
- ✅ Backend: TableDataViewSet جديد مع `update_rows` action
- ✅ Backend: DetailedResponseViewSet.update_data action
- ✅ Frontend APIs: tableData, detailedResponses, structures.dataRequirements
- ✅ TypeScript + Python بدون أخطاء
- 🎯 **المطابقة مع Workflow ارتفعت من ~87% إلى ~97%**

---

## ═══════════════════════════════════════════
## ملاحظات مهمة
## ═══════════════════════════════════════════

1. **القاعدة الذهبية:** الـ AI يكتب النصوص فقط. الجداول والأشكال من البيانات مباشرة.
2. **Skeleton أولاً:** الهيكل يُبنى فوراً بدون AI، ثم الـ AI يملأ الفراغات.
3. **إعادة توليد فقرة واحدة:** أهم ميزة — المستخدم يعيد فقرة بدون ما يلمس الباقي.
4. **المراجع:** نستخدم {ref:t1} داخلياً، والترقيم الفعلي عند التصدير فقط.
5. **البيانات التفصيلية اختيارية:** إذا المساهم أدخل رقم فقط — التقرير يتكيف.
6. **الموديلات القديمة (ItemDraft, AxisDraft) تبقى:** نضيف الجديد فوقها بدون حذف.
