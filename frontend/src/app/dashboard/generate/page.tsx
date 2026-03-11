'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import OutputConfigModal from '@/components/OutputConfigModal';
import { PageTransition, FadeIn, StaggerContainer, StaggerItem, ScaleHover } from '@/components/ui/motion';
import {
  BarChart3, Sparkles, Download, CheckCircle, Clock, Settings2, RefreshCw,
  Check, X, Loader2, FileText, ChevronDown, Edit3, RotateCcw, Save,
  Rocket, ListChecks, Layers, Square, CheckSquare,
} from 'lucide-react';

interface AxisDraft {
  id: string;
  axis: number;
  axis_code: string;
  axis_name: string;
  axis_order: number;
  period: number;
  period_name: string;
  academic_year: string;
  content: string;
  status: 'not_started' | 'generating' | 'generated' | 'edited' | 'approved';
  version: number;
  can_generate: boolean;
  is_data_changed: boolean;
  items_count: number;
  items_with_data: number;
  ai_model: string;
  ai_tokens_input: number;
  ai_tokens_output: number;
  ai_cost: number;
  generation_time_ms: number;
  generated_at: string | null;
  edited_at: string | null;
  approved_at: string | null;
}

interface ItemDraft {
  id: string;
  item: number;
  item_code: string;
  item_name: string;
  item_unit: string;
  axis_id: number;
  axis_code: string;
  axis_name: string;
  period: number;
  content: string;
  current_value: any;
  previous_value: any;
  change_percentage: number | null;
  status: 'not_started' | 'generating' | 'generated' | 'edited' | 'approved';
  version: number;
  ai_model: string;
  ai_tokens_output: number;
  generation_time_ms: number;
  generated_at: string | null;
}

interface AxisWithItems {
  axis_id: number;
  axis_code: string;
  axis_name: string;
  total_items: number;
  generated_items: number;
  drafts: ItemDraft[];
}

interface GenerationStatus {
  total_axes: number;
  generated: number;
  approved: number;
  not_started: number;
  progress_percentage: number;
  is_complete: boolean;
  is_approved: boolean;
}

interface Period {
  id: number;
  name: string;
  academic_year: string;
}

