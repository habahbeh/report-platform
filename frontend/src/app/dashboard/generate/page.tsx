'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import OutputConfigModal from '@/components/OutputConfigModal';

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
  not_started: { label: 'لم يبدأ', color: 'bg-gray-100 text-gray-600', icon: '⏳' },
  generating: { label: 'جاري التوليد', color: 'bg-yellow-100 text-yellow-700', icon: '⚙️' },
  generated: { label: 'تم التوليد', color: 'bg-blue-100 text-blue-700', icon: '✅' },
  edited: { label: 'معدّل', color: 'bg-purple-100 text-purple-700', icon: '📝' },
  approved: { label: 'معتمد', color: 'bg-green-100 text-green-700', icon: '✔️' },
};

export default function GeneratePage() {
  const searchParams = useSearchParams();
  const periodId = searchParams.get('period_id');
  
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(
    periodId ? parseInt(periodId) : null
  );
  const [drafts, setDrafts] = useState<AxisDraft[]>([]);
  const [itemAxes, setItemAxes] = useState<AxisWithItems[]>([]);
  const [genStatus, setGenStatus] = useState<GenerationStatus | null>(null);
  const [selectedAxes, setSelectedAxes] = useState<Set<string>>(new Set());
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeItems: true,
    includeCharts: true,
    includeTables: true,
    approvedOnly: false,
  });
  const [model, setModel] = useState<'gemini' | 'claude' | 'cli'>('cli');
  const [viewMode, setViewMode] = useState<'axes' | 'items'>('axes');
  const [error, setError] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<AxisDraft | null>(null);
  const [editContent, setEditContent] = useState('');
  
  // Output Config Modal
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configItem, setConfigItem] = useState<{id: string; code: string; name: string} | null>(null);

  // تحميل الفترات
  useEffect(() => {
    loadPeriods();
  }, []);

  // تحميل المسودات عند اختيار فترة أو تغيير viewMode
  useEffect(() => {
    if (selectedPeriod) {
      if (viewMode === 'axes') {
        loadDrafts(selectedPeriod);
      } else {
        loadItemDrafts(selectedPeriod);
      }
    }
  }, [selectedPeriod, viewMode]);

  const loadPeriods = async () => {
    try {
      const data = await api.data.periods.list();
      // التحقق أن البيانات array
      const periodsArray = Array.isArray(data) ? data : (data?.results || []);
      setPeriods(periodsArray);
      if (!selectedPeriod && periodsArray.length > 0) {
        // اختيار أول فترة مفتوحة
        const openPeriod = periodsArray.find((p: any) => p.status === 'open');
        setSelectedPeriod(openPeriod?.id || periodsArray[0].id);
      }
    } catch (err: any) {
      console.error('Error loading periods:', err);
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
    if (selectedAxes.size === drafts.length) {
      setSelectedAxes(new Set());
    } else {
      setSelectedAxes(new Set(drafts.map(d => d.id)));
    }
  };

  const handleSelectAxis = (id: string) => {
    const newSelected = new Set(selectedAxes);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedAxes(newSelected);
  };

  const handleGenerate = async (axisIds?: number[]) => {
    if (!selectedPeriod) return;
    
    setGenerating(true);
    setError(null);
    
    try {
      const result = await api.generation.generate({
        period_id: selectedPeriod,
        axes: axisIds,
        model,
        regenerate: false,
      });
      
      // إعادة تحميل المسودات
      await loadDrafts(selectedPeriod);
      setSelectedAxes(new Set());
      
      if (result.errors?.length > 0) {
        setError(`تم توليد ${result.drafts?.length || 0} محاور. أخطاء: ${result.errors.map((e: any) => e.axis_name).join(', ')}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateSelected = () => {
    const axisIds = drafts
      .filter(d => selectedAxes.has(d.id))
      .map(d => d.axis);
    handleGenerate(axisIds);
  };

  const handleGenerateAll = () => {
    handleGenerate();
  };

  const handleRegenerate = async (draft: AxisDraft) => {
    setGenerating(true);
    try {
      await api.generation.axisDrafts.regenerate(draft.id, model);
      await loadDrafts(selectedPeriod!);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (draft: AxisDraft) => {
    try {
      await api.generation.axisDrafts.approve(draft.id);
      await loadDrafts(selectedPeriod!);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleApproveAll = async () => {
    const toApprove = drafts.filter(d => d.status === 'generated' || d.status === 'edited');
    for (const draft of toApprove) {
      await api.generation.axisDrafts.approve(draft.id);
    }
    await loadDrafts(selectedPeriod!);
  };

  const handleExport = async () => {
    if (!selectedPeriod) return;
    
    setExporting(true);
    setShowExportOptions(false);
    try {
      await api.generation.export.download(selectedPeriod, {
        format: 'docx',
        includeItems: exportOptions.includeItems,
        includeCharts: exportOptions.includeCharts,
        includeTables: exportOptions.includeTables,
        approvedOnly: exportOptions.approvedOnly,
      });
    } catch (err: any) {
      setError(err.message || 'فشل في تصدير التقرير');
    } finally {
      setExporting(false);
    }
  };

  const handleEdit = (draft: AxisDraft) => {
    setEditingDraft(draft);
    setEditContent(draft.content);
  };

  const handleSaveEdit = async () => {
    if (!editingDraft) return;
    
    try {
      await api.generation.axisDrafts.update(editingDraft.id, {
        content: editContent,
      });
      await loadDrafts(selectedPeriod!);
      setEditingDraft(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleRevert = async (draft: AxisDraft) => {
    try {
      await api.generation.axisDrafts.revert(draft.id);
      await loadDrafts(selectedPeriod!);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // === Item Functions ===
  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAllItems = (axisId: number) => {
    const axis = itemAxes.find(a => a.axis_id === axisId);
    if (!axis) return;
    
    const axisItemIds = axis.drafts.map(d => d.id);
    const allSelected = axisItemIds.every(id => selectedItems.has(id));
    
    const newSelected = new Set(selectedItems);
    if (allSelected) {
      axisItemIds.forEach(id => newSelected.delete(id));
    } else {
      axisItemIds.forEach(id => newSelected.add(id));
    }
    setSelectedItems(newSelected);
  };

  const handleGenerateItems = async (itemIds?: number[], axisId?: number) => {
    if (!selectedPeriod) return;
    
    setGenerating(true);
    setError(null);
    
    try {
      const result = await api.generation.generateItems({
        period_id: selectedPeriod,
        items: itemIds,
        axis_id: axisId,
        model,
        regenerate: false,
      });
      
      await loadItemDrafts(selectedPeriod);
      setSelectedItems(new Set());
      
      if (result.errors?.length > 0) {
        setError(`تم توليد ${result.drafts?.length || 0} بند. أخطاء: ${result.errors.length}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateSelectedItems = () => {
    const itemIds: number[] = [];
    itemAxes.forEach(axis => {
      axis.drafts.forEach(draft => {
        if (selectedItems.has(draft.id)) {
          itemIds.push(draft.item);
        }
      });
    });
    handleGenerateItems(itemIds);
  };

  const handleGenerateAxisItems = (axisId: number) => {
    handleGenerateItems(undefined, axisId);
  };

  const handleRegenerateItem = async (draft: ItemDraft) => {
    setGenerating(true);
    try {
      await api.generation.itemDrafts.regenerate(draft.id, model);
      await loadItemDrafts(selectedPeriod!);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveItem = async (draft: ItemDraft) => {
    try {
      await api.generation.itemDrafts.approve(draft.id);
      await loadItemDrafts(selectedPeriod!);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openOutputConfig = (draft: ItemDraft) => {
    setConfigItem({
      id: draft.id,
      code: draft.item_code,
      name: draft.item_name,
    });
    setConfigModalOpen(true);
  };

  const canGenerateSelected = selectedAxes.size > 0 && !generating;
  const canApproveAll = drafts.some(d => d.status === 'generated' || d.status === 'edited');

  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          📊 توليد التقرير
        </h1>
        <p className="text-gray-600">
          اختر المحاور التي تريد توليدها. يمكنك توليد محور واحد أو عدة محاور أو الكل.
        </p>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              فترة الجمع
            </label>
            <select
              value={selectedPeriod || ''}
              onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">اختر فترة...</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.academic_year})
                </option>
              ))}
            </select>
          </div>
          
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              نموذج AI
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as any)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="cli">Claude CLI (افتراضي)</option>
              <option value="gemini">Gemini (مجاني)</option>
              <option value="claude">Claude API</option>
            </select>
          </div>
          
          <div className="min-w-[150px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              مستوى التوليد
            </label>
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as any)}
              className="w-full p-2 border rounded-lg"
            >
              <option value="axes">محاور</option>
              <option value="items">بنود</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-6">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-left text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Generation Status */}
      {genStatus && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">حالة التوليد</h3>
            <span className="text-sm text-gray-500">
              {genStatus.generated}/{genStatus.total_axes} محاور
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{ width: `${genStatus.progress_percentage}%` }}
            />
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-gray-600">
              ⏳ لم يبدأ: {genStatus.not_started}
            </span>
            <span className="text-blue-600">
              ✅ تم التوليد: {genStatus.generated - genStatus.approved}
            </span>
            <span className="text-green-600">
              ✔️ معتمد: {genStatus.approved}
            </span>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-spin text-4xl mb-4">⚙️</div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      )}

      {/* Drafts List - Axes Mode */}
      {!loading && selectedPeriod && viewMode === 'axes' && (
        <>
          {/* Actions Bar */}
          <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50"
            >
              {selectedAxes.size === drafts.length ? 'إلغاء التحديد' : 'تحديد الكل'}
            </button>
            
            <div className="flex-1" />
            
            <span className="text-sm text-gray-500">
              المحدد: {selectedAxes.size} محاور
            </span>
            
            <button
              onClick={handleGenerateSelected}
              disabled={!canGenerateSelected}
              className={`px-4 py-2 rounded-lg text-white ${
                canGenerateSelected
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {generating ? '⚙️ جاري التوليد...' : '🚀 توليد المحددة'}
            </button>
            
            <button
              onClick={handleGenerateAll}
              disabled={generating}
              className={`px-4 py-2 rounded-lg text-white ${
                !generating
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              توليد الكل
            </button>
            
            {canApproveAll && (
              <button
                onClick={handleApproveAll}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
              >
                ✔️ اعتماد الكل
              </button>
            )}
            
            {/* Export Button */}
            {genStatus && genStatus.generated > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowExportOptions(!showExportOptions)}
                  disabled={exporting}
                  className={`px-4 py-2 rounded-lg text-white ${
                    !exporting
                      ? 'bg-purple-600 hover:bg-purple-700'
                      : 'bg-gray-300 cursor-not-allowed'
                  }`}
                >
                  {exporting ? '⏳ جاري التصدير...' : '📥 تصدير Word ▾'}
                </button>
                
                {/* Export Options Dropdown */}
                {showExportOptions && (
                  <div className="absolute top-12 left-0 bg-white rounded-lg shadow-xl border p-4 z-50 w-72">
                    <h4 className="font-semibold mb-3 text-gray-800">خيارات التصدير</h4>
                    
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exportOptions.includeItems}
                          onChange={(e) => setExportOptions({...exportOptions, includeItems: e.target.checked})}
                          className="w-4 h-4 rounded"
                        />
                        <span>تضمين البنود التفصيلية</span>
                      </label>
                      
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exportOptions.includeTables}
                          onChange={(e) => setExportOptions({...exportOptions, includeTables: e.target.checked})}
                          className="w-4 h-4 rounded"
                        />
                        <span>📊 تضمين الجداول</span>
                      </label>
                      
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exportOptions.includeCharts}
                          onChange={(e) => setExportOptions({...exportOptions, includeCharts: e.target.checked})}
                          className="w-4 h-4 rounded"
                        />
                        <span>📈 تضمين الرسوم البيانية</span>
                      </label>
                      
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exportOptions.approvedOnly}
                          onChange={(e) => setExportOptions({...exportOptions, approvedOnly: e.target.checked})}
                          className="w-4 h-4 rounded"
                        />
                        <span>المحتوى المعتمد فقط</span>
                      </label>
                    </div>
                    
                    <div className="flex gap-2 mt-4 pt-3 border-t">
                      <button
                        onClick={handleExport}
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        📥 تصدير
                      </button>
                      <button
                        onClick={() => setShowExportOptions(false)}
                        className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Axes Drafts */}
          <div className="space-y-3">
            {drafts.map((draft) => {
              const config = statusConfig[draft.status];
              const isSelected = selectedAxes.has(draft.id);
              
              return (
                <div
                  key={draft.id}
                  className={`bg-white rounded-lg shadow p-4 border-2 transition-colors ${
                    isSelected ? 'border-blue-500' : 'border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleSelectAxis(draft.id)}
                      className="mt-1 w-5 h-5 rounded cursor-pointer"
                    />
                    
                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">
                          {draft.axis_code}. {draft.axis_name}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
                          {config.icon} {config.label}
                        </span>
                        {draft.version > 1 && (
                          <span className="text-xs text-gray-500">
                            v{draft.version}
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <p>البنود: {draft.items_count} مؤشر</p>
                        {draft.generated_at && (
                          <p>آخر توليد: {new Date(draft.generated_at).toLocaleDateString('ar')}</p>
                        )}
                        {draft.ai_model && (
                          <p className="text-xs text-gray-400">
                            {draft.ai_model} • {draft.ai_tokens_output} tokens • {draft.generation_time_ms}ms
                          </p>
                        )}
                      </div>
                      
                      {/* Preview */}
                      {draft.content && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 max-h-32 overflow-hidden">
                          {draft.content.substring(0, 300)}...
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      {draft.status === 'not_started' && (
                        <button
                          onClick={() => handleGenerate([draft.axis])}
                          disabled={generating}
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                        >
                          توليد
                        </button>
                      )}
                      
                      {(draft.status === 'generated' || draft.status === 'edited') && (
                        <>
                          <button
                            onClick={() => handleEdit(draft)}
                            className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
                          >
                            ✏️ تعديل
                          </button>
                          <button
                            onClick={() => handleApprove(draft)}
                            className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            ✔️ اعتماد
                          </button>
                        </>
                      )}
                      
                      {draft.status !== 'not_started' && draft.status !== 'generating' && (
                        <button
                          onClick={() => handleRegenerate(draft)}
                          disabled={generating}
                          className="px-3 py-1.5 text-sm border text-blue-600 rounded hover:bg-blue-50 disabled:text-gray-400"
                        >
                          🔄 إعادة
                        </button>
                      )}
                      
                      {draft.status === 'approved' && (
                        <span className="px-3 py-1.5 text-sm text-green-600 font-medium">
                          ✔️ معتمد
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Items List - Items Mode */}
      {!loading && selectedPeriod && viewMode === 'items' && (
        <>
          {/* Actions Bar */}
          <div className="bg-white rounded-lg shadow p-4 mb-4 flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-500">
              المحدد: {selectedItems.size} بند
            </span>
            
            <div className="flex-1" />
            
            <button
              onClick={handleGenerateSelectedItems}
              disabled={selectedItems.size === 0 || generating}
              className={`px-4 py-2 rounded-lg text-white ${
                selectedItems.size > 0 && !generating
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {generating ? '⚙️ جاري التوليد...' : '🚀 توليد المحددة'}
            </button>
          </div>

          {/* Items by Axis */}
          <div className="space-y-6">
            {itemAxes.map((axis) => (
              <div key={axis.axis_id} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Axis Header */}
                <div className="bg-gray-50 p-4 border-b flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">
                      {axis.axis_code}. {axis.axis_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {axis.generated_items}/{axis.total_items} بند تم توليده
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSelectAllItems(axis.axis_id)}
                      className="px-3 py-1.5 text-sm border rounded hover:bg-white"
                    >
                      تحديد الكل
                    </button>
                    <button
                      onClick={() => handleGenerateAxisItems(axis.axis_id)}
                      disabled={generating}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                    >
                      توليد كل البنود
                    </button>
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y">
                  {axis.drafts.map((draft) => {
                    const config = statusConfig[draft.status];
                    const isSelected = selectedItems.has(draft.id);
                    
                    return (
                      <div
                        key={draft.id}
                        className={`p-4 flex items-start gap-4 ${isSelected ? 'bg-blue-50' : ''}`}
                      >
                        {/* Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectItem(draft.id)}
                          className="mt-1 w-4 h-4 rounded cursor-pointer"
                        />
                        
                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-blue-600">{draft.item_code}</span>
                            <span className="text-gray-900">{draft.item_name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${config.color}`}>
                              {config.icon} {config.label}
                            </span>
                          </div>
                          
                          {draft.current_value !== null && (
                            <p className="text-sm text-gray-600">
                              القيمة: <span className="font-medium">{draft.current_value}</span>
                              {draft.item_unit && ` ${draft.item_unit}`}
                              {draft.change_percentage !== null && (
                                <span className={draft.change_percentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {' '}({draft.change_percentage >= 0 ? '+' : ''}{draft.change_percentage}%)
                                </span>
                              )}
                            </p>
                          )}
                          
                          {draft.content && (
                            <p className="mt-2 text-sm text-gray-700 line-clamp-2">
                              {draft.content}
                            </p>
                          )}
                        </div>
                        
                        {/* Actions */}
                        <div className="flex gap-2">
                          {/* زر إعدادات المخرجات - يظهر دائماً قبل التوليد */}
                          <button
                            onClick={() => openOutputConfig(draft)}
                            className="px-3 py-1 text-sm border text-gray-600 rounded hover:bg-gray-100"
                            title="إعدادات المخرجات"
                          >
                            ⚙️
                          </button>
                          
                          {draft.status === 'not_started' && (
                            <button
                              onClick={() => handleGenerateItems([draft.item])}
                              disabled={generating}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                            >
                              🚀 توليد
                            </button>
                          )}
                          
                          {(draft.status === 'generated' || draft.status === 'edited') && (
                            <button
                              onClick={() => handleApproveItem(draft)}
                              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              ✔️
                            </button>
                          )}
                          
                          {draft.status !== 'not_started' && draft.status !== 'generating' && (
                            <button
                              onClick={() => handleRegenerateItem(draft)}
                              disabled={generating}
                              className="px-3 py-1 text-sm border text-blue-600 rounded hover:bg-blue-50 disabled:text-gray-400"
                            >
                              🔄
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Edit Modal */}
      {editingDraft && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                تعديل: {editingDraft.axis_code}. {editingDraft.axis_name}
              </h2>
              <button
                onClick={() => setEditingDraft(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full h-96 p-4 border rounded-lg font-mono text-sm"
                dir="rtl"
              />
            </div>
            
            <div className="p-4 border-t flex justify-between">
              <button
                onClick={() => handleRevert(editingDraft)}
                className="px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg"
              >
                ↩️ تراجع للنسخة السابقة
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setEditingDraft(null)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  💾 حفظ التعديلات
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Output Config Modal */}
      {configItem && (
        <OutputConfigModal
          isOpen={configModalOpen}
          onClose={() => {
            setConfigModalOpen(false);
            setConfigItem(null);
          }}
          itemDraftId={configItem.id}
          itemCode={configItem.code}
          itemName={configItem.name}
          onSave={() => {
            // Reload item drafts after saving config
            if (selectedPeriod) {
              loadItemDrafts(selectedPeriod);
            }
          }}
        />
      )}

      {/* Empty State */}
      {!loading && !selectedPeriod && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-6xl mb-4">📄</p>
          <p>اختر فترة جمع للبدء بتوليد التقرير</p>
        </div>
      )}
    </div>
  );
}
