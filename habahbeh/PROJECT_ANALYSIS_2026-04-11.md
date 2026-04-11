# تحليل شامل لمشروع تقرير.ai + خطة تنظيم
> تاريخ التحليل: 2026-04-11

## Context — لماذا هذا التحليل؟

المشروع مر بعملية إعادة هيكلة ضخمة (104 ملف متغير). هذا الملف يوثق التحليل الكامل للوضع الحالي.

---

## 1. البنية المعمارية الحالية (بعد إعادة الهيكلة)

**Backend — 4 تطبيقات فعّالة:**

| التطبيق | الدور | الحالة |
|---------|-------|--------|
| `accounts` | إدارة المستخدمين والمصادقة | مستقر |
| `organizations` | إدارة المؤسسات | مستقر |
| `templates_app` | تعريف القوالب (Template → Axis → Item → Entity) | مستقر |
| `reports` | **المحور الرئيسي** — المشاريع، المساهمون، البيانات، الهيكل، التوليد، التصدير | فعّال |

**تطبيقات مساعدة:**
- `export` — خدمات التصدير (skeleton_builder, full_report_generator, item_generator)
- `ai_engine` — فقط `services.py` فعّال (generate_with_gemini, generate_with_cli, generate_with_claude)
- `data_collection` — فارغ (وظائفه انتقلت لـ reports)

**Frontend — Next.js 16 + React 19:**
- 19 صفحة، 5 أساسية: dashboard, projects/[id], templates/[id], contribute/[token], settings
- صفحة المشروع: 5 تبويبات (Overview, Contributors, Skeleton, Generate, Export)
- 8 component files مقسمة بشكل نظيف
- دعم عربي RTL كامل + ثنائي اللغة

### الـ Models الأساسية

```
Template → Axis → Item → ItemComponent
                    ↓ → Entity
                    ↓ → TableDefinition
                    ↓ → ChartDefinition

Project → Contributor → Response
                      → TableData
       → ItemStructure → GeneratedContent
       → GeneratedReport
```

### الـ Workflow (skeleton-first)

```
1. إنشاء مشروع من قالب
2. بناء الهيكل (ItemStructure لكل Item)
3. دعوة المساهمين (Contributor بـ token)
4. جمع البيانات (Response + TableData)
5. توليد النصوص بالذكاء الاصطناعي (GeneratedContent)
6. مراجعة وتعديل
7. تصدير (Word/PDF/HTML)
```

---

## 2. نتائج الفحص التقني

- **Django check:** 0 issues
- **makemigrations --dry-run:** No changes detected (متطابق)
- **showmigrations:** كل الـ migrations مطبّقة [X]
- **INSTALLED_APPS:** فقط 5 تطبيقات (accounts, organizations, templates_app, reports, export)

---

## 3. ملاحظات فنية

- `ai_engine/services.py` لا يزال مستخدماً من `text_generator.py`
- `data_collection/` فارغ تماماً — imports محمية بـ try/except
- `export/services.py` فيه import قديم لكن محمي بـ try/except
- `/dashboard/generate` صفحة قديمة غير مربوطة بالتنقل
