'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { FadeIn, StaggerContainer, StaggerItem, ScaleHover, PageTransition } from '@/components/ui/motion';
import {
  LayoutTemplate,
  Calendar,
  FileCheck,
  Sparkles,
  Download,
  Clock,
  Users,
  FileText,
  ArrowLeft,
  Plus,
  Upload,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Activity,
  Zap,
  ChevronLeft,
} from 'lucide-react';

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

interface Period {
  id: number;
  name: string;
  academic_year: string;
  status: string;
  template_name: string;
  progress: number;
  submissions_count: number;
  entities_count: number;
}

interface Stats {
  templates: number;
  collecting: number;
  reviewing: number;
  completed: number;
}

// ==========================================
// Workflow Steps
// ==========================================
const workflowSteps = [
  {
    number: 1,
    title: 'إعداد القالب',
    description: 'تعريف المحاور والبنود',
    icon: LayoutTemplate,
    color: 'blue',
    href: '/dashboard/templates',
  },
  {
    number: 2,
    title: 'فترة الجمع',
    description: 'إنشاء فترة جديدة',
    icon: Calendar,
    color: 'indigo',
    href: '/dashboard/data/periods',
  },
  {
    number: 3,
    title: 'جمع البيانات',
    description: 'الجهات ترفع ملفاتها',
    icon: Upload,
    color: 'amber',
    href: '/dashboard/data/submissions',
  },
  {
    number: 4,
    title: 'المراجعة',
    description: 'مراجعة واعتماد',
    icon: FileCheck,
    color: 'orange',
    href: '/dashboard/review/data',
  },
  {
    number: 5,
    title: 'التوليد',
    description: 'AI يكتب المحتوى',
    icon: Sparkles,
    color: 'purple',
    href: '/dashboard/generate',
  },
  {
    number: 6,
    title: 'التصدير',
    description: 'التقرير النهائي',
    icon: Download,
    color: 'emerald',
    href: '/dashboard/export',
  },
];

const colorStyles: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/50', border: 'border-blue-200 dark:border-blue-800 hover:border-blue-400', text: 'text-blue-700 dark:text-blue-300', icon: 'text-blue-600 dark:text-blue-400' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-950/50', border: 'border-indigo-200 dark:border-indigo-800 hover:border-indigo-400', text: 'text-indigo-700 dark:text-indigo-300', icon: 'text-indigo-600 dark:text-indigo-400' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/50', border: 'border-amber-200 dark:border-amber-800 hover:border-amber-400', text: 'text-amber-700 dark:text-amber-300', icon: 'text-amber-600 dark:text-amber-400' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-950/50', border: 'border-orange-200 dark:border-orange-800 hover:border-orange-400', text: 'text-orange-700 dark:text-orange-300', icon: 'text-orange-600 dark:text-orange-400' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/50', border: 'border-purple-200 dark:border-purple-800 hover:border-purple-400', text: 'text-purple-700 dark:text-purple-300', icon: 'text-purple-600 dark:text-purple-400' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/50', border: 'border-emerald-200 dark:border-emerald-800 hover:border-emerald-400', text: 'text-emerald-700 dark:text-emerald-300', icon: 'text-emerald-600 dark:text-emerald-400' },
};

// ==========================================
// Hero Section
// ==========================================
function HeroSection() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-blue-600 via-blue-700 to-indigo-800 p-8 text-white">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-white/20 blur-3xl" />
      </div>
      
      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">مرحباً بك في تقرير.ai</h1>
            <p className="text-blue-200 text-sm">منصة التقارير المؤسسية الذكية</p>
          </div>
        </div>
        
        <p className="text-blue-100 mb-6 max-w-xl leading-relaxed">
          حوّل بياناتك إلى تقارير احترافية بخطوات بسيطة. 
          استخدم الذكاء الاصطناعي لتوليد المحتوى تلقائياً.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/templates"
            className="inline-flex items-center gap-2 bg-white text-blue-700 px-5 py-2.5 rounded-xl font-medium hover:bg-blue-50 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            قالب جديد
          </Link>
          <Link
            href="/dashboard/data/periods"
            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur text-white px-5 py-2.5 rounded-xl font-medium hover:bg-white/30 transition-all"
          >
            <Calendar className="w-4 h-4" />
            فترة جمع جديدة
          </Link>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Stats Cards
