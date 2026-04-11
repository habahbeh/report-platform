'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { FadeIn, StaggerContainer, StaggerItem, ScaleHover, PageTransition } from '@/components/ui/motion';
import {
  FolderKanban,
  Plus,
  CheckCircle,
  Clock,
  FileText,
  Users,
  Sparkles,
  Download,
  Database,
  ArrowLeft,
  Activity,
  Zap,
  X,
} from 'lucide-react';

function FirstTimeBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="relative bg-gradient-to-l from-indigo-600 to-blue-600 rounded-xl px-5 py-4 text-white flex items-center gap-4">
      <Zap className="w-5 h-5 flex-shrink-0 text-blue-200" />
      <p className="text-sm font-medium flex-1">
        مرحباً! ابدأ بـ:{' '}
        <Link href="/dashboard/projects/new" className="underline underline-offset-2 hover:text-blue-100">إنشاء مشروع</Link>
        {' '} &larr; دعوة المساهمين &larr; مراجعة البيانات &larr; توليد التقرير &larr; تصديره
      </p>
      <button onClick={onDismiss} className="text-blue-200 hover:text-white p-1 rounded-lg hover:bg-white/10">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ==========================================
// Types
// ==========================================
interface Project {
  id: string;
  name: string;
  period: string;
  status: string;
  template_name?: string;
  organization_name?: string;
  contributors_count?: number;
  progress?: number;
  created_at?: string;
}

interface Stats {
  total_projects: number;
  active: number;
  completed: number;
  pending_data: number;
}

// ==========================================
// Project Stage Helpers
// ==========================================
const stageConfig: Record<string, { label: string; step: number; color: string; icon: typeof Clock }> = {
  draft:      { label: 'مسودة',         step: 1, color: 'gray',    icon: Clock },
  collecting: { label: 'جمع البيانات',  step: 2, color: 'amber',   icon: Database },
  reviewing:  { label: 'هيكل HTML',     step: 3, color: 'blue',    icon: FileText },
  generating: { label: 'توليد النصوص',  step: 4, color: 'purple',  icon: Sparkles },
  published:  { label: 'منشور',          step: 5, color: 'emerald', icon: CheckCircle },
  archived:   { label: 'مؤرشف',          step: 5, color: 'gray',    icon: Download },
};

const stageColors: Record<string, { bg: string; text: string; badge: string; progress: string }> = {
  gray: { bg: 'bg-gray-50 dark:bg-gray-800/50', text: 'text-gray-600 dark:text-gray-400', badge: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400', progress: 'bg-gray-400' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-600 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400', progress: 'bg-amber-500' },
  blue: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-600 dark:text-blue-400', badge: 'bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400', progress: 'bg-blue-500' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-600 dark:text-purple-400', badge: 'bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-400', progress: 'bg-purple-500' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-600 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400', progress: 'bg-emerald-500' },
};

// ==========================================
// Hero Section
// ==========================================
function HeroSection({ stats }: { stats: Stats }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-blue-600 via-blue-700 to-indigo-800 p-8 text-white">
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

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'المشاريع', value: stats.total_projects, icon: FolderKanban },
            { label: 'نشطة', value: stats.active, icon: Zap },
            { label: 'بانتظار بيانات', value: stats.pending_data, icon: Database },
            { label: 'مكتملة', value: stats.completed, icon: CheckCircle },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
                <Icon className="w-5 h-5 mx-auto mb-1 text-blue-200" />
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-blue-200">{s.label}</p>
              </div>
            );
          })}
        </div>

        <Link
          href="/dashboard/projects/new"
          className="inline-flex items-center gap-2 bg-white text-blue-700 px-6 py-3 rounded-xl font-semibold hover:bg-blue-50 transition-all hover:scale-105 shadow-lg"
        >
          <Plus className="w-5 h-5" />
          مشروع جديد
        </Link>
      </div>
    </div>
  );
}

// ==========================================
// Project Card
// ==========================================
function ProjectCard({ project }: { project: Project }) {
  const stage = stageConfig[project.status] || stageConfig.draft;
  const colors = stageColors[stage.color];
  const StageIcon = stage.icon;
  const progressPercent = project.progress || (stage.step / 5) * 100;

  return (
    <ScaleHover scale={1.01}>
      <Link
        href={`/dashboard/projects/${project.id}`}
        className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-lg transition-all duration-300 overflow-hidden group"
      >
        {/* Stage Indicator Bar */}
        <div className={`h-1.5 ${colors.progress}`} style={{ width: `${progressPercent}%` }} />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors truncate">
                {project.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{project.period}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${colors.badge} shrink-0 ms-2`}>
              <StageIcon className="w-3.5 h-3.5" />
              {stage.label}
            </span>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map((step) => (
              <div
                key={step}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  step <= stage.step ? colors.progress : 'bg-gray-100 dark:bg-gray-800'
                }`}
              />
            ))}
          </div>

          {/* Meta */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
              {project.template_name && (
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  {project.template_name}
                </span>
              )}
              {project.contributors_count !== undefined && (
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {project.contributors_count} مساهم
                </span>
              )}
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 group-hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-all">
              ادخل للمشروع
              <ArrowLeft className="w-4 h-4" />
            </span>
          </div>
        </div>
      </Link>
    </ScaleHover>
  );
}

