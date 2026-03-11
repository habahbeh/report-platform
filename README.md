# 📊 منصة توليد التقارير

> منصة توليد التقارير المؤسسية بالذكاء الاصطناعي
> AI-Powered Arabic Report Generation Platform

## ✨ المميزات

- 🤖 **توليد المحتوى بالـ AI** - استخدم Gemini (مجاني) أو Claude
- 📝 **قوالب مرنة** - أنشئ وعدّل قوالب التقارير
- 📊 **رفع Excel** - استورد البيانات من ملفات Excel
- 📄 **تصدير Word/PDF** - صدّر التقارير بتنسيق RTL عربي
- 🎨 **واجهة عربية** - تصميم RTL كامل مع Tailwind CSS

## 🚀 التشغيل السريع

### المتطلبات
- Python 3.10+
- Node.js 18+

### التشغيل

```bash
# من مجلد المشروع
./start.sh
```

أو يدوياً:

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py setup_demo
python manage.py runserver

# Frontend (terminal جديد)
cd frontend
npm install
npm run dev
```

### الوصول

- 🌐 **الواجهة**: http://localhost:3000
- 🔧 **API**: http://localhost:8000/api
- 👤 **لوحة الإدارة**: http://localhost:8000/admin

### بيانات الدخول التجريبية
```
Username: demo
Password: demo1234
```

## 📁 هيكل المشروع

```
report-platform/
├── backend/                 # Django REST API
│   ├── apps/
│   │   ├── accounts/       # المستخدمين والمصادقة
│   │   ├── organizations/  # المؤسسات
│   │   ├── templates_app/  # قوالب التقارير
│   │   ├── reports/        # التقارير
│   │   ├── data_collection/# رفع وتحليل البيانات
│   │   ├── ai_engine/      # توليد المحتوى بالـ AI
│   │   └── export/         # تصدير Word/PDF
│   └── config/             # إعدادات Django
│
├── frontend/               # Next.js 14
│   └── src/
│       ├── app/           # صفحات App Router
│       ├── components/    # المكونات
│       └── lib/          # API client
│
└── docs/                  # التوثيق
```

## 🔑 إعدادات الـ AI

### Gemini (مجاني - افتراضي)
```bash
export GOOGLE_API_KEY=your-api-key
```

### Claude API (مدفوع)
```bash
export ANTHROPIC_API_KEY=your-api-key
```

### Claude CLI (مجاني مع Pro)
تأكد من تثبيت Claude CLI:
```bash
npm install -g @anthropic-ai/claude-code
```

## 📖 API Documentation

### المصادقة
```bash
# تسجيل الدخول
POST /api/accounts/login/
{
  "username": "demo",
  "password": "demo1234"
}

# Response
{
  "token": "...",
  "user": {...}
}
```

### التقارير
```bash
# قائمة التقارير
GET /api/reports/

# إنشاء تقرير
POST /api/reports/
{
  "title": "التقرير السنوي 2024",
  "template": 1,
  "period_start": "2023-09-01",
  "period_end": "2024-08-31"
}

# توليد محتوى التقرير
POST /api/reports/{id}/generate/
```

### توليد AI
```bash
# توليد مخصص
POST /api/ai/generate/
{
  "section_title": "البحث العلمي",
  "prompt": "اكتب قسم البحث العلمي...",
  "word_count": 500,
  "model": "gemini"  # أو "cli" أو "claude"
}

# توليد قسم البحث
POST /api/ai/generate/research/
{
  "publications_count": 150,
  "citations_count": 500,
  "h_index": 12,
  "model": "gemini"
}
```

## 🛠 Tech Stack

| الجزء | التقنية |
|-------|---------|
| Backend | Django 5.0 + DRF |
| Database | SQLite / PostgreSQL |
| Frontend | Next.js 14 + TailwindCSS |
| AI | Gemini / Claude |
| Documents | python-docx + WeasyPrint |

## 📝 الترخيص

MIT License

---

صنع بـ ❤️ للمؤسسات العربية
