'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { PageTransition, FadeIn, StaggerContainer, StaggerItem, ScaleHover } from '@/components/ui/motion';
import { CheckCircle, FileText, Clock, XCircle, Calendar, Filter, Check, X, Eye, Edit3, Loader2, PenTool, Bot } from 'lucide-react';

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

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: 'مسودة', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300', icon: PenTool },
  pending: { label: 'قيد المراجعة', color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400', icon: Clock },
  approved: { label: 'معتمد', color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400', icon: CheckCircle },
  rejected: { label: 'مرفوض', color: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400', icon: XCircle },
};

export default function ContentReviewPage() {
  const [drafts, setDrafts] = useState<ItemDraft[]>([]);
  const [allDrafts, setAllDrafts] = useState<ItemDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('draft');
  const [selectedDraft, setSelectedDraft] = useState<ItemDraft | null>(null);
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);

  useEffect(() => { loadPeriods(); }, []);
  useEffect(() => { if (selectedPeriod) loadDrafts(selectedPeriod); }, [selectedPeriod]);
  useEffect(() => {
    if (filter === 'all') setDrafts(allDrafts);
    else setDrafts(allDrafts.filter(d => d.status === filter));
  }, [filter, allDrafts]);

  async function loadPeriods() {
    try {
      const data = await api.data.periods.list();
      const periodList = data.results || data || [];
      setPeriods(periodList);
      if (periodList.length > 0) setSelectedPeriod(periodList[0].id);
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
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  }

  async function handleReject(id: string) {
    const notes = prompt('سبب الرفض:');
    if (!notes) return;
    try {
      // Use update with rejected status or just log for now
      await api.generation.itemDrafts.update(id, { content: `[مرفوض: ${notes}]` });
      if (selectedPeriod) loadDrafts(selectedPeriod);
    } catch (error) {
      console.error('Failed to reject:', error);
    }
  }

  const pendingCount = allDrafts.filter(d => d.status === 'draft' || d.status === 'pending').length;

  if (loading && periods.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <CheckCircle className="w-7 h-7 text-green-600" />
                <span>مراجعة المحتوى</span>
                {pendingCount > 0 && (
                  <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400 rounded-full text-sm">{pendingCount} للمراجعة</span>
                )}
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">مراجعة واعتماد المحتوى المولّد بالذكاء الاصطناعي</p>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <select value={selectedPeriod || ''} onChange={(e) => setSelectedPeriod(parseInt(e.target.value))} className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                <option value="">اختر فترة...</option>
                {periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <Filter className="w-5 h-5 text-gray-400" />
            {['draft', 'approved', 'rejected', 'all'].map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === f ? 'bg-green-600 text-white shadow-lg shadow-green-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                {f === 'draft' ? 'للمراجعة' : f === 'approved' ? 'معتمد' : f === 'rejected' ? 'مرفوض' : 'الكل'}
              </button>
            ))}
          </div>
        </FadeIn>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : drafts.length === 0 ? (
          <FadeIn delay={0.2}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">لا توجد مسودات</h3>
              <p className="text-gray-500 dark:text-gray-400">{filter === 'draft' ? 'لا توجد مسودات للمراجعة' : 'لا توجد مسودات بهذه الحالة'}</p>
            </div>
          </FadeIn>
        ) : (
          <FadeIn delay={0.2}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500 dark:text-gray-400">{drafts.length} مسودة</span>
              </div>
              <StaggerContainer className="divide-y divide-gray-100 dark:divide-gray-800">
                {drafts.map((draft) => {
                  const config = statusConfig[draft.status] || statusConfig.draft;
                  const StatusIcon = config.icon;
                  return (
                    <StaggerItem key={draft.id}>
                      <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/50 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-medium text-blue-600 dark:text-blue-400">{draft.item_code}</span>
                              <span className="font-semibold text-gray-900 dark:text-white">{draft.item_name}</span>
                              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.color}`}>
                                <StatusIcon className="w-3 h-3" /> {config.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-2">
                              <span>{draft.axis_name}</span>
                              <span>{draft.word_count} كلمة</span>
                              {draft.model_used && <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> {draft.model_used}</span>}
                            </div>
                            {draft.content && (
                              <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{draft.content}</p>
                            )}
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => setSelectedDraft(draft)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg"><Eye className="w-4 h-4" /></button>
                            {(draft.status === 'draft' || draft.status === 'pending') && (
                              <>
                                <button onClick={() => handleApprove(draft.id)} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/50 rounded-lg"><Check className="w-4 h-4" /></button>
                                <button onClick={() => handleReject(draft.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 rounded-lg"><X className="w-4 h-4" /></button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            </div>
          </FadeIn>
        )}

        {selectedDraft && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <FadeIn className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedDraft.item_code} - {selectedDraft.item_name}</h2>
                <button onClick={() => setSelectedDraft(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                <div className="prose dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{selectedDraft.content}</p>
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                <button onClick={() => setSelectedDraft(null)} className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl">إغلاق</button>
                {(selectedDraft.status === 'draft' || selectedDraft.status === 'pending') && (
                  <>
                    <button onClick={() => { handleReject(selectedDraft.id); setSelectedDraft(null); }} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl"><X className="w-4 h-4" /> رفض</button>
                    <button onClick={() => { handleApprove(selectedDraft.id); setSelectedDraft(null); }} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl"><Check className="w-4 h-4" /> اعتماد</button>
                  </>
                )}
              </div>
            </FadeIn>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