// ==========================================
// Projects Grid
// ==========================================
function ProjectsGrid({ projects }: { projects: Project[] }) {
  if (projects.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
        <div className="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mx-auto mb-5">
          <FolderKanban className="w-10 h-10 text-blue-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">لا توجد مشاريع بعد</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto leading-relaxed">
          ابدأ بإنشاء مشروع جديد لتوليد تقريرك الأول.
          كل ما تحتاجه هو اسم المشروع واختيار القالب.
        </p>
        <Link
          href="/dashboard/projects/new"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25"
        >
          <Plus className="w-5 h-5" />
          إنشاء مشروع جديد
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center">
            <FolderKanban className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">المشاريع</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{projects.length} مشروع</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/projects"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
          >
            عرض الكل
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Link
            href="/dashboard/projects/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            جديد
          </Link>
        </div>
      </div>

      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((project) => (
          <StaggerItem key={project.id}>
            <ProjectCard project={project} />
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  );
}

// ==========================================
// Workflow Guide (for new users)
// ==========================================
function WorkflowGuide({ firstProjectId }: { firstProjectId?: string }) {
  const steps = [
    { number: 1, title: 'أنشئ مشروعاً',  description: 'اختر قالب وحدد الفترة والمؤسسة', icon: FolderKanban, color: 'bg-blue-500',    href: '/dashboard/projects/new' },
    { number: 2, title: 'اجمع البيانات', description: 'أرسل روابط — المساهمون يدخلون الأرقام', icon: Database,    color: 'bg-amber-500',   href: firstProjectId ? `/dashboard/projects/${firstProjectId}` : '/dashboard/projects/new' },
    { number: 3, title: 'ابنِ الهيكل',   description: 'النظام يبني HTML تلقائياً من البيانات', icon: FileText,     color: 'bg-teal-500',    href: firstProjectId ? `/dashboard/projects/${firstProjectId}` : '/dashboard/projects/new' },
    { number: 4, title: 'ولّد النصوص',   description: 'الذكاء الاصطناعي يكتب التحليلات', icon: Sparkles,     color: 'bg-purple-500',  href: firstProjectId ? `/dashboard/projects/${firstProjectId}` : '/dashboard/projects/new' },
    { number: 5, title: 'صدّر التقرير',  description: 'حمّل Word أو PDF أو HTML',         icon: Download,     color: 'bg-emerald-500', href: firstProjectId ? `/dashboard/projects/${firstProjectId}` : '/dashboard/projects/new' },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">كيف يعمل؟</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">اضغط على أي خطوة للبدء</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <Link
              key={step.number}
              href={step.href}
              className="text-center group cursor-pointer rounded-xl p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all hover:shadow-md"
            >
              <div className={`w-12 h-12 rounded-xl ${step.color} flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform shadow-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-xs font-bold text-gray-400 mb-1">خطوة {step.number}</div>
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 transition-colors">{step.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">{step.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// Main Dashboard
// ==========================================
export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<Stats>({ total_projects: 0, active: 0, completed: 0, pending_data: 0 });
  const [loading, setLoading] = useState(true);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    loadData();
    const dismissed = localStorage.getItem('taqrir_banner_dismissed');
    if (!dismissed) setShowBanner(true);
  }, []);

  async function loadData() {
    try {
      const projectsData = await api.projects.list().catch(() => ({ results: [] }));
      const projectsList: Project[] = projectsData.results || projectsData || [];

      setProjects(projectsList.slice(0, 6));

      const active = projectsList.filter((p: Project) => !['published', 'archived'].includes(p.status));
      const completed = projectsList.filter((p: Project) => ['published', 'archived'].includes(p.status));
      const pendingData = projectsList.filter((p: Project) => ['draft', 'collecting'].includes(p.status));

      setStats({
        total_projects: projectsList.length,
        active: active.length,
        completed: completed.length,
        pending_data: pendingData.length,
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card h-28 bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card h-64 bg-gray-100 dark:bg-gray-800" />
          <div className="card h-64 bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  function dismissBanner() {
    localStorage.setItem('taqrir_banner_dismissed', '1');
    setShowBanner(false);
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* First-time Banner */}
        {showBanner && stats.total_projects === 0 && (
          <FadeIn>
            <FirstTimeBanner onDismiss={dismissBanner} />
          </FadeIn>
        )}

        {/* Hero + Stats */}
        <FadeIn>
          <HeroSection stats={stats} />
        </FadeIn>

        {/* Projects */}
        <FadeIn delay={0.1}>
          <ProjectsGrid projects={projects} />
        </FadeIn>

        {/* Workflow Guide (always visible — helps new users) */}
        <FadeIn delay={0.2}>
          <WorkflowGuide firstProjectId={projects.length > 0 ? projects[0].id : undefined} />
        </FadeIn>
      </div>
    </PageTransition>
  );
}
