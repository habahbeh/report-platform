'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PageTransition, FadeIn } from '@/components/ui/motion';

interface Template {
  id: number;
  name: string;
  code: string;
}

interface Axis {
  id: number;
  code: string;
  name: string;
  description: string;
  order: number;
  items_count?: number;
}

export default function AxesListPage() {
  const params = useParams();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [axes, setAxes] = useState<Axis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [templateId]);

  async function loadData() {
    try {
      const [templateData, axesData] = await Promise.all([
        api.templates.get(parseInt(templateId)),
        api.axes.list(parseInt(templateId)),
      ]);
      setTemplate(templateData);
      setAxes(axesData.results || axesData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48" />
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-40" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
          </div>
          <div className="h-9 bg-gray-200 dark:bg-gray-700 rounded w-28" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card h-20 bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/templates" className="hover:text-blue-600">القوالب</Link>
        <span>/</span>
        <Link href={`/dashboard/templates/${templateId}`} className="hover:text-blue-600">
          {template?.name || 'القالب'}
        </Link>
        <span>/</span>
        <span className="text-gray-900">المحاور</span>
      </div>

      {/* Header */}
      <FadeIn>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">محاور القالب</h1>
          <p className="text-gray-500 mt-1">
            {template?.name} • {axes.length} محور
          </p>
        </div>
        <Link
          href={`/dashboard/templates/${templateId}/axes/new`}
          className="btn btn-primary"
        >
          + إضافة محور
        </Link>
      </div>
      </FadeIn>

      {/* Axes Grid */}
      {axes.length === 0 ? (
        <div className="card text-center py-12">
          <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد محاور</h3>
          <p className="text-gray-500 mb-4">ابدأ بإضافة محور جديد للقالب</p>
          <Link
            href={`/dashboard/templates/${templateId}/axes/new`}
            className="btn btn-primary"
          >
            + إضافة محور
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {axes.map((axis, index) => (
            <Link
              key={axis.id}
              href={`/dashboard/templates/${templateId}/axes/${axis.id}`}
              className="card hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-lg">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{axis.name}</h3>
                  <p className="text-sm text-gray-500">
                    {axis.code} • {axis.items_count || 0} بند
                  </p>
                </div>
                <div className="text-gray-400">
                  →
                </div>
              </div>
              {axis.description && (
                <p className="text-gray-600 mt-3 text-sm line-clamp-2">
                  {axis.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
    </PageTransition>
  );
}
