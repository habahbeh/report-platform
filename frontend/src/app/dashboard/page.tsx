'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

// ==========================================
// Types
// ==========================================
interface Template {
  id: number;
  name: string;
  items_count: number;
  entities_count: number;
  axes_count: number;
}

interface Stats {
  total_projects: number;
  collecting: number;
  reviewing: number;
  generating: number;
  completed: number;
  templates: number;
}

// ==========================================
// Color Classes (Tailwind can't purge dynamic classes)
// ==========================================
const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    hoverBorder: 'hover:border-blue-400',
    badge: 'bg-blue-600',
    text: 'text-blue-800',
    iconBg: 'bg-blue-100',
    borderRight: 'border-r-blue-500',
    bgHover: 'hover:bg-blue-100',
  },
  indigo: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    hoverBorder: 'hover:border-indigo-400',
    badge: 'bg-indigo-600',
    text: 'text-indigo-800',
    iconBg: 'bg-indigo-100',
    borderRight: 'border-r-indigo-500',
    bgHover: 'hover:bg-indigo-100',
  },
  yellow: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    hoverBorder: 'hover:border-yellow-400',
    badge: 'bg-yellow-600',
    text: 'text-yellow-800',
    iconBg: 'bg-yellow-100',
    borderRight: 'border-r-yellow-500',
    bgHover: 'hover:bg-yellow-100',
  },
  orange: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    hoverBorder: 'hover:border-orange-400',
    badge: 'bg-orange-600',
    text: 'text-orange-800',
    iconBg: 'bg-orange-100',
    borderRight: 'border-r-orange-500',
    bgHover: 'hover:bg-orange-100',
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    hoverBorder: 'hover:border-purple-400',
    badge: 'bg-purple-600',
    text: 'text-purple-800',
    iconBg: 'bg-purple-100',
    borderRight: 'border-r-purple-500',
    bgHover: 'hover:bg-purple-100',
  },
  green: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    hoverBorder: 'hover:border-green-400',
    badge: 'bg-green-600',
    text: 'text-green-800',
    iconBg: 'bg-green-100',
    borderRight: 'border-r-green-500',
    bgHover: 'hover:bg-green-100',
  },
};

type ColorKey = keyof typeof colorClasses;

