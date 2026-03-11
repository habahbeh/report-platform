'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Period {
  id: number;
  name: string;
  year: number;
}

interface AxisDraft {
  id: string;
  axis_name: string;
  axis_code: string;
  content: string;
  status: string;
  generated_at: string;
  model_used: string;
  word_count: number;
}

interface ItemDraft {
  id: string;
  item_name: string;
  item_code: string;
  axis_name: string;
  content: string;
  status: string;
  generated_at: string;
  model_used: string;
  word_count: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-700', icon: '📝' },
  generated: { label: 'تم التوليد', color: 'bg-blue-100 text-blue-700', icon: '🤖' },
  edited: { label: 'تم التعديل', color: 'bg-yellow-100 text-yellow-700', icon: '✏️' },
  approved: { label: 'معتمد', color: 'bg-green-100 text-green-700', icon: '✅' },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-700', icon: '❌' },
};

export default function DraftsPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [axisDrafts, setAxisDrafts] = useState<AxisDraft[]>([]);
  const [itemDrafts, setItemDrafts] = useState<ItemDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'axes' | 'items'>('axes');

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadDrafts();
    }
  }, [selectedPeriod, view]);

  async function loadPeriods() {
    try {
      const data = await api.data.periods.list();
      const list = data.results || data || [];
      setPeriods(list);
      if (list.length > 0) {
        setSelectedPeriod(list[0].id);
      }
    } catch (error) {
      console.error('Failed to load periods:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadDrafts() {
    if (!selectedPeriod) return;
    try {
      if (view === 'axes') {
        const data = await api.generation.axisDrafts.list(selectedPeriod);
        setAxisDrafts(data.results || data || []);
      } else {
        const data = await api.generation.itemDrafts.list(selectedPeriod);
        setItemDrafts(data.results || data || []);
      }
    } catch (error) {
      console.error('Failed to load drafts:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>📝</span>
            <span>المسودات</span>
          </h1>
          <p className="text-gray-500 mt-1">
            إدارة ومراجعة المسودات المُولّدة
          </p>
        </div>
        <Link href="/dashboard/generate" className="btn btn-primary flex items-center gap-2">
          <span>🤖</span>
          <span>توليد جديد</span>
        </Link>
      </div>

      {periods.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد فترات جمع</h3>
          <p className="text-gray-500 mb-4">أنشئ فترة جمع بيانات أولاً</p>
          <Link href="/dashboard/data/periods" className="btn btn-primary">
            إنشاء فترة ←
          </Link>
        </div>
      ) : (
        <>
          {/* Period & View Selector */}
          <div className="card">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 font-medium">الفترة:</span>
                <select
                  value={selectedPeriod || ''}
                  onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
                  className="input"
                >
                  {periods.map((period) => (
                    <option key={period.id} value={period.id}>
                      {period.name} ({period.year})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 mr-auto">
                <span className="text-gray-600 font-medium">العرض:</span>
                <button
                  onClick={() => setView('axes')}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    view === 'axes'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📊 المحاور
                </button>
                <button
                  onClick={() => setView('items')}
                  className={`px-4 py-2 rounded-xl transition-all ${
                    view === 'items'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  📋 البنود
                </button>
              </div>
            </div>
          </div>

          {/* Drafts List */}
          {view === 'axes' ? (
            axisDrafts.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد مسودات محاور</h3>
                <p className="text-gray-500 mb-4">قم بتوليد محتوى المحاور أولاً</p>
                <Link href="/dashboard/generate" className="btn btn-primary">
                  توليد المحتوى ←
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {axisDrafts.map((draft) => {
                  const status = statusConfig[draft.status] || statusConfig.draft;
                  return (
                    <div
                      key={draft.id}
                      className="card hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <span className="text-sm bg-gray-100 px-2 py-0.5 rounded">
                            {draft.axis_code}
                          </span>
                          <h3 className="font-bold text-gray-900 mt-1">{draft.axis_name}</h3>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs ${status.color}`}>
                          {status.icon} {status.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                        {draft.content?.substring(0, 200)}...
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>📊 {draft.word_count} كلمة</span>
                          <span>🤖 {draft.model_used}</span>
                        </div>
                        <button className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200">
                          تحرير
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            itemDrafts.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد مسودات بنود</h3>
                <p className="text-gray-500 mb-4">قم بتوليد محتوى البنود أولاً</p>
                <Link href="/dashboard/generate" className="btn btn-primary">
                  توليد المحتوى ←
                </Link>
              </div>
            ) : (
              <div className="card overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-right p-4 font-medium text-gray-600">البند</th>
                      <th className="text-right p-4 font-medium text-gray-600">المحور</th>
                      <th className="text-right p-4 font-medium text-gray-600">الحالة</th>
                      <th className="text-right p-4 font-medium text-gray-600">الكلمات</th>
                      <th className="text-right p-4 font-medium text-gray-600">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {itemDrafts.map((draft) => {
                      const status = statusConfig[draft.status] || statusConfig.draft;
                      return (
                        <tr key={draft.id} className="hover:bg-gray-50">
                          <td className="p-4">
                            <div className="font-medium text-gray-900">{draft.item_name}</div>
                            <div className="text-sm text-gray-500">{draft.item_code}</div>
                          </td>
                          <td className="p-4 text-gray-600">{draft.axis_name}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${status.color}`}>
                              {status.icon} {status.label}
                            </span>
                          </td>
                          <td className="p-4 text-gray-600">{draft.word_count}</td>
                          <td className="p-4">
                            <button className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200">
                              تحرير
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