// ==========================================
function StatsCards({ stats }: { stats: Stats }) {
  const cards = [
    { label: 'القوالب', value: stats.templates, icon: LayoutTemplate, color: 'blue', href: '/dashboard/templates' },
    { label: 'فترات نشطة', value: stats.collecting, icon: Calendar, color: 'indigo', href: '/dashboard/data/periods' },
    { label: 'للمراجعة', value: stats.reviewing, icon: FileCheck, color: 'orange', href: '/dashboard/review/data' },
    { label: 'مكتملة', value: stats.completed, icon: CheckCircle, color: 'emerald', href: '/dashboard/export' },
  ];

  return (
    <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        const styles = colorStyles[card.color];
        return (
          <StaggerItem key={card.label}>
            <ScaleHover>
              <Link
                href={card.href}
                className="group block bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 hover:shadow-lg hover:border-gray-200 dark:hover:border-gray-700 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg ${styles.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 ${styles.icon}`} />
                  </div>
                  <TrendingUp className="w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{card.value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
              </Link>
            </ScaleHover>
          </StaggerItem>
        );
      })}
    </StaggerContainer>
  );
}

// ==========================================
// Workflow Steps
// ==========================================
function WorkflowSection() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">خطوات إنشاء التقرير</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">اتبع الخطوات للحصول على تقرير احترافي</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {workflowSteps.map((step, index) => {
          const Icon = step.icon;
          const styles = colorStyles[step.color];
          return (
            <Link
              key={step.number}
              href={step.href}
              className="group relative"
            >
              <div className={`
                p-4 rounded-xl border-2 transition-all duration-300
                hover:shadow-md hover:-translate-y-1
                ${styles.bg} ${styles.border}
              `}>
                {/* Step number */}
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center shadow-lg">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="mb-3 group-hover:scale-110 transition-transform">
                  <Icon className={`w-8 h-8 ${styles.icon}`} />
                </div>

                {/* Title */}
                <h3 className={`font-semibold text-sm ${styles.text} mb-1`}>
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-gray-500 leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Arrow */}
              {index < workflowSteps.length - 1 && (
                <div className="hidden lg:flex absolute top-1/2 -left-2 -translate-y-1/2 text-gray-300">
                  <ChevronLeft className="w-4 h-4" />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// Active Periods
// ==========================================
function ActivePeriods({ periods }: { periods: Period[] }) {
  const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
    open: { label: 'مفتوحة', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50', icon: CheckCircle },
    closed: { label: 'مغلقة', color: 'text-gray-600 bg-gray-100 dark:bg-gray-800', icon: AlertCircle },
    draft: { label: 'مسودة', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/50', icon: Clock },
  };

  if (periods.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4">
          <Calendar className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">لا توجد فترات جمع</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
          ابدأ بإنشاء فترة جمع جديدة لجمع البيانات من الجهات
        </p>
        <Link
          href="/dashboard/data/periods"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          إنشاء فترة جمع
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">فترات الجمع النشطة</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{periods.length} فترة</p>
          </div>
        </div>
        <Link
          href="/dashboard/data/periods"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
        >
          عرض الكل
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>

      <div className="space-y-4">
        {periods.map((period) => {
          const status = statusConfig[period.status] || statusConfig.draft;
          const StatusIcon = status.icon;
          return (
            <ScaleHover key={period.id} scale={1.01}>
              <Link
                href={`/dashboard/data/periods/${period.id}`}
                className="block p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                      {period.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{period.academic_year}</p>
                  </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
                  <StatusIcon className="w-3.5 h-3.5" />
                  {status.label}
                </span>
              </div>

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-gray-600 dark:text-gray-400">التقدم</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{period.progress || 0}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        (period.progress || 0) >= 100 ? 'bg-emerald-500' :
                        (period.progress || 0) >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${period.progress || 0}%` }}
                    />
                  </div>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    {period.template_name}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    {period.submissions_count || 0}/{period.entities_count || 0}
                  </span>
                </div>
              </Link>
            </ScaleHover>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// Quick Actions
// ==========================================
function QuickActions() {
  const actions = [
    { title: 'فترة جمع جديدة', icon: Calendar, color: 'blue', href: '/dashboard/data/periods' },
    { title: 'استيراد بيانات', icon: Upload, color: 'emerald', href: '/dashboard/import' },
    { title: 'توليد AI', icon: Sparkles, color: 'purple', href: '/dashboard/generate' },
    { title: 'إدارة القوالب', icon: LayoutTemplate, color: 'indigo', href: '/dashboard/templates' },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
          <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">إجراءات سريعة</h2>
      </div>

      <StaggerContainer className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          const styles = colorStyles[action.color];
          return (
            <StaggerItem key={action.title}>
              <ScaleHover>
                <Link
                  href={action.href}
                  className={`
                    block p-4 rounded-xl transition-all duration-300
                    ${styles.bg} hover:shadow-md
                    border ${styles.border}
                    text-center group
                  `}
                >
                  <Icon className={`w-7 h-7 mx-auto mb-2 ${styles.icon} group-hover:scale-110 transition-transform`} />
                  <span className={`font-medium text-sm ${styles.text}`}>{action.title}</span>
                </Link>
              </ScaleHover>
            </StaggerItem>
          );
        })}
      </StaggerContainer>
    </div>
  );
}

// ==========================================
// Templates Preview
// ==========================================
function TemplatesPreview({ templates }: { templates: Template[] }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
            <LayoutTemplate className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">القوالب</h2>
        </div>
        <Link
          href="/dashboard/templates"
          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
        >
          الكل
          <ArrowLeft className="w-4 h-4" />
        </Link>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-6">
          <LayoutTemplate className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">لا توجد قوالب</p>
        </div>
      ) : (
        <StaggerContainer className="space-y-3">
          {templates.map((template) => (
            <StaggerItem key={template.id}>
              <ScaleHover scale={1.01}>
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white text-sm">{template.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {template.axes_count} محور • {template.items_count} بند
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/dashboard/data/periods?template=${template.id}`}
                    className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    استخدام
                  </Link>
                </div>
              </ScaleHover>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  );
}

// ==========================================
// Main Dashboard
// ==========================================
export default function DashboardPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [stats, setStats] = useState<Stats>({ templates: 0, collecting: 0, reviewing: 0, completed: 0 });
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

      const sortedPeriods = [...periodsList].sort((a: Period, b: Period) => {
        if (a.status === 'open' && b.status !== 'open') return -1;
        if (a.status !== 'open' && b.status === 'open') return 1;
        return 0;
      });

      setPeriods(sortedPeriods.slice(0, 4));
      setTemplates(templatesList.slice(0, 3));

      const openPeriods = periodsList.filter((p: Period) => p.status === 'open');
      const closedPeriods = periodsList.filter((p: Period) => p.status === 'closed');

      setStats({
        templates: templatesList.length,
        collecting: openPeriods.length,
        reviewing: 0,
        completed: closedPeriods.length,
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
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Hero */}
        <FadeIn>
          <HeroSection />
        </FadeIn>

        {/* Stats */}
        <FadeIn delay={0.1}>
          <StatsCards stats={stats} />
        </FadeIn>

        {/* Workflow */}
        <FadeIn delay={0.2}>
          <WorkflowSection />
        </FadeIn>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <FadeIn delay={0.3} className="lg:col-span-2">
            <ActivePeriods periods={periods} />
          </FadeIn>
          <div className="space-y-6">
            <FadeIn delay={0.4}>
              <QuickActions />
            </FadeIn>
            <FadeIn delay={0.5}>
              <TemplatesPreview templates={templates} />
            </FadeIn>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
