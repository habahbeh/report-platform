# REALITY.md — الحقيقة من الكود
> مولّد تلقائياً بتاريخ: 2026-04-11
> المصدر: فحص مباشر للكود + Django introspection
> القاعدة: ما مكتوب هنا = موجود فعلاً بالكود. لا أكثر ولا أقل.

---

## 1. البنية المعمارية

```
report-platform/
├── backend/          Django 5.0 + DRF — Port 8002
│   ├── apps/
│   │   ├── accounts/       ← User model + auth
│   │   ├── organizations/  ← Organization + Members
│   │   ├── templates_app/  ← Template → Axis → Item → Components
│   │   ├── reports/        ← Project → Contributors → Data → AI → Export
│   │   ├── export/         ← SkeletonBuilder + services + views
│   │   ├── ai_engine/      ← services.py فقط (generate_with_cli/gemini/claude)
│   │   └── data_collection/ ← فارغ (stub)
│   └── config/settings.py   ← SQLite, Arabic, Asia/Amman
│
├── frontend/         Next.js 16 + React 19 + TailwindCSS — Port 3000
│   └── src/app/      17 صفحة، 4 روابط بالـ sidebar
│
├── data/             بيانات مستخرجة (47 بند، 1,885 صف)
├── scripts/          18 سكربت معالجة
└── habahbeh/         التوثيق والمراجع
```

---

## 2. الـ Models (18 model من 5 تطبيقات)

### accounts
| Model | PK | حقول رئيسية |
|-------|----|-------------|
| **User** | int | username, email, name_ar, language(ar), avatar, phone, notifications_enabled |

### organizations
| Model | PK | حقول رئيسية |
|-------|----|-------------|
| **Organization** | int | name, name_en, logo, settings |
| **OrganizationMember** | int | organization(FK), user(FK), role(admin/editor/viewer/contributor) |

### templates_app (7 models)
| Model | PK | حقول رئيسية | العلاقات |
|-------|----|-------------|----------|
| **Template** | int | name, category, is_public, version | → axes, entities, tables, charts |
| **Axis** | int | code, name, order, ai_prompt | → template(FK), items |
| **Item** | int | code, name, field_type(16 نوع), aggregation(8 أنواع), config | → axis(FK), entities(M2M) |
| **Entity** | int | name, priority, is_college | → template(FK), items(M2M) |
| **ItemComponent** | int | ref_id, component_type(7 أنواع), source, table_ref, chart_ref, references | → item(FK) |
| **TableDefinition** | int | code, name, table_type(4 أنواع), columns, fixed_rows | → template(FK), axis(FK) |
| **ChartDefinition** | int | code, name, chart_type(6 أنواع), data_source, config | → template(FK), axis(FK) |
| **TemplateSection** | int | title, section_type | → template(FK) — **Legacy** |

### reports (7 models)
| Model | PK | حقول رئيسية | العلاقات |
|-------|----|-------------|----------|
| **Project** | UUID | name, status(6 حالات), period, deadline, settings | → template(FK), organization(FK) |
| **Contributor** | UUID | name, email, invite_token(unique), status(6 حالات), reminder_count | → project(FK), entity(FK) |
| **Response** | UUID | value(JSON), admin_value, is_valid, validation_errors | → project(FK), contributor(FK), item(FK) |
| **TableData** | UUID | rows(JSON), source_file, is_valid | → project(FK), contributor(FK), table_definition(FK) |
| **ItemStructure** | UUID | components(JSON), source(4 أنواع), style_sample, is_approved | → project(FK), item(FK) |
| **GeneratedContent** | UUID | content, manual_edit, status(6 حالات), version, ai_model, ai_cost, prompt_used | → item_structure(FK), project(FK) |
| **GeneratedReport** | UUID | format(4 أنواع), status(4 حالات), progress(0-100), file, file_size | → project(FK) |

### Unique Constraints الفعلية:
- `Contributor`: [project, entity]
- `Response`: [project, contributor, item]
- `TableData`: [project, contributor, table_definition]
- `ItemStructure`: [project, item]
- `GeneratedContent`: [item_structure, component_id]

---

## 3. الـ API Endpoints (120+ endpoint)

### Authentication (`/api/accounts/`)
| Method | URL | Auth | الوظيفة |
|--------|-----|------|---------|
| POST | `/accounts/register/` | Public | تسجيل مستخدم جديد |
| POST | `/accounts/login/` | Public | تسجيل دخول → Token |
| POST | `/accounts/logout/` | Token | تسجيل خروج |
| GET | `/accounts/me/` | Token | بيانات المستخدم الحالي |
| PATCH | `/accounts/profile/` | Token | تعديل الملف الشخصي |
| POST | `/accounts/change-password/` | Token | تغيير كلمة المرور |

### Templates (`/api/templates/`)
| Resource | CRUD | Custom Actions |
|----------|------|----------------|
| templates/ | كامل | duplicate, axes, items, entities, tables, charts, full |
| axes/ | كامل | items |
| items/ | كامل | — |
| entities/ | كامل | items |
| table-definitions/ | كامل | — |
| chart-definitions/ | كامل | — |
| item-components/ | كامل | reorder, bulk_create |
| sections/ | كامل | — (Legacy) |

