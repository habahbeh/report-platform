# خطة تحسين الـ Frontend — الخطة الكاملة المدمجة
## آخر تحديث: 2026-03-18
## المرجع: رأي Claude (استراتيجي) + رأي OpenClaw (UX)

---

## الوضع الحالي

- **Frontend:** Next.js 16, TypeScript, Tailwind CSS, RTL
- **المشاكل الرئيسية:**
  1. God Page: `[id]/page.tsx` = 1698 سطر
  2. 30+ route مهجورة غير مربوطة بالـ sidebar
  3. غياب Guided Flow داخل صفحة المشروع
  4. Emojis بدل Lucide icons (غير professional)
  5. تاب "التقرير" محمّل بـ 4-5 مهام مختلفة
  6. لا يوجد "الخطوة التالية" واضحة

---

## المرحلة 1 — البنية (الأساس) 🏗️
### المدة: 3-4 أيام
### الحالة: ⏳ لم تبدأ

### 1.1 تنظيف Routes المهجورة
- **الملفات المستهدفة:** routes غير مربوطة بالـ sidebar
- **Routes تحتاج مراجعة (حذف أو redirect):**
  ```
  /dashboard/generate
  /dashboard/ai
  /dashboard/content/manual
  /dashboard/drafts
  /dashboard/reports/new
  /dashboard/import
  /dashboard/review/data
  /dashboard/review/content
  /dashboard/reports (إذا مكررة)
  ```
- **الإجراء:** لكل route — إما احذفها إذا لا تُستخدم، أو اربطها بالـ sidebar

### 1.2 تقسيم God Page
- **الملف:** `frontend/src/app/dashboard/projects/[id]/page.tsx` (1698 سطر)
- **الهدف:** تقسيمه لـ 5 components منفصلة في مجلد:
  ```
  frontend/src/app/dashboard/projects/[id]/
  ├── page.tsx              ← يبقى (orchestrator فقط ~100 سطر)
  ├── components/
  │   ├── OverviewTab.tsx
  │   ├── ContributorsTab.tsx
  │   ├── DataTab.tsx
  │   ├── ReportTab.tsx
  │   └── ExportTab.tsx
  ```
- **المنطق:** page.tsx يحمل فقط: state، tabs navigation، data fetching
- **كل Tab component:** يحمل UI وlogic الخاص به فقط

### 1.3 إعادة هيكلة Navigation (Sidebar)
- **الملف:** `frontend/src/components/layout/Sidebar.tsx`
- **الحالي (5 روابط):**
  ```
  الرئيسية / المشاريع / البيانات / التقارير / الإعدادات
  ```
- **المقترح (5 روابط محسّنة):**
  ```
  ├── الرئيسية       → /dashboard
  ├── المشاريع       → /dashboard/projects
  ├── البيانات       → /dashboard/data
  ├── القوالب        → /dashboard/templates  ← كانت مخفية
  └── الإعدادات      → /dashboard/settings
  ```
- **ملاحظة:** "التقارير" تُدمج داخل صفحة المشروع (تاب التصدير) وتُحذف من الـ sidebar

---

## المرحلة 2 — الـ Flow 🧭
### المدة: 4-5 أيام
### الحالة: ⏳ لم تبدأ

### 2.1 Progress Stepper في صفحة المشروع
- **الملف:** `frontend/src/app/dashboard/projects/[id]/components/OverviewTab.tsx`
- **المكان:** أعلى الصفحة — دائماً مرئي
- **التصميم:**
  ```
  ┌──────────────────────────────────────────────────────────┐
  │  1.إعداد ✅ → 2.دعوة المساهمين ● → 3.جمع البيانات ○ → 4.توليد ○ → 5.تصدير ○  │
  │                        ↓                                  │
  │         [ الخطوة التالية: أرسل دعوات للجهات ]            │
  └──────────────────────────────────────────────────────────┘
  ```
- **الحالات:**
  - `draft` → المرحلة 1 نشطة → زر "أرسل الدعوات"
  - `collecting` → المرحلة 2 نشطة → زر "راجع البيانات"
  - `reviewing` → المرحلة 3 نشطة → زر "ابنِ الهيكل وولّد"
  - `generating` → المرحلة 4 نشطة → زر "راجع النصوص"
  - `published` → المرحلة 5 نشطة → زر "صدّر التقرير"

### 2.2 تقسيم تاب "التقرير"
- **الملف:** `frontend/src/app/dashboard/projects/[id]/components/ReportTab.tsx`
- **قبل:** تاب واحد يحتوي كل شيء
- **بعد:** تقسيم لـ sub-tabs:
  ```
  [ الهيكل ] [ التوليد والمراجعة ]
  ```
  - **الهيكل:** Structure Editor (ترتيب + إضافة + حذف مكونات)
  - **التوليد والمراجعة:** AI Generation + تعديل + اعتماد + إعادة توليد

### 2.3 Contextual "الخطوة التالية"
- **في كل Tab:** بطاقة صغيرة في الأسفل تقول "الخطوة التالية: ..."
- **مثال في تاب البيانات:**
  ```
  ✅ تم جمع 8/10 جهات — الخطوة التالية: ولّد التقرير ←
  ```

---

## المرحلة 3 — البولش 🎨
### المدة: 3 أيام
### الحالة: ⏳ لم تبدأ

