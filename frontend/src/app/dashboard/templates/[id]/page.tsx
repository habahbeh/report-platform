'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Item {
  id: number;
  code: string;
  name: string;
  field_type: string;
  unit: string;
  required: boolean;
  aggregation: string;
}

interface Axis {
  id: number;
  code: string;
  name: string;
  name_en: string;
  order: number;
  items: Item[];
  items_count: number;
}

interface Entity {
  id: number;
  name: string;
  name_en: string;
  contact_role: string;
  priority: string;
  is_college: boolean;
  items_count: number;
}

interface Template {
  id: number;
  name: string;
  name_en: string;
  description: string;
  category: string;
  axes_count: number;
  items_count: number;
  entities_count: number;
  is_public: boolean;
  is_default: boolean;
  axes: Axis[];
  entities: Entity[];
}

const categoryLabels: Record<string, string> = {
  higher_education: 'التعليم العالي',
  government: 'الحكومة',
  corporate: 'الشركات',
  healthcare: 'الصحة',
  other: 'أخرى',
};

const fieldTypeLabels: Record<string, string> = {
  text: 'نص',
  number: 'رقم',
  percentage: 'نسبة',
  currency: 'مبلغ',
  date: 'تاريخ',
  rich_text: 'نص طويل',
  select: 'اختيار',
  file: 'ملف',
  computed: 'محسوب',
  table_static: 'جدول ثابت',
  table_dynamic: 'جدول متغير',
};

const priorityLabels: Record<string, { label: string; color: string }> = {
  critical: { label: 'حرج', color: 'bg-red-100 text-red-700' },
  high: { label: 'عالي', color: 'bg-orange-100 text-orange-700' },
  medium: { label: 'متوسط', color: 'bg-yellow-100 text-yellow-700' },
  low: { label: 'منخفض', color: 'bg-gray-100 text-gray-600' },
};

export default function TemplateDetailPage() {
  const params = useParams();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'axes' | 'items' | 'entities'>('axes');
  const [expandedAxes, setExpandedAxes] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadTemplate();
  }, [templateId]);

  async function loadTemplate() {
    try {
      const data = await api.templatesFull.getFull(parseInt(templateId));
      setTemplate(data);
      // Expand first axis by default
      if (data.axes?.length > 0) {
        setExpandedAxes(new Set([data.axes[0].id]));
      }
    } catch (error) {
      console.error('Failed to load template:', error);
    } finally {
      setLoading(false);
    }
  }

  function toggleAxis(axisId: number) {
    const newExpanded = new Set(expandedAxes);
    if (newExpanded.has(axisId)) {
      newExpanded.delete(axisId);
    } else {
      newExpanded.add(axisId);
    }
    setExpandedAxes(newExpanded);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">القالب غير موجود</p>
        <Link href="/dashboard/templates" className="text-blue-600 hover:underline mt-2 inline-block">
          العودة للقوالب
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/dashboard/templates" className="hover:text-gray-700">القوالب</Link>
            <span>←</span>
            <span className="text-gray-900">{template.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{template.name}</h1>
          {template.name_en && (
            <p className="text-gray-500 mt-1">{template.name_en}</p>
          )}
          {template.description && (
            <p className="text-gray-600 mt-2">{template.description}</p>
          )}
        </div>
        <Link
          href={`/dashboard/projects/new?template=${template.id}`}
          className="btn btn-primary"
        >
          + إنشاء مشروع
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-3xl font-bold text-blue-600">{template.axes_count}</div>
          <div className="text-sm text-gray-500">محور</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-600">{template.items_count}</div>
          <div className="text-sm text-gray-500">بند</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-purple-600">{template.entities_count}</div>
          <div className="text-sm text-gray-500">جهة</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl">📋</div>
          <div className="text-sm text-gray-500">{categoryLabels[template.category]}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { key: 'axes', label: 'المحاور والبنود', count: template.axes_count },
            { key: 'items', label: 'جميع البنود', count: template.items_count },
            { key: 'entities', label: 'الجهات المسؤولة', count: template.entities_count },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className={`py-3 border-b-2 font-medium transition-colors ${
                tab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {tab === 'axes' && (
        <div className="space-y-4">
          {template.axes?.map((axis) => (
            <div key={axis.id} className="card">
              <button
                onClick={() => toggleAxis(axis.id)}
                className="w-full flex items-center justify-between text-right"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{expandedAxes.has(axis.id) ? '▼' : '▶'}</span>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {axis.code}. {axis.name}
                    </div>
                    {axis.name_en && (
                      <div className="text-sm text-gray-500">{axis.name_en}</div>
                    )}
                  </div>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  {axis.items_count || axis.items?.length || 0} بند
                </span>
              </button>

              {expandedAxes.has(axis.id) && axis.items && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-right text-gray-500">
                        <th className="pb-2 font-medium">الكود</th>
                        <th className="pb-2 font-medium">البند</th>
                        <th className="pb-2 font-medium">النوع</th>
                        <th className="pb-2 font-medium">الوحدة</th>
                        <th className="pb-2 font-medium">إلزامي</th>
                      </tr>
                    </thead>
                    <tbody>
                      {axis.items.map((item) => (
                        <tr key={item.id} className="border-t border-gray-50">
                          <td className="py-2 font-mono text-blue-600">{item.code}</td>
                          <td className="py-2">{item.name}</td>
                          <td className="py-2 text-gray-500">{fieldTypeLabels[item.field_type] || item.field_type}</td>
                          <td className="py-2 text-gray-500">{item.unit || '-'}</td>
                          <td className="py-2">
                            {item.required ? (
                              <span className="text-green-600">✓</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'items' && (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-right">
                  <th className="pb-3 font-medium text-gray-500">الكود</th>
                  <th className="pb-3 font-medium text-gray-500">البند</th>
                  <th className="pb-3 font-medium text-gray-500">المحور</th>
                  <th className="pb-3 font-medium text-gray-500">النوع</th>
                  <th className="pb-3 font-medium text-gray-500">الوحدة</th>
                </tr>
              </thead>
              <tbody>
                {template.axes?.flatMap(axis =>
                  (axis.items || []).map(item => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-2 font-mono text-blue-600">{item.code}</td>
                      <td className="py-2">{item.name}</td>
                      <td className="py-2 text-gray-500">{axis.name}</td>
                      <td className="py-2 text-gray-500">{fieldTypeLabels[item.field_type] || item.field_type}</td>
                      <td className="py-2 text-gray-500">{item.unit || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'entities' && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {template.entities?.map((entity) => (
            <div key={entity.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{entity.is_college ? '🎓' : '🏢'}</span>
                  <div>
                    <div className="font-semibold text-gray-900">{entity.name}</div>
                    {entity.name_en && (
                      <div className="text-sm text-gray-500">{entity.name_en}</div>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityLabels[entity.priority]?.color}`}>
                  {priorityLabels[entity.priority]?.label}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">المسؤول:</span>
                  <span>{entity.contact_role || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">عدد البنود:</span>
                  <span className="font-medium text-blue-600">{entity.items_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">النوع:</span>
                  <span>{entity.is_college ? 'كلية' : 'دائرة/مركز'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