// ==========================================
// Workflow Steps Component
// ==========================================
function WorkflowSteps() {
  const steps: {
    number: number;
    title: string;
    description: string;
    icon: string;
    color: ColorKey;
    href: string;
    actions: string[];
  }[] = [
    {
      number: 1,
      title: 'إعداد القالب',
      description: 'تعريف المحاور والبنود والجهات',
      icon: '📋',
      color: 'blue',
      href: '/dashboard/templates',
      actions: ['إنشاء قالب جديد', 'تعديل قالب موجود', 'استيراد قالب'],
    },
    {
      number: 2,
      title: 'فترة الجمع',
      description: 'إنشاء فترة جمع بيانات جديدة',
      icon: '📅',
      color: 'indigo',
      href: '/dashboard/data/periods',
      actions: ['فترة جديدة', 'إرسال دعوات'],
    },
    {
      number: 3,
      title: 'جمع البيانات',
      description: 'الجهات ترفع ملفاتها',
      icon: '📥',
      color: 'yellow',
      href: '/dashboard/data/submissions',
      actions: ['تتبع التسليمات', 'إرسال تذكير'],
    },
    {
      number: 4,
      title: 'المراجعة',
      description: 'مراجعة واعتماد الملفات',
      icon: '👁️',
      color: 'orange',
      href: '/dashboard/review/data',
      actions: ['مراجعة البيانات', 'طلب تعديلات'],
    },
    {
      number: 5,
      title: 'توليد المحتوى',
      description: 'AI يكتب النصوص',
      icon: '🤖',
      color: 'purple',
      href: '/dashboard/generate',
      actions: ['توليد تلقائي', 'تعديل المسودات'],
    },
    {
      number: 6,
      title: 'التصدير',
      description: 'تصدير التقرير النهائي',
      icon: '📄',
      color: 'green',
      href: '/dashboard/export',
      actions: ['HTML', 'Word'],
    },
  ];

  return (
    <div className="card">
      <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
        <span>🗺️</span>
        <span>خطوات إنشاء التقرير</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {steps.map((step, index) => {
          const colors = colorClasses[step.color];
          return (
            <Link
              key={step.number}
              href={step.href}
              className="group relative"
            >
              <div className={`
                p-4 rounded-2xl border-2 transition-all duration-300
                hover:shadow-lg hover:scale-[1.02]
                ${colors.bg} ${colors.border} ${colors.hoverBorder}
              `}>
                {/* Step Number Badge */}
                <div className={`
                  absolute -top-3 -right-3 w-8 h-8 rounded-full
                  ${colors.badge} text-white
                  flex items-center justify-center text-sm font-bold
                  shadow-lg
                `}>
                  {step.number}
                </div>

                {/* Icon */}
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">
                  {step.icon}
                </div>

                {/* Title */}
                <h3 className={`font-bold ${colors.text} mb-1`}>
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-600 mb-3">
                  {step.description}
                </p>

                {/* Actions */}
                <div className="space-y-1">
                  {step.actions.slice(0, 2).map((action, i) => (
                    <div
                      key={i}
                      className="text-xs text-gray-500 flex items-center gap-1"
                    >
                      <span className="text-gray-300">•</span>
                      {action}
                    </div>
                  ))}
                </div>

                {/* Arrow */}
                {index < steps.length - 1 && (
                  <div className="hidden xl:block absolute top-1/2 -left-3 text-gray-300 text-2xl">
                    ←
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// Stats Cards Component
// ==========================================
function StatsCards({ stats }: { stats: Stats }) {
  const cards: {
    label: string;
    value: number;
    icon: string;
    color: ColorKey;
    href: string;
  }[] = [
    {
      label: 'القوالب',
      value: stats.templates,
      icon: '📋',
      color: 'blue',
      href: '/dashboard/templates',
    },
    {
      label: 'فترات الجمع',
      value: stats.collecting,
      icon: '📅',
      color: 'indigo',
      href: '/dashboard/data/periods',
    },
    {
      label: 'ملفات للمراجعة',
      value: stats.reviewing,
      icon: '👁️',
      color: 'orange',
      href: '/dashboard/review/data',
    },
    {
      label: 'مسودات',
      value: stats.generating,
      icon: '📝',
      color: 'purple',
      href: '/dashboard/drafts',
    },
    {
      label: 'تقارير جاهزة',
      value: stats.completed,
      icon: '✅',
      color: 'green',
      href: '/dashboard/export',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => {
        const colors = colorClasses[card.color];
        return (
          <Link
            key={card.label}
            href={card.href}
            className={`
              card hover:shadow-lg transition-all duration-300 hover:scale-[1.02]
              border-r-4 ${colors.borderRight}
            `}
          >
            <div className="flex items-center gap-3">
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center text-2xl
                ${colors.iconBg}
              `}>
                {card.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="text-sm text-gray-500">{card.label}</p>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ==========================================
// Active Periods Component
// ==========================================
interface Period {
  id: number;
  name: string;
  academic_year: string;
  status: string;
  template_name: string;
  progress: number;
  submissions_count: number;
  entities_count: number;
  start_date: string;
  end_date: string;
}

function ActivePeriods({ periods }: { periods: Period[] }) {
  const periodStatusColors: Record<string, string> = {
    open: 'bg-green-50 text-green-700 border-green-200',
    closed: 'bg-gray-50 text-gray-700 border-gray-200',
    draft: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  };

  const periodStatusLabels: Record<string, string> = {
    open: 'مفتوحة',
    closed: 'مغلقة',
    draft: 'مسودة',
  };

  const periodStatusIcons: Record<string, string> = {
    open: '🟢',
    closed: '⚫',
    draft: '🟡',
  };

  if (periods.length === 0) {
    return (
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>📅</span>
          <span>فترات الجمع النشطة</span>
        </h2>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            لا توجد فترات جمع بعد
          </h3>
          <p className="text-gray-500 mb-6">
            ابدأ بإنشاء فترة جمع جديدة لجمع البيانات من الجهات
          </p>
          <Link
            href="/dashboard/data/periods"
            className="btn btn-primary inline-flex items-center gap-2"
          >
            <span>➕</span>
            <span>إنشاء فترة جمع</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>📅</span>
          <span>فترات الجمع النشطة</span>
        </h2>
        <Link
          href="/dashboard/data/periods"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          عرض الكل ←
        </Link>
      </div>

      <div className="space-y-4">
        {periods.map((period) => (
          <Link
            key={period.id}
            href={`/dashboard/data/periods/${period.id}`}
            className="block p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-900 mb-1">{period.name}</h3>
                <p className="text-sm text-gray-500">{period.academic_year}</p>
              </div>
              <span className={`
                px-3 py-1 rounded-full text-sm font-medium border
                ${periodStatusColors[period.status] || periodStatusColors.draft}
                flex items-center gap-1
              `}>
                <span>{periodStatusIcons[period.status] || '🟡'}</span>
                <span>{periodStatusLabels[period.status] || period.status}</span>
              </span>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">تقدم التسليمات</span>
                <span className="font-medium text-gray-900">{period.progress || 0}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (period.progress || 0) >= 100 ? 'bg-green-500' :
                    (period.progress || 0) >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${period.progress || 0}%` }}
                />
              </div>
            </div>

            {/* Meta Info */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <span>📋</span>
                <span>{period.template_name}</span>
              </span>
              <span className="flex items-center gap-1">
                <span>👥</span>
                <span>{period.submissions_count || 0}/{period.entities_count || 0} جهة</span>
              </span>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
              {period.status === 'open' && (
                <>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg">
                    📥 تتبع التسليمات
                  </span>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-lg">
                    🤖 توليد المحتوى
                  </span>
                </>
              )}
              {period.status === 'closed' && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg">
                  📄 تصدير التقرير
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// Quick Actions Component
// ==========================================
function QuickActions() {
  const actions: {
    title: string;
    description: string;
    icon: string;
    color: ColorKey;
    href: string;
  }[] = [
    {
      title: 'فترة جمع جديدة',
      description: 'ابدأ جمع البيانات',
      icon: '📅',
      color: 'blue',
      href: '/dashboard/data/periods',
    },
    {
      title: 'استيراد بيانات',
      description: 'من ملف Excel',
      icon: '📊',
      color: 'green',
      href: '/dashboard/import',
    },
    {
      title: 'توليد AI',
      description: 'توليد المحتوى',
      icon: '🤖',
      color: 'purple',
      href: '/dashboard/generate',
    },
    {
      title: 'القوالب',
      description: 'إدارة القوالب',
      icon: '📋',
      color: 'indigo',
      href: '/dashboard/templates',
    },
  ];

  return (
    <div className="card">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span>⚡</span>
        <span>إجراءات سريعة</span>
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const colors = colorClasses[action.color];
          return (
            <Link
              key={action.title}
              href={action.href}
              className={`
                p-4 rounded-xl transition-all duration-300
                ${colors.bg} ${colors.bgHover}
                border ${colors.border}
                hover:shadow-md hover:scale-[1.02]
                text-center
              `}
            >
              <div className="text-3xl mb-2">{action.icon}</div>
              <div className={`font-bold ${colors.text}`}>
                {action.title}
              </div>
              <div className="text-sm text-gray-500">{action.description}</div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// Templates Preview Component
// ==========================================
function TemplatesPreview({ templates }: { templates: Template[] }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>📋</span>
          <span>القوالب المتاحة</span>
        </h2>
        <Link
          href="/dashboard/templates"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          عرض الكل ←
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-gray-500 mb-3">لا توجد قوالب بعد</p>
          <Link
            href="/dashboard/templates"
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            إنشاء قالب جديد ←
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📋</span>
                  <div>
                    <h3 className="font-medium text-gray-900">{template.name}</h3>
                    <p className="text-sm text-gray-500">
                      {template.axes_count} محور • {template.items_count} بند • {template.entities_count} جهة
                    </p>
                  </div>
                </div>
                <Link
                  href={`/dashboard/data/periods?template=${template.id}`}
                  className="btn btn-primary text-sm"
                >
                  استخدام
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==========================================
// Recent Activity Component
// ==========================================
function RecentActivity() {
  // Mock data - in real app, this would come from API
  const activities = [
    {
      id: 1,
      type: 'file_upload',
      icon: '📄',
      title: 'ملف جديد',
      description: 'جهة التعليم رفعت ملف بيانات',
      time: 'منذ 5 دقائق',
      color: 'blue',
    },
    {
      id: 2,
      type: 'generation',
      icon: '🤖',
      title: 'توليد مكتمل',
      description: 'تم توليد محور الموارد البشرية',
      time: 'منذ 30 دقيقة',
      color: 'purple',
    },
    {
      id: 3,
      type: 'approval',
      icon: '✅',
      title: 'اعتماد',
      description: 'تم اعتماد 5 ملفات',
      time: 'منذ ساعة',
      color: 'green',
    },
    {
      id: 4,
      type: 'period',
      icon: '📅',
      title: 'فترة جديدة',
      description: 'تم إنشاء فترة جمع Q1 2024',
      time: 'منذ يوم',
      color: 'indigo',
    },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    orange: 'bg-orange-100 text-orange-600',
  };

  return (
    <div className="card">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <span>🕐</span>
        <span>آخر النشاطات</span>
      </h2>

      <div className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <div className={`
              w-10 h-10 rounded-xl flex items-center justify-center text-lg
              ${colorMap[activity.color]}
            `}>
              {activity.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 text-sm">{activity.title}</p>
              <p className="text-sm text-gray-500 truncate">{activity.description}</p>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {activity.time}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 text-center">
        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
          عرض كل النشاطات ←
        </button>
      </div>
    </div>
  );
}

// ==========================================
// Getting Started Component
// ==========================================
function GettingStarted() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative bg-gradient-to-l from-blue-600 via-blue-700 to-indigo-800 rounded-2xl p-6 text-white overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
      </div>

      {/* Dismiss Button */}
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-4 left-4 text-white/60 hover:text-white"
      >
        ✕
      </button>

      <div className="relative">
        <h1 className="text-2xl font-bold mb-2">
          مرحباً بك في تقرير.ai 👋
        </h1>
        <p className="text-blue-100 mb-6 max-w-2xl">
          منصة ذكية لإنشاء التقارير المؤسسية. حوّل البيانات إلى تقارير احترافية
          بخطوات بسيطة وباستخدام الذكاء الاصطناعي.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/templates"
            className="inline-flex items-center gap-2 bg-white text-blue-700 px-5 py-2.5 rounded-xl font-medium hover:bg-blue-50 transition-colors"
          >
            <span>📋</span>
            <span>إنشاء قالب جديد</span>
          </Link>
          <Link
            href="/dashboard/data/periods"
            className="inline-flex items-center gap-2 bg-white/20 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-white/30 transition-colors"
          >
            <span>📅</span>
            <span>فترة جمع جديدة</span>
          </Link>
          <Link
            href="/dashboard/generate"
            className="inline-flex items-center gap-2 bg-white/10 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-white/20 transition-colors"
          >
            <span>🤖</span>
            <span>توليد AI</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Main Dashboard Page
// ==========================================
export default function DashboardPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [stats, setStats] = useState<Stats>({
    total_projects: 0,
    collecting: 0,
    reviewing: 0,
    generating: 0,
    completed: 0,
    templates: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [periodsData, templatesData] = await Promise.all([
        api.data.periods.list().catch(() => ({ results: [] })),
        api.templates.list().catch(() => ({ results: [] })),
      ]);

      const periodsList = periodsData.results || periodsData || [];
      const templatesList = templatesData.results || templatesData || [];

      // Filter active periods (open ones first)
      const sortedPeriods = [...periodsList].sort((a: Period, b: Period) => {
        if (a.status === 'open' && b.status !== 'open') return -1;
        if (a.status !== 'open' && b.status === 'open') return 1;
        return 0;
      });

      setPeriods(sortedPeriods.slice(0, 5));
      setTemplates(templatesList.slice(0, 4));

      // Calculate stats based on periods
      const openPeriods = periodsList.filter((p: Period) => p.status === 'open');
      const closedPeriods = periodsList.filter((p: Period) => p.status === 'closed');

      setStats({
        total_projects: periodsList.length,
        collecting: openPeriods.length,
        reviewing: 0, // This could be calculated from files pending review
        generating: 0, // This could be calculated from drafts in progress
        completed: closedPeriods.length,
        templates: templatesList.length,
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <GettingStarted />

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Workflow Steps */}
      <WorkflowSteps />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Takes 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <ActivePeriods periods={periods} />
          <RecentActivity />
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <QuickActions />
          <TemplatesPreview templates={templates} />
        </div>
      </div>
    </div>
  );
}
