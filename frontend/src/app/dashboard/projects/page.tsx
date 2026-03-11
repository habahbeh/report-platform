'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

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

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'مسودة', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  collecting: { label: 'جمع البيانات', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  reviewing: { label: 'مراجعة', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  generating: { label: 'جاري التوليد', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  published: { label: 'منشور', color: 'text-green-700', bgColor: 'bg-green-100' },
  archived: { label: 'مؤرشف', color: 'text-gray-500', bgColor: 'bg-gray-100' },
};

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get('status');
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>(statusFilter || 'all');

  useEffect(() => {
    loadProjects();
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">المشاريع</h1>
          <p className="text-gray-600 mt-1">إدارة ومتابعة مشاريع التقارير</p>
        </div>
        <Link href="/dashboard/projects/new" className="btn btn-primary">
          + مشروع جديد
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { key: 'all', label: 'الكل', count: projects.length, icon: '📁', color: 'blue' },
          { key: 'collecting', label: 'جمع بيانات', count: statusCounts.collecting || 0, icon: '📥', color: 'sky' },
          { key: 'reviewing', label: 'مراجعة', count: statusCounts.reviewing || 0, icon: '👁️', color: 'yellow' },
          { key: 'generating', label: 'توليد', count: statusCounts.generating || 0, icon: '🤖', color: 'purple' },
          { key: 'published', label: 'منشور', count: statusCounts.published || 0, icon: '✅', color: 'green' },
        ].map((stat) => (
          <button
            key={stat.key}
            onClick={() => setSelectedStatus(stat.key)}
            className={`card text-center transition-all hover:shadow-md ${
              selectedStatus === stat.key ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{stat.count}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </button>
        ))}
      </div>

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📁</div>
          <p className="text-gray-500 mb-4">
            {selectedStatus === 'all' ? 'لا توجد مشاريع بعد' : 'لا توجد مشاريع في هذه الحالة'}
          </p>
          <Link href="/dashboard/projects/new" className="btn btn-primary">
            + إنشاء مشروع جديد
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => {
            const status = statusConfig[project.status];
            return (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="card hover:shadow-lg hover:border-blue-300 transition-all block"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg text-gray-900">{project.name}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>📋 {project.template_name}</span>
                      <span>•</span>
                      <span>📅 {project.period}</span>
                      {project.organization_name && (
                        <>
                          <span>•</span>
                          <span>🏢 {project.organization_name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="text-left min-w-[120px]">
                    <div className="text-2xl font-bold text-blue-600">{project.items_progress}%</div>
                    <div className="text-sm text-gray-500">مكتمل</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      project.items_progress >= 100 ? 'bg-green-500' :
                      project.items_progress >= 50 ? 'bg-blue-500' :
                      'bg-yellow-500'
                    }`}
                    style={{ width: `${project.items_progress}%` }}
                  />
                </div>

                {/* Footer */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4 text-gray-500">
                    <span>👥 {project.contributors_count} جهة</span>
                    {project.days_remaining !== null && (
                      <span className={project.days_remaining < 7 ? 'text-red-600 font-medium' : ''}>
                        ⏰ {project.days_remaining} يوم متبقي
                      </span>
                    )}
                  </div>
                  <span className="text-blue-600 font-medium">عرض التفاصيل ←</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
