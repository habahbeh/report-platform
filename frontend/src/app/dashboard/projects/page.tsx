'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { PageTransition, FadeIn, StaggerContainer, StaggerItem, ScaleHover } from '@/components/ui/motion';
import {
  FolderKanban, Plus, Clock, Database, FileText, Sparkles,
  CheckCircle, Download, Users, ChevronLeft, AlertCircle,
} from 'lucide-react';

interface Project {
  id: string;
  name: string;
  period: string;
  status: string;
  template_name: string;
  organization_name: string;
  progress: number;
  items_progress: number;
  contributors_count: number;
  days_remaining: number | null;
  deadline: string | null;
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: typeof Clock; progress: string }> = {
  draft:      { label: 'مسودة',         color: 'text-gray-600',   bgColor: 'bg-gray-100',    icon: Clock,       progress: 'bg-gray-400' },
  collecting: { label: 'جمع البيانات', color: 'text-blue-700',   bgColor: 'bg-blue-100',    icon: Database,    progress: 'bg-blue-500' },
  reviewing:  { label: 'هيكل HTML',     color: 'text-amber-700',  bgColor: 'bg-amber-100',   icon: FileText,    progress: 'bg-amber-500' },
  generating: { label: 'توليد النصوص', color: 'text-purple-700', bgColor: 'bg-purple-100',  icon: Sparkles,    progress: 'bg-purple-500' },
  published:  { label: 'منشور',          color: 'text-emerald-700',bgColor: 'bg-emerald-100', icon: CheckCircle, progress: 'bg-emerald-500' },
  archived:   { label: 'مؤرشف',          color: 'text-gray-500',   bgColor: 'bg-gray-100',    icon: Clock,       progress: 'bg-gray-300' },
};

function ProjectSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2" />
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
        </div>
        <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded-full w-24 ms-3" />
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full mt-4" />
      <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-20" />
        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-28" />
      </div>
    </div>
  );
}

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status');

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>(statusFilter || 'all');

  useEffect(() => { loadProjects(); }, []);

  async function loadProjects() {
    try {
      const data = await api.projects.list();
      setProjects(data.results || data || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredProjects = selectedStatus === 'all'
    ? projects
    : projects.filter(p => p.status === selectedStatus);

  const statusCounts = projects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const filterTabs = [
    { key: 'all',        label: 'الكل',         count: projects.length,              icon: FolderKanban },
    { key: 'collecting', label: 'جمع البيانات', count: statusCounts.collecting || 0, icon: Database },
    { key: 'reviewing',  label: 'هيكل HTML',    count: statusCounts.reviewing || 0,  icon: FileText },
    { key: 'generating', label: 'توليد النصوص', count: statusCounts.generating || 0, icon: Sparkles },
    { key: 'published',  label: 'منشور',          count: statusCounts.published || 0,  icon: CheckCircle },
  ];

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <FolderKanban className="w-7 h-7 text-indigo-600" />
                المشاريع
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة ومتابعة مشاريع التقارير</p>
            </div>
            <Link
              href="/dashboard/projects/new"
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 font-medium text-sm transition-colors"
            >
              <Plus className="w-5 h-5" />
              مشروع جديد
            </Link>
          </div>
        </FadeIn>

        {/* Filter Tabs */}
        <FadeIn delay={0.05}>
          <div className="flex gap-2 flex-wrap">
            {filterTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedStatus(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedStatus === tab.key
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold ${
                    selectedStatus === tab.key ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </FadeIn>

        {/* Projects List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <ProjectSkeleton key={i} />)}
          </div>
        ) : filteredProjects.length === 0 ? (
          <FadeIn delay={0.1}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
              <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center mx-auto mb-5">
                <FolderKanban className="w-10 h-10 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {selectedStatus === 'all' ? 'لا توجد مشاريع بعد' : 'لا توجد مشاريع في هذه الحالة'}
              </h3>
              {selectedStatus === 'all' && (
                <>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">ابدأ بإنشاء مشروع جديد لتوليد تقريرك الأول.</p>
                  <Link
                    href="/dashboard/projects/new"
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25"
                  >
                    <Plus className="w-5 h-5" />
                    إنشاء مشروع جديد
                  </Link>
                </>
              )}
            </div>
          </FadeIn>
        ) : (
          <StaggerContainer className="space-y-3">
            {filteredProjects.map((project) => {
              const status = statusConfig[project.status] || statusConfig.draft;
              const StatusIcon = status.icon;
              const progress = project.items_progress || 0;

              return (
                <StaggerItem key={project.id}>
                  <ScaleHover scale={1.005}>
                    <Link
                      href={`/dashboard/projects/${project.id}`}
                      className="block bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-lg transition-all duration-200 overflow-hidden"
                    >
                      {/* Progress accent bar */}
                      <div className={`h-1 ${status.progress}`} style={{ width: `${progress}%` }} />

                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-gray-900 dark:text-white text-base truncate mb-1">
                              {project.name}
                            </h3>
                            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                              {project.template_name && (
                                <span className="flex items-center gap-1">
                                  <FileText className="w-3.5 h-3.5" />
                                  {project.template_name}
                                </span>
                              )}
                              {project.period && (
                                <span>{project.period}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-3 ms-4 flex-shrink-0">
                            <div className="text-right">
                              <div className="text-xl font-bold text-blue-600 dark:text-blue-400">{progress}%</div>
                              <div className="text-xs text-gray-400">مكتمل</div>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                              <StatusIcon className="w-3.5 h-3.5" />
                              {status.label}
                            </span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${status.progress}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        {/* Footer */}
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1.5">
                              <Users className="w-4 h-4" />
                              {project.contributors_count} جهة
                            </span>
                            {project.days_remaining !== null && (
                              <span className={`flex items-center gap-1.5 ${project.days_remaining < 7 ? 'text-red-600 font-medium' : ''}`}>
                                {project.days_remaining < 7 && <AlertCircle className="w-3.5 h-3.5" />}
                                {project.days_remaining} يوم متبقي
                              </span>
                            )}
                          </div>
                          <span className="text-blue-600 dark:text-blue-400 font-medium text-sm flex items-center gap-1">
                            عرض التفاصيل
                            <ChevronLeft className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </ScaleHover>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}
      </div>
    </PageTransition>
  );
}