const statusConfig = {
  not_started: { label: 'لم يبدأ', color: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400', icon: Clock },
  generating: { label: 'جاري التوليد', color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400', icon: Settings2 },
  generated: { label: 'تم التوليد', color: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400', icon: CheckCircle },
  edited: { label: 'معدّل', color: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400', icon: Edit3 },
  approved: { label: 'معتمد', color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400', icon: Check },
};

export default function GeneratePage() {
  const searchParams = useSearchParams();
  const periodId = searchParams.get('period_id');
  
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(periodId ? parseInt(periodId) : null);
  const [drafts, setDrafts] = useState<AxisDraft[]>([]);
  const [itemAxes, setItemAxes] = useState<AxisWithItems[]>([]);
  const [genStatus, setGenStatus] = useState<GenerationStatus | null>(null);
  const [selectedAxes, setSelectedAxes] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportOptions, setExportOptions] = useState({ includeItems: true, includeCharts: true, includeTables: true, approvedOnly: false });
  const [model, setModel] = useState<'gemini' | 'claude' | 'cli'>('cli');
  const [viewMode, setViewMode] = useState<'axes' | 'items'>('axes');
  const [error, setError] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<AxisDraft | null>(null);
  const [editContent, setEditContent] = useState('');
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configItem, setConfigItem] = useState<{id: string; code: string; name: string} | null>(null);

  useEffect(() => { loadPeriods(); }, []);
  useEffect(() => {
    if (selectedPeriod) {
      if (viewMode === 'axes') loadDrafts(selectedPeriod);
      else loadItemDrafts(selectedPeriod);
    }
  }, [selectedPeriod, viewMode]);

  const loadPeriods = async () => {
    try {
      const data = await api.data.periods.list();
      const periodsArray = Array.isArray(data) ? data : (data?.results || []);
      setPeriods(periodsArray);
      if (!selectedPeriod && periodsArray.length > 0) {
        const openPeriod = periodsArray.find((p: any) => p.status === 'open');
        setSelectedPeriod(openPeriod?.id || periodsArray[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const loadDrafts = async (periodId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.generation.getDrafts(periodId);
      setDrafts(data.drafts || []);
      setGenStatus(data.generation_status);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadItemDrafts = async (periodId: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.generation.getItemDrafts(periodId);
      setItemAxes(data.axes || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedAxes.size === drafts.length) setSelectedAxes(new Set());
    else setSelectedAxes(new Set(drafts.map(d => d.id)));
  };

  const handleSelectAxis = (id: string) => {
    const newSelected = new Set(selectedAxes);
    if (newSelected.has(id)) newSelected.delete(id);
    else newSelected.add(id);
    setSelectedAxes(newSelected);
  };

  const handleGenerate = async (axisIds?: number[]) => {
    if (!selectedPeriod) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await api.generation.generate({ period_id: selectedPeriod, axes: axisIds, model, regenerate: false });
      await loadDrafts(selectedPeriod);
      setSelectedAxes(new Set());
      if (result.errors?.length > 0) setError(`تم توليد ${result.drafts?.length || 0} محاور. أخطاء: ${result.errors.map((e: any) => e.axis_name).join(', ')}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateSelected = () => { const axisIds = drafts.filter(d => selectedAxes.has(d.id)).map(d => d.axis); handleGenerate(axisIds); };
  const handleGenerateAll = () => { handleGenerate(); };
  const handleRegenerate = async (draft: AxisDraft) => { setGenerating(true); try { await api.generation.axisDrafts.regenerate(draft.id, model); await loadDrafts(selectedPeriod!); } catch (err: any) { setError(err.message); } finally { setGenerating(false); } };
  const handleApprove = async (draft: AxisDraft) => { try { await api.generation.axisDrafts.approve(draft.id); await loadDrafts(selectedPeriod!); } catch (err: any) { setError(err.message); } };
  const handleApproveAll = async () => { const toApprove = drafts.filter(d => d.status === 'generated' || d.status === 'edited'); for (const draft of toApprove) await api.generation.axisDrafts.approve(draft.id); await loadDrafts(selectedPeriod!); };
  const handleExport = async () => { if (!selectedPeriod) return; setExporting(true); setShowExportOptions(false); try { await api.generation.export.download(selectedPeriod, { format: 'docx', ...exportOptions }); } catch (err: any) { setError(err.message || 'فشل في تصدير التقرير'); } finally { setExporting(false); } };
  const handleEdit = (draft: AxisDraft) => { setEditingDraft(draft); setEditContent(draft.content); };
  const handleSaveEdit = async () => { if (!editingDraft) return; try { await api.generation.axisDrafts.update(editingDraft.id, { content: editContent }); await loadDrafts(selectedPeriod!); setEditingDraft(null); } catch (err: any) { setError(err.message); } };
  const handleRevert = async (draft: AxisDraft) => { try { await api.generation.axisDrafts.revert(draft.id); await loadDrafts(selectedPeriod!); } catch (err: any) { setError(err.message); } };

  const handleSelectItem = (id: string) => { const newSelected = new Set(selectedItems); if (newSelected.has(id)) newSelected.delete(id); else newSelected.add(id); setSelectedItems(newSelected); };
  const handleSelectAllItems = (axisId: number) => { const axis = itemAxes.find(a => a.axis_id === axisId); if (!axis) return; const axisItemIds = axis.drafts.map(d => d.id); const allSelected = axisItemIds.every(id => selectedItems.has(id)); const newSelected = new Set(selectedItems); if (allSelected) axisItemIds.forEach(id => newSelected.delete(id)); else axisItemIds.forEach(id => newSelected.add(id)); setSelectedItems(newSelected); };
  const handleGenerateItems = async (itemIds?: number[], axisId?: number) => { if (!selectedPeriod) return; setGenerating(true); setError(null); try { const result = await api.generation.generateItems({ period_id: selectedPeriod, items: itemIds, axis_id: axisId, model, regenerate: false }); await loadItemDrafts(selectedPeriod); setSelectedItems(new Set()); if (result.errors?.length > 0) setError(`تم توليد ${result.drafts?.length || 0} بند. أخطاء: ${result.errors.length}`); } catch (err: any) { setError(err.message); } finally { setGenerating(false); } };
  const handleGenerateSelectedItems = () => { const itemIds: number[] = []; itemAxes.forEach(axis => { axis.drafts.forEach(draft => { if (selectedItems.has(draft.id)) itemIds.push(draft.item); }); }); handleGenerateItems(itemIds); };
  const handleGenerateAxisItems = (axisId: number) => { handleGenerateItems(undefined, axisId); };
  const handleRegenerateItem = async (draft: ItemDraft) => { setGenerating(true); try { await api.generation.itemDrafts.regenerate(draft.id, model); await loadItemDrafts(selectedPeriod!); } catch (err: any) { setError(err.message); } finally { setGenerating(false); } };
  const handleApproveItem = async (draft: ItemDraft) => { try { await api.generation.itemDrafts.approve(draft.id); await loadItemDrafts(selectedPeriod!); } catch (err: any) { setError(err.message); } };
  const openOutputConfig = (draft: ItemDraft) => { setConfigItem({ id: draft.id, code: draft.item_code, name: draft.item_name }); setConfigModalOpen(true); };

  const canGenerateSelected = selectedAxes.size > 0 && !generating;
  const canApproveAll = drafts.some(d => d.status === 'generated' || d.status === 'edited');

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Sparkles className="w-7 h-7 text-purple-600" />
                <span>توليد التقرير</span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                اختر المحاور التي تريد توليدها باستخدام الذكاء الاصطناعي
              </p>
            </div>
          </div>
        </FadeIn>

        {/* Period Selector */}
        <FadeIn delay={0.1}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">فترة الجمع</label>
                <select value={selectedPeriod || ''} onChange={(e) => setSelectedPeriod(parseInt(e.target.value))} className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <option value="">اختر فترة...</option>
                  {periods.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.academic_year})</option>)}
                </select>
              </div>
              <div className="min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نموذج AI</label>
                <select value={model} onChange={(e) => setModel(e.target.value as any)} className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <option value="cli">Claude CLI</option>
                  <option value="gemini">Gemini</option>
                  <option value="claude">Claude API</option>
                </select>
              </div>
              <div className="min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">مستوى التوليد</label>
                <select value={viewMode} onChange={(e) => setViewMode(e.target.value as any)} className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <option value="axes">محاور</option>
                  <option value="items">بنود</option>
                </select>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Error */}
        {error && (
          <FadeIn>
            <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
          </FadeIn>
        )}

        {/* Generation Status */}
        {genStatus && (
          <FadeIn delay={0.2}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  حالة التوليد
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">{genStatus.generated}/{genStatus.total_axes} محاور</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-3">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all" style={{ width: `${genStatus.progress_percentage}%` }} />
              </div>
              <div className="flex gap-6 text-sm">
                <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1.5"><Clock className="w-4 h-4" /> لم يبدأ: {genStatus.not_started}</span>
                <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1.5"><CheckCircle className="w-4 h-4" /> تم التوليد: {genStatus.generated - genStatus.approved}</span>
                <span className="text-green-600 dark:text-green-400 flex items-center gap-1.5"><Check className="w-4 h-4" /> معتمد: {genStatus.approved}</span>
              </div>
            </div>
          </FadeIn>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">جاري التحميل...</p>
            </div>
          </div>
        )}

        {/* Axes Mode */}
        {!loading && selectedPeriod && viewMode === 'axes' && (
          <>
            {/* Actions Bar */}
            <FadeIn delay={0.3}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-wrap items-center gap-3">
                <button onClick={handleSelectAll} className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800">
                  {selectedAxes.size === drafts.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  {selectedAxes.size === drafts.length ? 'إلغاء التحديد' : 'تحديد الكل'}
                </button>
                <div className="flex-1" />
                <span className="text-sm text-gray-500 dark:text-gray-400">المحدد: {selectedAxes.size} محاور</span>
                <button onClick={handleGenerateSelected} disabled={!canGenerateSelected} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white ${canGenerateSelected ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'}`}>
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  {generating ? 'جاري التوليد...' : 'توليد المحددة'}
                </button>
                <button onClick={handleGenerateAll} disabled={generating} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white ${!generating ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'}`}>
                  <Sparkles className="w-4 h-4" />
                  توليد الكل
                </button>
                {canApproveAll && (
                  <button onClick={handleApproveAll} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700">
                    <ListChecks className="w-4 h-4" />
                    اعتماد الكل
                  </button>
                )}
                {genStatus && genStatus.generated > 0 && (
                  <div className="relative">
                    <button onClick={() => setShowExportOptions(!showExportOptions)} disabled={exporting} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white ${!exporting ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-300 dark:bg-gray-700'}`}>
                      {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      {exporting ? 'جاري التصدير...' : 'تصدير Word'}
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    {showExportOptions && (
                      <div className="absolute top-12 left-0 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50 w-72">
                        <h4 className="font-semibold mb-3 text-gray-800 dark:text-white">خيارات التصدير</h4>
                        <div className="space-y-3">
                          {[
                            { key: 'includeItems', label: 'تضمين البنود التفصيلية' },
                            { key: 'includeTables', label: 'تضمين الجداول' },
                            { key: 'includeCharts', label: 'تضمين الرسوم البيانية' },
                            { key: 'approvedOnly', label: 'المحتوى المعتمد فقط' },
                          ].map(opt => (
                            <label key={opt.key} className="flex items-center gap-2 cursor-pointer">
                              <input type="checkbox" checked={(exportOptions as any)[opt.key]} onChange={(e) => setExportOptions({...exportOptions, [opt.key]: e.target.checked})} className="w-4 h-4 rounded" />
                              <span className="text-gray-700 dark:text-gray-300">{opt.label}</span>
                            </label>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                          <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                            <Download className="w-4 h-4" /> تصدير
                          </button>
                          <button onClick={() => setShowExportOptions(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">إلغاء</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </FadeIn>

            {/* Axes Drafts */}
            <StaggerContainer className="space-y-3">
              {drafts.map((draft) => {
                const config = statusConfig[draft.status];
                const StatusIcon = config.icon;
                const isSelected = selectedAxes.has(draft.id);
                return (
                  <StaggerItem key={draft.id}>
                    <ScaleHover scale={1.005}>
                      <div className={`bg-white dark:bg-gray-900 rounded-2xl border-2 p-5 transition-colors ${isSelected ? 'border-blue-500' : 'border-gray-100 dark:border-gray-800'}`}>
                        <div className="flex items-start gap-4">
                          <input type="checkbox" checked={isSelected} onChange={() => handleSelectAxis(draft.id)} className="mt-1 w-5 h-5 rounded cursor-pointer accent-blue-600" />
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{draft.axis_code}. {draft.axis_name}</h3>
                              <span className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                                <StatusIcon className="w-3.5 h-3.5" /> {config.label}
                              </span>
                              {draft.version > 1 && <span className="text-xs text-gray-500 dark:text-gray-400">v{draft.version}</span>}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                              <p>البنود: {draft.items_count} مؤشر</p>
                              {draft.generated_at && <p>آخر توليد: {new Date(draft.generated_at).toLocaleDateString('ar')}</p>}
                              {draft.ai_model && <p className="text-xs text-gray-400">{draft.ai_model} • {draft.ai_tokens_output} tokens • {draft.generation_time_ms}ms</p>}
                            </div>
                            {draft.content && <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm text-gray-700 dark:text-gray-300 max-h-32 overflow-hidden">{draft.content.substring(0, 300)}...</div>}
                          </div>
                          <div className="flex flex-col gap-2">
                            {draft.status === 'not_started' && <button onClick={() => handleGenerate([draft.axis])} disabled={generating} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"><Rocket className="w-4 h-4" /> توليد</button>}
                            {(draft.status === 'generated' || draft.status === 'edited') && (
                              <>
                                <button onClick={() => handleEdit(draft)} className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"><Edit3 className="w-4 h-4" /> تعديل</button>
                                <button onClick={() => handleApprove(draft)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"><Check className="w-4 h-4" /> اعتماد</button>
                              </>
                            )}
                            {draft.status !== 'not_started' && draft.status !== 'generating' && <button onClick={() => handleRegenerate(draft)} disabled={generating} className="flex items-center gap-2 px-3 py-1.5 text-sm border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 disabled:opacity-50"><RefreshCw className="w-4 h-4" /> إعادة</button>}
                            {draft.status === 'approved' && <span className="flex items-center gap-2 px-3 py-1.5 text-sm text-green-600 dark:text-green-400 font-medium"><Check className="w-4 h-4" /> معتمد</span>}
                          </div>
                        </div>
                      </div>
                    </ScaleHover>
                  </StaggerItem>
                );
              })}
            </StaggerContainer>
          </>
        )}

        {/* Items Mode */}
        {!loading && selectedPeriod && viewMode === 'items' && (
          <>
            <FadeIn delay={0.3}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 flex flex-wrap items-center gap-3">
                <span className="text-sm text-gray-500 dark:text-gray-400">المحدد: {selectedItems.size} بند</span>
                <div className="flex-1" />
                <button onClick={handleGenerateSelectedItems} disabled={selectedItems.size === 0 || generating} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-white ${selectedItems.size > 0 && !generating ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'}`}>
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                  {generating ? 'جاري التوليد...' : 'توليد المحددة'}
                </button>
              </div>
            </FadeIn>

            <StaggerContainer className="space-y-6">
              {itemAxes.map((axis) => (
                <StaggerItem key={axis.axis_id}>
                  <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-800 p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">{axis.axis_code}. {axis.axis_name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{axis.generated_items}/{axis.total_items} بند تم توليده</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleSelectAllItems(axis.axis_id)} className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-white dark:hover:bg-gray-900">تحديد الكل</button>
                        <button onClick={() => handleGenerateAxisItems(axis.axis_id)} disabled={generating} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"><Sparkles className="w-4 h-4" /> توليد كل البنود</button>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                      {axis.drafts.map((draft) => {
                        const config = statusConfig[draft.status];
                        const StatusIcon = config.icon;
                        const isSelected = selectedItems.has(draft.id);
                        return (
                          <div key={draft.id} className={`p-4 flex items-start gap-4 ${isSelected ? 'bg-blue-50 dark:bg-blue-950/30' : ''}`}>
                            <input type="checkbox" checked={isSelected} onChange={() => handleSelectItem(draft.id)} className="mt-1 w-4 h-4 rounded cursor-pointer accent-blue-600" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-blue-600 dark:text-blue-400">{draft.item_code}</span>
                                <span className="text-gray-900 dark:text-white">{draft.item_name}</span>
                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.color}`}><StatusIcon className="w-3 h-3" /> {config.label}</span>
                              </div>
                              {draft.current_value !== null && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  القيمة: <span className="font-medium">{draft.current_value}</span>
                                  {draft.item_unit && ` ${draft.item_unit}`}
                                  {draft.change_percentage !== null && <span className={draft.change_percentage >= 0 ? 'text-green-600' : 'text-red-600'}> ({draft.change_percentage >= 0 ? '+' : ''}{draft.change_percentage}%)</span>}
                                </p>
                              )}
                              {draft.content && <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{draft.content}</p>}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => openOutputConfig(draft)} className="p-2 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" title="إعدادات المخرجات"><Settings2 className="w-4 h-4" /></button>
                              {draft.status === 'not_started' && <button onClick={() => handleGenerateItems([draft.item])} disabled={generating} className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300"><Rocket className="w-4 h-4" /></button>}
                              {(draft.status === 'generated' || draft.status === 'edited') && <button onClick={() => handleApproveItem(draft)} className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"><Check className="w-4 h-4" /></button>}
                              {draft.status !== 'not_started' && draft.status !== 'generating' && <button onClick={() => handleRegenerateItem(draft)} disabled={generating} className="p-2 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 disabled:opacity-50"><RefreshCw className="w-4 h-4" /></button>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </StaggerItem>
              ))}
            </StaggerContainer>
          </>
        )}

        {/* Edit Modal */}
        {editingDraft && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <FadeIn className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2"><Edit3 className="w-5 h-5 text-blue-600" /> تعديل: {editingDraft.axis_code}. {editingDraft.axis_name}</h2>
                <button onClick={() => setEditingDraft(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X className="w-5 h-5 text-gray-500" /></button>
              </div>
              <div className="p-4"><textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full h-96 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-mono text-sm" dir="rtl" /></div>
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-between">
                <button onClick={() => handleRevert(editingDraft)} className="flex items-center gap-2 px-4 py-2 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-950/50 rounded-lg"><RotateCcw className="w-4 h-4" /> تراجع للنسخة السابقة</button>
                <div className="flex gap-3">
                  <button onClick={() => setEditingDraft(null)} className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">إلغاء</button>
                  <button onClick={handleSaveEdit} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Save className="w-4 h-4" /> حفظ التعديلات</button>
                </div>
              </div>
            </FadeIn>
          </div>
        )}

        {/* Output Config Modal */}
        {configItem && <OutputConfigModal isOpen={configModalOpen} onClose={() => { setConfigModalOpen(false); setConfigItem(null); }} itemDraftId={configItem.id} itemCode={configItem.code} itemName={configItem.name} onSave={() => { if (selectedPeriod) loadItemDrafts(selectedPeriod); }} />}

        {/* Empty State */}
        {!loading && !selectedPeriod && (
          <FadeIn>
            <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
              <FileText className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">اختر فترة جمع</h3>
              <p className="text-gray-500 dark:text-gray-400">اختر فترة جمع للبدء بتوليد التقرير</p>
            </div>
          </FadeIn>
        )}
      </div>
    </PageTransition>
  );
}
