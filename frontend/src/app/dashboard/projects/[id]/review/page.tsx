'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Axis {
  id: number;
  code: string;
  name: string;
}

interface Item {
  id: number;
  code: string;
  name: string;
  field_type: string;
  unit: string;
  required: boolean;
  axis: string;
  value: any;
  responses_count: number;
}

interface Project {
  id: string;
  name: string;
  period: string;
  status: string;
  template: {
    id: number;
    name: string;
  };
}

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [axes, setAxes] = useState<Axis[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedAxis, setSelectedAxis] = useState<string>('all');
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      const [projectData, aggregatedData] = await Promise.all([
        api.projects.get(projectId),
        api.projects.aggregated(projectId),
      ]);

      setProject(projectData);
      setItems(aggregatedData.items || []);

      // Extract unique axes
      const axesMap = new Map<string, Axis>();
      (aggregatedData.items || []).forEach((item: any) => {
        if (item.axis && !axesMap.has(item.axis)) {
          axesMap.set(item.axis, {
            id: item.axis_id,
            code: item.axis_code || '',
            name: item.axis,
          });
        }
      });
      setAxes(Array.from(axesMap.values()));
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSaveValue(itemId: number) {
    setSaving(true);
    try {
      // TODO: Implement save to backend
      // await api.responses.update(itemId, { admin_value: editValue });
      setEditingItem(null);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'فشل في الحفظ');
    } finally {
      setSaving(false);
    }
  }

  function startEditing(item: Item) {
    setEditingItem(item.code);
    setEditValue(item.value?.toString() || '');
  }

  const filteredItems = selectedAxis === 'all'
    ? items
    : items.filter(item => item.axis === selectedAxis);

  const completedCount = items.filter(item => item.value !== null && item.value !== undefined).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">المشروع غير موجود</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/dashboard/projects" className="hover:text-gray-700">المشاريع</Link>
            <span>←</span>
            <Link href={`/dashboard/projects/${projectId}`} className="hover:text-gray-700">{project.name}</Link>
            <span>←</span>
            <span className="text-gray-900">مراجعة البيانات</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">مراجعة البيانات</h1>
          <p className="text-gray-600 mt-1">{project.template.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-left">
            <div className="text-2xl font-bold text-blue-600">{progress}%</div>
            <div className="text-sm text-gray-500">{completedCount}/{items.length} مكتمل</div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">تقدم المراجعة</span>
          <span className="text-sm font-medium">{progress}%</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-green-500' : 'bg-blue-600'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Axis Filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedAxis('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedAxis === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          الكل ({items.length})
        </button>
        {axes.map((axis) => {
          const count = items.filter(i => i.axis === axis.name).length;
          return (
            <button
              key={axis.name}
              onClick={() => setSelectedAxis(axis.name)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedAxis === axis.name
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {axis.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Data Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-right">
                <th className="pb-3 pr-4 font-medium text-gray-500 w-20">الكود</th>
                <th className="pb-3 font-medium text-gray-500">البند</th>
                <th className="pb-3 font-medium text-gray-500 w-40">القيمة</th>
                <th className="pb-3 font-medium text-gray-500 w-24">الوحدة</th>
                <th className="pb-3 font-medium text-gray-500 w-24">الحالة</th>
                <th className="pb-3 font-medium text-gray-500 w-24">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const hasValue = item.value !== null && item.value !== undefined;
                const isEditing = editingItem === item.code;

                return (
                  <tr key={item.code} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 pr-4">
                      <span className="font-mono text-blue-600 text-sm">{item.code}</span>
                    </td>
                    <td className="py-3">
                      <div className="font-medium text-gray-900">{item.name}</div>
                      {item.responses_count > 1 && (
                        <div className="text-xs text-gray-500">
                          {item.responses_count} مصادر
                        </div>
                      )}
                    </td>
                    <td className="py-3">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="input text-sm py-1 px-2 w-full"
                          autoFocus
                        />
                      ) : (
                        <span className={`font-medium ${hasValue ? 'text-gray-900' : 'text-gray-400'}`}>
                          {hasValue
                            ? typeof item.value === 'number'
                              ? item.value.toLocaleString('ar')
                              : String(item.value)
                            : '—'
                          }
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-gray-500 text-sm">{item.unit || '-'}</td>
                    <td className="py-3">
                      {hasValue ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          ✓ مكتمل
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          ناقص
                        </span>
                      )}
                    </td>
                    <td className="py-3">
                      {isEditing ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleSaveValue(item.id)}
                            disabled={saving}
                            className="text-green-600 hover:text-green-700 text-sm"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setEditingItem(null)}
                            className="text-gray-500 hover:text-gray-700 text-sm"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEditing(item)}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          ✏️ تعديل
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Link href={`/dashboard/projects/${projectId}`} className="btn btn-secondary">
          ← العودة للمشروع
        </Link>
        {progress >= 50 && (
          <Link href={`/dashboard/projects/${projectId}?tab=export`} className="btn btn-primary">
            تصدير التقرير →
          </Link>
        )}
      </div>
    </div>
  );
}
