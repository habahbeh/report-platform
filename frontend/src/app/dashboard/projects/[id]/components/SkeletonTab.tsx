'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2, FileCode2, CheckCircle, AlertTriangle,
  ChevronDown, ChevronUp, RefreshCw, Play, Eye, X,
  Settings2, Trash2, Plus, Save,
} from 'lucide-react';

interface SkeletonComponent {
  id: string;
  order: number;
  type: 'paragraph' | 'table' | 'chart';
  title?: string;
  description?: string;
  generated_by: 'ai' | 'data';
  data?: any;
  columns?: { name: string; type: string }[];
  chart_type?: string;
  has_data: boolean;
}

interface SkeletonItem {
  item_code: string;
  item_name: string;
  axis_name: string;
  components: SkeletonComponent[];
  data_complete: boolean;
}

interface SkeletonStatus {
  status: 'not_built' | 'building' | 'built' | 'error';
  items_count: number;
  components_count: number;
  data_ready: number;
  placeholders: number;
  built_at?: string;
  items?: SkeletonItem[];
  preview_html?: string;
}

interface Props {
  projectId: string;
  projectStatus: string;
  onMoveToGenerate: () => void;
}

const typeLabels = {
  paragraph: { label: 'فقرة نصية (AI)', color: 'bg-purple-100 text-purple-700', icon: '📝' },
  table:     { label: 'جدول بيانات',    color: 'bg-emerald-100 text-emerald-700', icon: '📋' },
  chart:     { label: 'شكل بياني',      color: 'bg-amber-100 text-amber-700',    icon: '📊' },
};

const chartTypeLabels: Record<string, string> = {
  pie: 'دائري', bar: 'أعمدة', line: 'خطي', area: 'مساحي',
};

const CHART_TYPES = ['pie', 'bar', 'line', 'area'];