### Reports & Projects (`/api/reports/`)
| Resource | CRUD | Custom Actions |
|----------|------|----------------|
| projects/ | كامل | stats, contributors, add_contributor, invite, remind, generate, reports |
| contributors/ | كامل | approve, reject |
| responses/ | كامل | — |
| structures/ | كامل | init_from_template, approve, context, data_requirements |
| generated-contents/ | كامل | edit, approve, regenerate |
| table-data/ | كامل | update_rows |

### Skeleton & AI (`/api/reports/`)
| Method | URL | الوظيفة |
|--------|-----|---------|
| POST | `/build-skeleton/` | بناء هيكل المشروع |
| POST | `/generate-text/` | توليد نصوص AI |
| GET | `/projects/{id}/skeleton-status/` | حالة الهيكل |
| POST | `/analyze-report/` | تحليل تقرير Word سابق |

### Public Contribute (`/api/reports/contribute/`)
| Method | URL | الوظيفة |
|--------|-----|---------|
| GET | `/contribute/{token}/` | تحميل نموذج الإدخال |
| POST | `/contribute/{token}/save/` | حفظ مؤقت |
| POST | `/contribute/{token}/submit/` | إرسال نهائي |
| POST | `/contribute/{token}/upload/` | رفع ملف |
| GET | `/contribute/{token}/excel-template/{item_id}/` | تحميل قالب Excel |

### Export (`/api/export/`)
| Method | URL | الوظيفة |
|--------|-----|---------|
| GET | `/items/` | قائمة البنود الجاهزة |
| POST | `/generate/` | توليد تقرير بند واحد |
| POST | `/generate-full/` | توليد تقرير كامل |
| GET | `/download/{project_id}/{filename}/` | تحميل ملف مولّد |

### ملاحظة أمنية:
> كل الـ endpoints حالياً `AllowAny` (وضع تطوير/demo).
> الاستثناء: `/accounts/me/`, `/accounts/profile/`, `/accounts/change-password/` تتطلب Token.

---

## 4. الـ Frontend (17 صفحة)

### Navigation الفعلي (Sidebar — 4 روابط):
```
الرئيسية     → /dashboard
المشاريع     → /dashboard/projects (prefix match)
القوالب      → /dashboard/templates (prefix match)
الإعدادات    → /dashboard/settings
```

### كل الصفحات الموجودة:
| الصفحة | مربوطة؟ | الوظيفة |
|--------|---------|---------|
| `/` | — | Redirect → dashboard أو login |
| `/login` | — | تسجيل دخول + تسجيل جديد |
| `/dashboard` | Sidebar | إحصائيات + قائمة مشاريع |
| `/dashboard/projects` | Sidebar | قائمة كل المشاريع |
| `/dashboard/projects/new` | من dashboard | إنشاء مشروع (wizard 3 خطوات) |
| `/dashboard/projects/[id]` | من القائمة | **صفحة المشروع الرئيسية** (5 تبويبات) |
| `/dashboard/templates` | Sidebar | قائمة القوالب |
| `/dashboard/templates/[id]` | من القائمة | تفاصيل القالب |
| `/dashboard/templates/[id]/axes` | من التفاصيل | إدارة المحاور |
| `/dashboard/templates/[id]/axes/new` | من المحاور | إنشاء محور |
| `/dashboard/templates/[id]/axes/[axisId]` | من المحاور | تعديل محور |
| `/dashboard/templates/entities` | غير مباشر | إدارة الجهات |
| `/dashboard/templates/structure` | غير مباشر | عرض هيكل القالب |
| `/dashboard/templates/items/[id]/components` | من الهيكل | مكونات البند |
| `/dashboard/settings` | Sidebar | الإعدادات (5 أقسام) |
| `/dashboard/generate` | **غير مربوط** | صفحة توليد قديمة |
| `/contribute/[token]` | رابط عام | نموذج إدخال بيانات (بدون login) |
| `/not-found` | تلقائي | صفحة 404 |

### صفحة المشروع — 5 تبويبات:
```
1. نظرة عامة (OverviewTab)     ← معلومات + Stepper + الخطوة التالية
2. المساهمون (ContributorsTab)  ← إدارة + دعوة + تذكير
3. الهيكل (SkeletonTab)         ← بناء/عرض HTML skeleton
4. التوليد (GenerateTab)        ← توليد AI + تعديل + اعتماد
5. التصدير (ExportTab)          ← معاينة + تحميل Word/PDF/HTML
```

