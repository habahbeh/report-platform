'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface ItemDraft {
  id: string;
  item: number;
  item_name: string;
  item_code: string;
  axis_name: string;
  period_name: string;
  content: string;
  current_value: string | number | null;
  previous_value: string | number | null;
  change_percentage: number | null;
  status: string;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  model_used: string;
  word_count: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-700', icon: '📝' },
  pending: { label: 'قيد المراجعة', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
  approved: { label: 'معتمد', color: 'bg-green-100 text-green-700', icon: '✅' },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-700', icon: '❌' },
};

export default function ContentReviewPage() {
  const [drafts, setDrafts] = useState<ItemDraft[]>([]);
  const [allDrafts, setAllDrafts] = useState<ItemDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('draft');
  const [selectedDraft, setSelectedDraft] = useState<ItemDraft | null>(null);
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);

  useEffect(() => {
    loadPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      loadDrafts(selectedPeriod);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    if (filter === 'all') {
      setDrafts(allDrafts);
    } else {
      setDrafts(allDrafts.filter(d => d.status === filter));
    }
  }, [filter, allDrafts]);

  async function loadPeriods() {
    try {
      const data = await api.data.periods.list();
      const periodList = data.results || data || [];
      setPeriods(periodList);
      if (periodList.length > 0) {
        setSelectedPeriod(periodList[0].id);
      }
    } catch (error) {
      console.error('Failed to load periods:', error);
    }
  }

  async function loadDrafts(periodId: number) {
    setLoading(true);
    try {
      const data = await api.generation.itemDrafts.list(periodId);
      const draftList = data.results || data || [];
      setAllDrafts(draftList);
      setDrafts(draftList.filter((d: ItemDraft) => d.status === filter));
    } catch (error) {
      console.error('Failed to load drafts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string) {
    try {
      await api.generation.itemDrafts.approve(id);
      if (selectedPeriod) loadDrafts(selectedPeriod);
      setSelectedDraft(null);
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  }

  async function handleRegenerate(id: string) {
    try {
      await api.generation.itemDrafts.regenerate(id);
      if (selectedPeriod) loadDrafts(selectedPeriod);
      setSelectedDraft(null);
    } catch (error) {
      console.error('Failed to regenerate:', error);
    }
  }

  const stats = {
    draft: allDrafts.filter(d => d.status === 'draft').length,
    pending: allDrafts.filter(d => d.status === 'pending').length,
    approved: allDrafts.filter(d => d.status === 'approved').length,
    total: allDrafts.length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>✅</span>
            <span>مراجعة المحتوى المُولّد</span>
          </h1>
          <p className="text-gray-500 mt-1">
            مراجعة واعتماد نصوص البنود المولّدة بالذكاء الاصطناعي
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod || ''}
            onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
            className="input"
          >
            <option value="">اختر فترة...</option>
            {periods.map((period) => (
              <option key={period.id} value={period.id}>
                {period.name} ({period.academic_year})
              </option>
            ))}
          </select>
          <Link href="/dashboard/generate" className="btn btn-primary">
            🤖 توليد جديد
          </Link>
        </div>
      </div>

      {!selectedPeriod ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">اختر فترة جمع البيانات</h3>
          <p className="text-gray-500">اختر فترة من القائمة أعلاه لعرض المسودات</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { key: 'draft', label: 'مسودة', count: stats.draft, icon: '📝', color: 'gray' },
              { key: 'pending', label: 'قيد المراجعة', count: stats.pending, icon: '⏳', color: 'yellow' },
              { key: 'approved', label: 'معتمد', count: stats.approved, icon: '✅', color: 'green' },
              { key: 'all', label: 'الكل', count: stats.total, icon: '📋', color: 'blue' },
            ].map((stat) => (
              <button
                key={stat.key}
                onClick={() => setFilter(stat.key)}
                className={`card text-center transition-all hover:shadow-md ${
                  filter === stat.key ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="text-3xl mb-1">{stat.icon}</div>
                <div className="text-2xl font-bold text-gray-900">{stat.count}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Drafts List */}
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4">قائمة المسودات ({drafts.length})</h2>
              {drafts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📝</div>
                  <p>لا توجد مسودات في هذه الحالة</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {drafts.map((draft) => {
                    const status = statusConfig[draft.status] || statusConfig.draft;
                    return (
                      <button
                        key={draft.id}
                        onClick={() => setSelectedDraft(draft)}
                        className={`w-full text-right p-4 rounded-xl border-2 transition-all ${
                          selectedDraft?.id === draft.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-medium text-gray-900">{draft.item_name}</h3>
                            <p className="text-sm text-gray-500">{draft.axis_name}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs ${status.color}`}>
                            {status.icon} {status.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {draft.content?.substring(0, 100) || 'بدون محتوى'}...
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                          <span>{draft.word_count || 0} كلمة</span>
                          {draft.model_used && <span>🤖 {draft.model_used}</span>}
                          {draft.current_value && <span>📊 {draft.current_value}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Content Preview */}
            <div className="card">
              <h2 className="font-bold text-gray-900 mb-4">معاينة المحتوى</h2>
              {selectedDraft ? (
                <div>
                  <div className="mb-4 pb-4 border-b border-gray-100">
                    <h3 className="font-bold text-lg text-gray-900">{selectedDraft.item_name}</h3>
                    <p className="text-sm text-gray-500">{selectedDraft.axis_name} • {selectedDraft.item_code}</p>
                  </div>

                  {/* Values comparison */}
                  {(selectedDraft.current_value || selectedDraft.previous_value) && (
                    <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 rounded-xl">
                      <div>
                        <div className="text-xs text-gray-500">القيمة الحالية</div>
                        <div className="text-lg font-bold text-blue-600">
                          {selectedDraft.current_value || '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">القيمة السابقة</div>
                        <div className="text-lg font-bold text-gray-600">
                          {selectedDraft.previous_value || '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">نسبة التغيير</div>
                        <div className={`text-lg font-bold ${
                          (selectedDraft.change_percentage || 0) > 0 ? 'text-green-600' : 
                          (selectedDraft.change_percentage || 0) < 0 ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {selectedDraft.change_percentage 
                            ? `${selectedDraft.change_percentage > 0 ? '+' : ''}${selectedDraft.change_percentage.toFixed(1)}%`
                            : '—'
                          }
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="prose prose-sm max-w-none mb-6 p-4 bg-gray-50 rounded-xl max-h-[300px] overflow-y-auto">
                    <div className="whitespace-pre-wrap text-gray-700">
                      {selectedDraft.content || 'لم يتم توليد محتوى بعد'}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                    <span>📊 {selectedDraft.word_count || 0} كلمة</span>
                    {selectedDraft.model_used && <span>🤖 {selectedDraft.model_used}</span>}
                    <span>📅 {new Date(selectedDraft.updated_at).toLocaleDateString('ar')}</span>
                  </div>

                  {selectedDraft.status !== 'approved' && (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(selectedDraft.id)}
                        className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
                      >
                        ✅ اعتماد
                      </button>
                      <button
                        onClick={() => handleRegenerate(selectedDraft.id)}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                      >
                        🔄 إعادة توليد
                      </button>
                    </div>
                  )}
                  
                  {selectedDraft.status === 'approved' && (
                    <div className="text-center py-4 bg-green-50 rounded-xl text-green-700 font-medium">
                      ✅ تم اعتماد هذا المحتوى
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-2">👈</div>
                  <p>اختر مسودة لمعاينة المحتوى</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