export function SkeletonTab({ projectId, projectStatus, onMoveToGenerate }: Props) {
  const [status, setStatus] = useState<SkeletonStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [building, setBuilding] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Preview
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Structure editing
  const [structures, setStructures] = useState<any[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editComponents, setEditComponents] = useState<any[]>([]);
  const [savingStructure, setSavingStructure] = useState(false);

  useEffect(() => { loadAll(); }, [projectId]);

  async function loadAll() {
    try {
      const [skeletonData, structuresData] = await Promise.all([
        api.projects.skeletonStatus(projectId),
        api.structures.list(projectId).catch(() => []),
      ]);
      setStatus(skeletonData);
      setStructures(structuresData.results || structuresData || []);
      if (skeletonData.items?.length > 0) {
        setExpanded(new Set([skeletonData.items[0].item_code]));
      }
    } catch {
      setStatus({ status: 'not_built', items_count: 0, components_count: 0, data_ready: 0, placeholders: 0 });
    } finally {
      setLoading(false);
    }
  }

  async function handleBuild() {
    setBuilding(true);
    setError(null);
    try {
      await api.projects.buildSkeleton(projectId);
      await loadAll();
    } catch (e: any) {
      setError(e.message || 'حدث خطأ أثناء بناء الهيكل');
    } finally {
      setBuilding(false);
    }
  }

  async function handlePreview() {
    setLoadingPreview(true);
    try {
      const data = await api.projects.skeletonStatus(projectId);
      setPreviewHtml(
        data?.preview_html ||
        '<div dir="rtl" style="text-align:center;padding:60px 20px;color:#9ca3af;font-family:Cairo,sans-serif;">المعاينة غير متوفرة — تأكد من بناء الهيكل أولاً</div>'
      );
      setShowPreview(true);
    } catch {
      setPreviewHtml('<div style="text-align:center;padding:60px;color:#9ca3af;">حدث خطأ في تحميل المعاينة</div>');
      setShowPreview(true);
    } finally {
      setLoadingPreview(false);
    }
  }

  function findStructure(itemCode: string) {
    return structures.find(s =>
      s.item_code === itemCode ||
      s.item?.code === itemCode ||
      s.item?.item_code === itemCode
    );
  }

  function startEdit(itemCode: string) {
    if (editingItem === itemCode) { setEditingItem(null); return; }
    const struct = findStructure(itemCode);
    if (!struct) return;
    setEditingItem(itemCode);
    setEditComponents(JSON.parse(JSON.stringify(struct.components || [])));
  }

  function moveComp(idx: number, dir: 'up' | 'down') {
    const arr = [...editComponents];
    const target = dir === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    arr.forEach((c, i) => { c.order = i + 1; });
    setEditComponents(arr);
  }

  function removeComp(idx: number) {
    const arr = editComponents.filter((_, i) => i !== idx);
    arr.forEach((c, i) => { c.order = i + 1; });
    setEditComponents(arr);
  }

  function updateChartType(idx: number, chartType: string) {
    const arr = [...editComponents];
    arr[idx] = { ...arr[idx], chart_type: chartType };
    setEditComponents(arr);
  }

  function addComp(type: 'paragraph' | 'table' | 'chart') {
    const newComp: any = {
      id: `new_${Date.now()}`,
      order: editComponents.length + 1,
      type,
      generated_by: type === 'paragraph' ? 'ai' : 'data',
      title: type === 'paragraph' ? 'فقرة جديدة' : type === 'table' ? 'جدول جديد' : 'شكل جديد',
    };
    if (type === 'chart') newComp.chart_type = 'bar';
    setEditComponents([...editComponents, newComp]);
  }

  async function saveEdit(itemCode: string) {
    const struct = findStructure(itemCode);
    if (!struct) return;
    setSavingStructure(true);
    try {
      await api.structures.update(struct.id, { components: editComponents });
      await loadAll();
      setEditingItem(null);
    } catch (e: any) {
      setError(e.message || 'حدث خطأ في حفظ الهيكل');
    } finally {
      setSavingStructure(false);
    }
  }

  function toggleItem(code: string) {
    const next = new Set(expanded);
    next.has(code) ? next.delete(code) : next.add(code);
    setExpanded(next);
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        ))}
      </div>
    );
  }

  const isNotBuilt = !status || status.status === 'not_built';
  const isBuilt = status?.status === 'built';
  const canBuild = ['reviewing', 'collecting', 'draft'].includes(projectStatus);
  const dataPercent = status && status.components_count > 0
    ? Math.round((status.data_ready / status.components_count) * 100)
    : 0;

  return (
    <div className="space-y-6">

      {/* Header Card */}
      <div className={`rounded-2xl p-6 border ${
        isBuilt
          ? 'bg-gradient-to-l from-teal-500 to-teal-600 text-white border-transparent'
          : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
      }`}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileCode2 className={`w-6 h-6 ${isBuilt ? 'text-white' : 'text-teal-600'}`} />
              <h2 className={`text-xl font-bold ${isBuilt ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                الهيكل HTML (Skeleton)
              </h2>
            </div>
            <p className={`text-sm ${isBuilt ? 'text-teal-100' : 'text-gray-500 dark:text-gray-400'}`}>
              {isBuilt
                ? `${status.items_count} بند · ${status.components_count} قطعة · ${status.placeholders} فراغ نصي`
                : 'النظام يبني هيكل التقرير من البيانات — جداول وأشكال حقيقية، وفراغات للنصوص'
              }
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {isBuilt && (
              <>
                <div className="text-right ml-1">
                  <div className="text-2xl font-bold text-white">{dataPercent}%</div>
                  <div className="text-xs text-teal-100">بيانات جاهزة</div>
                </div>
                <button
                  onClick={handlePreview}
                  disabled={loadingPreview}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-white/20 hover:bg-white/30 text-white transition-all disabled:opacity-50"
                >
                  {loadingPreview
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Eye className="w-4 h-4" />
                  }
                  معاينة
                </button>
              </>
            )}
            <button
              onClick={handleBuild}
              disabled={building || !canBuild}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${
                isBuilt
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-teal-600 hover:bg-teal-700 text-white shadow-lg shadow-teal-500/20'
              }`}
            >
              {building
                ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري البناء...</>
                : isBuilt
                ? <><RefreshCw className="w-4 h-4" /> إعادة البناء</>
                : <><Play className="w-4 h-4" /> بناء الهيكل</>
              }
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 bg-red-50 text-red-700 rounded-lg px-3 py-2 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Explanation (before build) */}
      {isNotBuilt && (
        <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-2xl p-5">
          <h3 className="font-semibold text-teal-800 dark:text-teal-300 mb-3">ما هو الهيكل؟</h3>
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            {[
              { icon: '📋', title: 'جداول حقيقية', desc: 'مبنية من البيانات التي أدخلها المساهمون' },
              { icon: '📊', title: 'أشكال بيانية', desc: 'مرسومة تلقائياً من البيانات' },
              { icon: '📝', title: 'فراغات للنصوص', desc: 'يملأها الذكاء الاصطناعي في المرحلة التالية' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex gap-2">
                <span className="text-lg">{icon}</span>
                <div>
                  <div className="font-medium text-teal-700 dark:text-teal-400">{title}</div>
                  <div className="text-teal-600 dark:text-teal-500">{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-teal-600 dark:text-teal-500">
            هذه الخطوة لا تستخدم الذكاء الاصطناعي — النتيجة تظهر في ثوانٍ
          </div>
        </div>
      )}

      {/* Skeleton Items */}
      {isBuilt && status.items && status.items.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">مراجعة الهيكل</h3>
            <button
              onClick={onMoveToGenerate}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 shadow-lg shadow-purple-500/20"
            >
              <Play className="w-4 h-4" />
              توليد النصوص
            </button>
          </div>

          {status.items.map((item) => {
            const isExpanded = expanded.has(item.item_code);
            const aiCount   = item.components.filter(c => c.type === 'paragraph').length;
            const dataCount = item.components.filter(c => c.type !== 'paragraph').length;
            const hasData   = item.components.filter(c => c.type !== 'paragraph' && c.has_data).length;
            const struct    = findStructure(item.item_code);
            const isEditingThis = editingItem === item.item_code;

            return (
              <div key={item.item_code} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">

                {/* Item header toggle */}
                <button
                  onClick={() => toggleItem(item.item_code)}
                  className="w-full flex items-center justify-between p-4 text-right hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {item.data_complete
                      ? <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      : <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    }
                    <div className="text-right">
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {item.item_code}. {item.item_name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.axis_name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2 text-xs">
                      <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-400 rounded-full">
                        {aiCount} فقرة
                      </span>
                      <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-full">
                        {hasData}/{dataCount} بيانات
                      </span>
                    </div>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-800">

                    {/* Component list (read-only view) */}
                    <div className="p-4 space-y-2">
                      {item.components.map((comp, idx) => {
                        const typeInfo = typeLabels[comp.type];
                        return (
                          <div
                            key={comp.id || idx}
                            className={`flex items-start gap-3 p-3 rounded-lg border ${
                              comp.type === 'paragraph'
                                ? 'border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10'
                                : comp.has_data
                                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10'
                                : 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10'
                            }`}
                          >
                            <span className="text-lg flex-shrink-0">{typeInfo.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                                  {typeInfo.label}
                                  {comp.chart_type && ` — ${chartTypeLabels[comp.chart_type] || comp.chart_type}`}
                                </span>
                                {comp.type !== 'paragraph' && (
                                  comp.has_data
                                    ? <span className="text-xs text-emerald-600 font-medium">✓ جاهز</span>
                                    : <span className="text-xs text-amber-600 font-medium">⚠ بيانات ناقصة</span>
                                )}
                                {comp.type === 'paragraph' && (
                                  <span className="text-xs text-purple-500">ينتظر الذكاء الاصطناعي</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {comp.title || comp.description || `القطعة ${idx + 1}`}
                              </p>
                            </div>
                            <span className="text-xs text-gray-400 flex-shrink-0">#{comp.order}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Structure editor (if structure exists) */}
                    {struct && (
                      <div className="border-t border-gray-100 dark:border-gray-800">
                        <button
                          onClick={() => startEdit(item.item_code)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-sm text-gray-500 dark:text-gray-400"
                        >
                          <div className="flex items-center gap-2">
                            <Settings2 className="w-4 h-4" />
                            تعديل الهيكل
                          </div>
                          {isEditingThis
                            ? <ChevronUp className="w-4 h-4" />
                            : <ChevronDown className="w-4 h-4" />
                          }
                        </button>

                        {isEditingThis && (
                          <div className="px-4 pb-4 space-y-2">
                            <p className="text-xs text-gray-500 mb-3">
                              غيّر ترتيب القطع أو أنواعها — يؤثر على كيفية بناء الهيكل بعد الحفظ
                            </p>

                            {editComponents.map((comp, idx) => (
                              <div key={comp.id || idx} className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                                {/* Order buttons */}
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    onClick={() => moveComp(idx, 'up')}
                                    disabled={idx === 0}
                                    className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-30 transition-colors"
                                  >
                                    <ChevronUp className="w-3 h-3 text-gray-500" />
                                  </button>
                                  <button
                                    onClick={() => moveComp(idx, 'down')}
                                    disabled={idx === editComponents.length - 1}
                                    className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-30 transition-colors"
                                  >
                                    <ChevronDown className="w-3 h-3 text-gray-500" />
                                  </button>
                                </div>

                                <span className="text-sm">{typeLabels[comp.type as keyof typeof typeLabels]?.icon || '?'}</span>
                                <span className="text-xs flex-1 text-gray-700 dark:text-gray-300 truncate">
                                  {comp.title || (comp.type === 'paragraph' ? 'فقرة نصية' : comp.type === 'table' ? 'جدول' : 'شكل')}
                                </span>

                                {/* Chart type selector */}
                                {comp.type === 'chart' && (
                                  <select
                                    value={comp.chart_type || 'bar'}
                                    onChange={(e) => updateChartType(idx, e.target.value)}
                                    className="text-xs border border-gray-200 dark:border-gray-600 rounded px-1.5 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                  >
                                    {CHART_TYPES.map(ct => (
                                      <option key={ct} value={ct}>{chartTypeLabels[ct]}</option>
                                    ))}
                                  </select>
                                )}

                                <button
                                  onClick={() => removeComp(idx)}
                                  className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}

                            {/* Add component buttons */}
                            <div className="flex items-center gap-2 mt-3 flex-wrap">
                              <span className="text-xs text-gray-500">إضافة:</span>
                              {(['paragraph', 'table', 'chart'] as const).map(t => (
                                <button
                                  key={t}
                                  onClick={() => addComp(t)}
                                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors ${
                                    t === 'paragraph' ? 'bg-purple-50 text-purple-700 hover:bg-purple-100' :
                                    t === 'table'     ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' :
                                                        'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  }`}
                                >
                                  <Plus className="w-3 h-3" />
                                  {t === 'paragraph' ? 'فقرة' : t === 'table' ? 'جدول' : 'شكل'}
                                </button>
                              ))}
                            </div>

                            {/* Save/Cancel */}
                            <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                              <button
                                onClick={() => setEditingItem(null)}
                                className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                إلغاء
                              </button>
                              <button
                                onClick={() => saveEdit(item.item_code)}
                                disabled={savingStructure}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                              >
                                {savingStructure
                                  ? <Loader2 className="w-3 h-3 animate-spin" />
                                  : <Save className="w-3 h-3" />
                                }
                                حفظ وإعادة البناء
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Generate button at bottom */}
          <div className="pt-2">
            <button
              onClick={onMoveToGenerate}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
            >
              <Play className="w-5 h-5" />
              المرحلة التالية: توليد النصوص بالذكاء الاصطناعي
            </button>
          </div>
        </div>
      )}

      {/* Empty state when built but no items */}
      {isBuilt && (!status.items || status.items.length === 0) && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
          <FileCode2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">لا توجد عناصر في الهيكل</p>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="font-bold text-gray-900">معاينة هيكل التقرير</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  الجداول والأشكال مبنية من البيانات — الفراغات النصية ستُملأ بالذكاء الاصطناعي
                </p>
              </div>
              <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              <iframe
                srcDoc={previewHtml}
                className="w-full min-h-[65vh] border-0"
                title="Skeleton Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
            <div className="flex items-center justify-between gap-3 p-4 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => { setShowPreview(false); onMoveToGenerate(); }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700"
              >
                <Play className="w-4 h-4" />
                الهيكل جاهز — ولّد النصوص
              </button>
              <button onClick={() => setShowPreview(false)} className="btn btn-secondary text-sm">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