### API Client — الدوال الموجودة فعلاً (44 دالة):
- auth: 6 دوال (login, register, me, updateProfile, changePassword, logout)
- organizations: 1 (list)
- templates: 6 (list, get, create, delete, duplicate, getFull)
- axes: 6 (list, get, create, update, delete, items)
- items: 1 (list)
- entities: 1 (list)
- projects: 10 (list, get, create, update, stats, contributors, addContributor, invite, remind, generate, reports)
- skeleton: 4 (analyzeReport, skeletonStatus, buildSkeleton, generateText)
- structures: 2 (list, update)
- generatedContents: 4 (list, edit, approve, regenerate)
- tableData: 2 (list, updateRows)
- contribute: 5 (getForm, save, submit, upload, excelTemplateUrl)

---

## 5. الـ Workflow الفعلي (من الكود)

```
┌─────────────────────────────────────────────────────────┐
│                    Skeleton-First Workflow                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. إنشاء مشروع من قالب                                  │
│     POST /api/reports/projects/                          │
│     ↓ auto: POST /api/reports/build-skeleton/            │
│                                                          │
│  2. بناء الهيكل (ItemStructure لكل Item)                  │
│     GET /api/reports/projects/{id}/skeleton-status/      │
│                                                          │
│  3. دعوة المساهمين                                       │
│     POST /api/reports/projects/{id}/add_contributor/     │
│     POST /api/reports/projects/{id}/invite/              │
│                                                          │
│  4. جمع البيانات                                         │
│     GET  /api/reports/contribute/{token}/                │
│     POST /api/reports/contribute/{token}/save/           │
│     POST /api/reports/contribute/{token}/submit/         │
│                                                          │
│  5. توليد النصوص بالـ AI                                  │
│     POST /api/reports/generate-text/                     │
│     POST /api/reports/generated-contents/{id}/regenerate/│
│     POST /api/reports/generated-contents/{id}/edit/      │
│     POST /api/reports/generated-contents/{id}/approve/   │
│                                                          │
│  6. تصدير التقرير النهائي                                │
│     POST /api/reports/projects/{id}/generate/            │
│     GET  /api/export/download/{project_id}/{filename}/   │
│                                                          │
│  Project Status Flow:                                    │
│  draft → collecting → reviewing → generating → published │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 6. الخدمات الخلفية الفعلية

| الخدمة | الملف | الأسطر | الوظيفة |
|--------|-------|--------|---------|
| **SkeletonBuilder** | export/skeleton_builder.py | ~510 | يبني HTML من ItemStructure + بيانات |
| **TextGenerator** | reports/text_generator.py | ~748 | يولّد نصوص AI سياقية لكل فقرة |
| **AI Services** | ai_engine/services.py | ~423 | 3 محركات: CLI, Gemini, Claude API |
| **Export Services** | export/services.py | ~1200 | HTML/Word/PDF generation (v1 + v2) |
| **Report Analyzer** | reports/report_analyzer.py | ~300 | تحليل ملف Word واستخراج الهيكل |
| **Item Generator** | export/item_generator.py | — | توليد تقرير بند واحد |
| **Full Report Gen** | export/full_report_generator.py | — | توليد تقرير كامل |

---

## 7. ايش موجود بالملفات بس مش بالكود (الفجوات)

| المكتوب بالتوثيق | الواقع |
|-------------------|--------|
| Sidebar فيه 5 روابط (WORKPLAN.md) | **4 روابط فقط** (رئيسية، مشاريع، قوالب، إعدادات) |
| Sidebar فيه "البيانات" و"التقارير" | **غير موجودين** — اتحذفوا |
| `ReferenceManager` كخدمة منفصلة (WORKPLAN.md) | **الملف غير موجود** — `export/reference_manager.py` لم يُعثر عليه |
| `DetailedResponseViewSet` (WORKPLAN.md Session 5) | **غير موجود بالـ URLs** — لا يوجد endpoint مسجل |
| تذكيرات تلقائية (DATA_COLLECTION_SYSTEM.md) | **غير موجود** — لا Celery tasks فعّالة |
| مراجعة بالمراحل (DATA_COLLECTION_SYSTEM.md) | **جزئي** — approve/reject موجود لكن بدون workflow كامل |
| `/dashboard/generate` كصفحة نشطة | **صفحة يتيمة** — غير مربوطة بالتنقل |

---

## 8. ايش بالكود بس مش بالملفات (غير موثّق)

| الموجود بالكود | غير مذكور بالتوثيق |
|-----------------|-------------------|
| `TemplateSection` model (legacy) | لا يُذكر أنه deprecated |
| `UserViewSet` مع activate/deactivate | غير موثّق |
| `item-components/reorder` + `bulk_create` actions | غير موثّق |
| `contribute_excel_template` endpoint | موثّق بـ WORKPLAN فقط |
| `export/full_report_generator.py` | غير موثّق كملف منفصل |
| `export/item_generator.py` | غير موثّق كملف منفصل |
| `export/report_generator.py` | غير موثّق كملف منفصل |
| 18 سكربت بمجلد `scripts/` | غير موثّقة |

---

*هذا الملف مولّد من فحص مباشر للكود بتاريخ 2026-04-11. أي تعديل على الكود بعد هذا التاريخ قد يجعل بعض المعلومات قديمة.*