### 3.1 استبدال Emojis بـ Lucide Icons
- **المشكلة:** استخدام 🤖 📧 🔔 📥 في منصة مؤسسية = unprofessional
- **الملفات المتأثرة:**
  ```
  frontend/src/app/dashboard/projects/[id]/page.tsx
  frontend/src/app/dashboard/projects/page.tsx
  frontend/src/app/dashboard/page.tsx
  ```
- **جدول الاستبدال:**
  ```
  🤖  →  <Bot />
  📧  →  <Mail />
  🔔  →  <Bell />
  📥  →  <Download />
  📊  →  <BarChart2 />
  👥  →  <Users />
  ✏️  →  <Pencil />
  🔄  →  <RefreshCw />
  ✅  →  <CheckCircle />
  🔗  →  <Link />
  ↗   →  <ExternalLink />
  ```

### 3.2 تحسين Information Density
- **المشكلة:** Overview tab يعرض معلومات كثيرة دفعة واحدة
- **الحل:** إخفاء التفاصيل الثانوية في "عرض المزيد" collapsible
- **الأولوية:** عرض فقط: اسم المشروع، المرحلة، الـ Stepper، الخطوة التالية

### 3.3 Contextual Tooltips
- **الأماكن:** بجانب أزرار غير واضحة
- **مثال:** زر "بناء الهيكل" → tooltip "ينشئ هيكل التقرير تلقائياً من القالب"
- **التنفيذ:** استخدام `Tooltip` من shadcn/ui (موجود مسبقاً)

### 3.4 توحيد نظام الألوان
- **المشكلة:** كل section بلون مختلف (visual noise)
- **الحل:** تقليل الألوان الأساسية لـ 3 فقط:
  ```
  Blue (primary)    → actions, navigation
  Emerald (success) → completed, approved
  Amber (warning)   → pending, attention needed
  ```

---

## المرحلة 4 — الـ Onboarding 🚀
### المدة: 2 أيام
### الحالة: ⏳ لم تبدأ

### 4.1 Smart Empty States
- **المبدأ:** بدل tour منفصل → empty states ذكية تُرشد
- **مثال — مشروع جديد بدون مساهمين:**
  ```
  ┌─────────────────────────────────┐
  │  👥 لا يوجد مساهمون بعد        │
  │  الخطوة الأولى: أضف الجهات     │
  │  وأرسل روابط الإدخال           │
  │  [ + إضافة مساهمين ]           │
  └─────────────────────────────────┘
  ```
- **مثال — تاب التقرير بدون هيكل:**
  ```
  ┌───────────────────���─────────────┐
  │  📋 الهيكل لم يُبنَ بعد        │
  │  النظام سيبني هيكل التقرير      │
  │  تلقائياً من القالب في ثوانٍ   │
  │  [ 🏗️ ابنِ الهيكل الآن ]      │
  └─────────────────────────────────┘
  ```

### 4.2 First-Time Banner
- **يظهر:** فقط للمستخدم الجديد (localStorage flag)
- **المحتوى:** شريط في أعلى الداشبورد يقول:
  ```
  مرحباً! 👋 ابدأ بـ: إنشاء مشروع → دعوة المساهمين → توليد التقرير
  ```
- **يختفي:** بعد أول مشروع يُنشأ

---

## الجدول الزمني الكامل

| المرحلة | المهام | المدة | الأولوية |
|---------|--------|-------|----------|
| 1 — البنية | تنظيف routes + تقسيم God Page + Sidebar | 3-4 أيام | 🔴 أولاً |
| 2 — الـ Flow | Stepper + تقسيم تاب + Contextual guide | 4-5 أيام | 🔴 ثانياً |
| 3 — البولش | Icons + Colors + Tooltips + Density | 3 أيام | 🟡 ثالثاً |
| 4 — Onboarding | Empty states + First-time banner | 2 أيام | 🟢 رابعاً |
| **المجموع** | | **~2 أسبوع** | |

---

## قواعد التنفيذ

1. **ابدأ بالبنية** — لا تضيف UX على كود غير منظم
2. **test بعد كل مرحلة** — end-to-end على project جامعة البترا (`f2bd81fc-5af5-495e-bd48-0d95fdc673bb`)
3. **لا تغير الـ Backend** — كل هذه التغييرات Frontend فقط
4. **TypeScript strict** — لا أخطاء قبل الانتقال للمرحلة التالية
5. **RTL أولاً** — كل تغيير يُختبر بالعربي أولاً

---

## ملاحظات استراتيجية

- **المرجع الأساسي للـ Workflow:** `habahbeh/taqrir-ai-workflow.html`
- **الـ Backend جاهز 100%** — كل التحسينات هنا Frontend فقط
- **Project ID للتجربة:** `f2bd81fc-5af5-495e-bd48-0d95fdc673bb` (جامعة البترا)
- **بعد المرحلة 2:** اختبر مع مستخدم حقيقي قبل المتابعة

---

## سجل التقدم

### 2026-03-18 — التخطيط
- ✅ تحليل الـ Frontend الحالي
- ✅ مقارنة رأي Claude + رأي OpenClaw
- ✅ إنشاء هذه الخطة
- ⏳ المرحلة 1: لم تبدأ
