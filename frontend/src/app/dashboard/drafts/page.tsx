'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PageTransition, FadeIn, StaggerContainer, StaggerItem, ScaleHover } from '@/components/ui/motion';
import { PenTool, Calendar, FileText, Bot, Edit3, CheckCircle, XCircle, Loader2, Eye, Layers } from 'lucide-react';

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

const statusConfig: Record<string, { label: string; color: string; icon: typeof PenTool }> = {
  draft: { label: 'مسودة', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300', icon: PenTool },
  generated: { label: 'تم التوليد', color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400', icon: Bot },
  edited: { label: 'تم التعديل', color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400', icon: Edit3 },
  approved: { label: 'معتمد', color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400', icon: CheckCircle },
  rejected: { label: 'مرفوض', color: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400', icon: XCircle },
};

export default function DraftsPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [axisDrafts, setAxisDrafts] = useState<AxisDraft[]>([]);
  const [itemDrafts, setItemDrafts] = useState<ItemDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'axes' | 'items'>('axes');

  useEffect(() => { loadPeriods(); }, []);
  useEffect(() => { if (selectedPeriod) loadDrafts(); }, [selectedPeriod, view]);

  async function loadPeriods() {
    try {
      const data = await api.data.periods.list();
      const list = data.results || data || [];
      setPeriods(list);
      if (list.length > 0) setSelectedPeriod(list[0].id);
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
                <PenTool className="w-7 h-7 text-purple-600" />
                <span>المسودات</span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">عرض وتعديل المحتوى المولّد</p>
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
            <div className="flex gap-2">
              <button onClick={() => setView('axes')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${view === 'axes' ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                <Layers className="w-4 h-4" /> المحاور
              </button>
              <button onClick={() => setView('items')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${view === 'items' ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
                <FileText className="w-4 h-4" /> البنود
              </button>
            </div>
          </div>
        </FadeIn>

        {!selectedPeriod ? (
          <FadeIn delay={0.2}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">اختر فترة</h3>
              <p className="text-gray-500 dark:text-gray-400">اختر فترة جمع لعرض المسودات</p>
            </div>
          </FadeIn>
        ) : view === 'axes' ? (
          <FadeIn delay={0.2}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                <span>مسودات المحاور</span>
                <span className="text-sm font-normal bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-lg">{axisDrafts.length}</span>
              </h2>
              {axisDrafts.length === 0 ? (
                <div className="text-center py-8">
                  <Layers className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">لا توجد مسودات محاور</p>
                </div>
              ) : (
                <StaggerContainer className="space-y-3">
                  {axisDrafts.map((draft) => {
                    const config = statusConfig[draft.status] || statusConfig.draft;
                    const StatusIcon = config.icon;
                    return (
                      <StaggerItem key={draft.id}>
                        <ScaleHover scale={1.01}>
                          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between hover:border-purple-300 dark:hover:border-purple-700 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold">{draft.axis_code}</div>
                              <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">{draft.axis_name}</h3>
                                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                  <span>{draft.word_count} كلمة</span>
                                  {draft.model_used && <span className="flex items-center gap-1"><Bot className="w-3 h-3" /> {draft.model_used}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.color}`}>
                                <StatusIcon className="w-3 h-3" /> {config.label}
                              </span>
                              <button className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/50 rounded-lg"><Eye className="w-5 h-5" /></button>
                            </div>
                          </div>
                        </ScaleHover>
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>
              )}
            </div>
          </FadeIn>
        ) : (
          <FadeIn delay={0.2}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                <span>مسودات البنود</span>
                <span className="text-sm font-normal bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-lg">{itemDrafts.length}</span>
              </h2>
              {itemDrafts.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">لا توجد مسودات بنود</p>
                </div>
              ) : (
                <StaggerContainer className="space-y-3">
                  {itemDrafts.map((draft) => {
                    const config = statusConfig[draft.status] || statusConfig.draft;
                    const StatusIcon = config.icon;
                    return (
                      <StaggerItem key={draft.id}>
                        <ScaleHover scale={1.01}>
                          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between hover:border-purple-300 dark:hover:border-purple-700 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/50 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">{draft.item_code} - {draft.item_name}</h3>
                                <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                  <span>{draft.axis_name}</span>
                                  <span>{draft.word_count} كلمة</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.color}`}>
                                <StatusIcon className="w-3 h-3" /> {config.label}
                              </span>
                              <button className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/50 rounded-lg"><Eye className="w-5 h-5" /></button>
                            </div>
                          </div>
                        </ScaleHover>
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>
              )}
            </div>
          </FadeIn>
        )}
      </div>
    </PageTransition>
  );
}
