'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Loader2, Sparkles, CheckCircle, Edit3, RefreshCw,
  ChevronDown, ChevronUp, AlertCircle, Play, Table2, Save,
} from 'lucide-react';

interface TableDataItem {
  id: string;
  table_definition: string;
  table_name?: string;
  item_code?: string;
  rows: Record<string, any>[];
}

interface GeneratedContent {
  id: string;
  component_id: string;
  component_type: string;
  component_title: string;
  item_code: string;
  item_name: string;
  axis_name: string;
  content: string;
  status: 'generated' | 'edited' | 'approved';
  version: number;
}

interface Props {
  projectId: string;
  projectStatus: string;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const statusColors: Record<string, string> = {
  generated: 'bg-blue-100 text-blue-700',
  edited:    'bg-amber-100 text-amber-700',
  approved:  'bg-emerald-100 text-emerald-700',
};

const statusLabels: Record<string, string> = {
  generated: 'مولّد',
  edited:    'معدّل',
  approved:  'معتمد',
};

export function GenerateTab({ projectId, projectStatus, showToast }: Props) {
  const [contents, setContents] = useState<GeneratedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [regenNote, setRegenNote] = useState<{ id: string; note: string } | null>(null);

  // Table data state
  const [tableData, setTableData] = useState<TableDataItem[]>([]);
  const [expandedTable, setExpandedTable] = useState<Set<string>>(new Set());
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [editRows, setEditRows] = useState<Record<string, any>[]>([]);
  const [savingTable, setSavingTable] = useState(false);

  useEffect(() => { loadAll(); }, [projectId]);

  async function loadAll() {
    try {
      const [contentData, tableDataRes] = await Promise.all([
        api.generatedContents.list({ project: projectId }),
        api.tableData.list({ project: projectId }).catch(() => ({ results: [] })),
      ]);
      const items: GeneratedContent[] = contentData.results || contentData || [];
      setContents(items);
      if (items.length > 0) setExpanded(new Set([items[0].item_code]));
      const tables: TableDataItem[] = tableDataRes.results || tableDataRes || [];
      setTableData(tables);
    } catch {
      setContents([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadContents() {
    try {
      const data = await api.generatedContents.list({ project: projectId });
      const items: GeneratedContent[] = data.results || data || [];
      setContents(items);
      if (items.length > 0) setExpanded(new Set([items[0].item_code]));
    } catch {
      setContents([]);
    }
  }

  async function handleSaveTableRows(tableId: string) {
    setSavingTable(true);
    try {
      await api.tableData.updateRows(tableId, editRows);
      setTableData(prev => prev.map(t => t.id === tableId ? { ...t, rows: editRows } : t));
      setEditingTableId(null);
      showToast('تم حفظ بيانات الجدول', 'success');
    } catch (e: any) {
      showToast(e.message || 'حدث خطأ في الحفظ', 'error');
    } finally {
      setSavingTable(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      await api.projects.generateText(projectId);
      await loadContents();
      showToast('تم توليد النصوص بنجاح', 'success');
    } catch (e: any) {
      showToast(e.message || 'حدث خطأ في التوليد', 'error');
    } finally {
      setGenerating(false);
    }
  }

  async function handleApprove(id: string) {
    setActionLoading(id);
    try {
      await api.generatedContents.approve(id);
      setContents(prev => prev.map(c => c.id === id ? { ...c, status: 'approved' } : c));
      showToast('تم اعتماد الفقرة', 'success');
    } catch (e: any) {
      showToast(e.message || 'حدث خطأ', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSaveEdit(id: string) {
    if (!editText.trim()) return;
    setActionLoading(id);
    try {
      await api.generatedContents.edit(id, editText);
      setContents(prev => prev.map(c => c.id === id ? { ...c, content: editText, status: 'edited' } : c));
      setEditingId(null);
      showToast('تم حفظ التعديل', 'success');
    } catch (e: any) {
      showToast(e.message || 'حدث خطأ', 'error');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRegenerate(id: string, note?: string) {
    setActionLoading(id);
    setRegenNote(null);
    try {
      const result = await api.generatedContents.regenerate(id, { extra_instructions: note });
      setContents(prev => prev.map(c => c.id === id ? { ...c, content: result.content, status: 'generated', version: (c.version || 0) + 1 } : c));
      showToast('تم إعادة التوليد', 'success');
    } catch (e: any) {
      showToast(e.message || 'حدث خطأ في إعادة التوليد', 'error');
    } finally {
      setActionLoading(null);
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
        <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        ))}
      </div>
    );
  }

  // Group by item
  const byItem: Record<string, GeneratedContent[]> = {};
  for (const c of contents) {
    const key = c.item_code;
    if (!byItem[key]) byItem[key] = [];
    byItem[key].push(c);
  }

  const totalApproved = contents.filter(c => c.status === 'approved').length;
  const totalCount = contents.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-2xl p-6 border ${
        totalCount > 0
          ? 'bg-gradient-to-l from-purple-500 to-purple-600 text-white border-transparent'
          : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
      }`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className={`w-6 h-6 ${totalCount > 0 ? 'text-white' : 'text-purple-600'}`} />
              <h2 className={`text-xl font-bold ${totalCount > 0 ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                توليد النصوص بالذكاء الاصطناعي
              </h2>
            </div>
            <p className={`text-sm ${totalCount > 0 ? 'text-purple-100' : 'text-gray-500 dark:text-gray-400'}`}>
              {totalCount > 0
                ? `${totalCount} فقرة · ${totalApproved} معتمدة · ${totalCount - totalApproved} تنتظر المراجعة`
                : 'الذكاء الاصطناعي يملأ الفراغات النصية فقط — الجداول والأشكال جاهزة من الهيكل'
              }
            </p>
          </div>
          <div className="flex items-center gap-3">
            {totalCount > 0 && (
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {totalCount > 0 ? Math.round((totalApproved / totalCount) * 100) : 0}%
                </div>
                <div className="text-xs text-purple-100">معتمد</div>
              </div>
            )}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-50 ${
                totalCount > 0
                  ? 'bg-white/20 hover:bg-white/30 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20'
              }`}
            >
              {generating
                ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري التوليد...</>
                : totalCount > 0
                ? <><RefreshCw className="w-4 h-4" /> إعادة توليد الكل</>
                : <><Play className="w-4 h-4" /> توليد النصوص</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* Table Data Review — Phase 6 */}
      {tableData.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Table2 className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">مراجعة بيانات الجداول</h3>
              <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{tableData.length} جدول</span>
            </div>
            <span className="text-xs text-gray-400">راجع وعدّل قبل توليد النصوص</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {tableData.map((table) => {
              const isExp = expandedTable.has(table.id);
              const isEditing = editingTableId === table.id;
              const colKeys = table.rows.length > 0 ? Object.keys(table.rows[0]) : [];

              return (
                <div key={table.id}>
                  <button
                    onClick={() => {
                      const next = new Set(expandedTable);
                      next.has(table.id) ? next.delete(table.id) : next.add(table.id);
                      setExpandedTable(next);
                    }}
                    className="w-full flex items-center justify-between px-5 py-3 text-right hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Table2 className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {table.table_name || `جدول ${table.id}`}
                      </span>
                      {table.item_code && (
                        <span className="text-xs text-gray-400">({table.item_code})</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{table.rows.length} صف</span>
                      {isExp ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </button>

                  {isExp && (
                    <div className="px-5 pb-4">
                      {colKeys.length > 0 ? (
                        <>
                          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 mb-3">
                            <table className="w-full text-sm" dir="rtl">
                              <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                  {colKeys.map(col => (
                                    <th key={col} className="px-3 py-2 text-right text-xs font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {(isEditing ? editRows : table.rows).map((row, ri) => (
                                  <tr key={ri} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                                    {colKeys.map(col => (
                                      <td key={col} className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                        {isEditing ? (
                                          <input
                                            type="text"
                                            value={String(editRows[ri]?.[col] ?? '')}
                                            onChange={e => {
                                              const updated = editRows.map((r, idx) =>
                                                idx === ri ? { ...r, [col]: e.target.value } : r
                                              );
                                              setEditRows(updated);
                                            }}
                                            className="w-full min-w-[80px] border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-800 focus:ring-1 focus:ring-blue-400 focus:outline-none"
                                            dir="rtl"
                                          />
                                        ) : (
                                          <span className="whitespace-nowrap">{String(row[col] ?? '')}</span>
                                        )}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {isEditing ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setEditingTableId(null)}
                                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                              >
                                إلغاء
                              </button>
                              <button
                                onClick={() => handleSaveTableRows(table.id)}
                                disabled={savingTable}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                              >
                                {savingTable ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                حفظ
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingTableId(table.id); setEditRows(JSON.parse(JSON.stringify(table.rows))); }}
                              className="flex items-center gap-1 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                              <Edit3 className="w-3 h-3" /> تعديل البيانات
                            </button>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-gray-400 italic py-2">لا توجد بيانات في هذا الجدول</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* How it works (shown before generation) */}
      {totalCount === 0 && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-5">
          <h3 className="font-semibold text-purple-800 dark:text-purple-300 mb-3">كيف يعمل التوليد؟</h3>
          <div className="space-y-2 text-sm text-purple-700 dark:text-purple-400">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
              <span>النظام يحدد كل فراغ نصي في الهيكل</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
              <span>لكل فراغ: يبني prompt يحتوي على البيانات والجداول والأشكال المحيطة</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
              <span>الذكاء الاصطناعي يكتب النص ويشير للجداول والأشكال تلقائياً</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
              <span>أنت تراجع، تعدّل، أو تطلب إعادة توليد كل فقرة على حدة</span>
            </div>
          </div>
        </div>
      )}

      {/* Contents grouped by item */}
      {Object.keys(byItem).length > 0 && (
        <div className="space-y-3">
          {Object.entries(byItem).map(([itemCode, itemContents]) => {
            const isExpanded = expanded.has(itemCode);
            const first = itemContents[0];
            const approvedCount = itemContents.filter(c => c.status === 'approved').length;

            return (
              <div key={itemCode} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <button
                  onClick={() => toggleItem(itemCode)}
                  className="w-full flex items-center justify-between p-4 text-right hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-8 rounded-full ${
                      approvedCount === itemContents.length ? 'bg-emerald-500' :
                      approvedCount > 0 ? 'bg-amber-500' : 'bg-gray-200'
                    }`} />
                    <div className="text-right">
                      <div className="font-medium text-gray-900 dark:text-white text-sm">
                        {itemCode}. {first.item_name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{first.axis_name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                      {approvedCount}/{itemContents.length} معتمد
                    </span>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-800 p-4 space-y-4">
                    {itemContents.map((content) => {
                      const isEditing = editingId === content.id;
                      const isLoadingThis = actionLoading === content.id;
                      const isRegenThis = regenNote?.id === content.id;

                      return (
                        <div key={content.id} className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden">
                          {/* Content header */}
                          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                                {content.component_title || 'فقرة نصية'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[content.status]}`}>
                                {statusLabels[content.status]}
                              </span>
                              {(content.version || 0) > 1 && (
                                <span className="text-xs text-gray-400">v{content.version}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {/* Approve */}
                              {content.status !== 'approved' && (
                                <button
                                  onClick={() => handleApprove(content.id)}
                                  disabled={isLoadingThis}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                                >
                                  {isLoadingThis ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                                  اعتماد
                                </button>
                              )}
                              {/* Edit */}
                              <button
                                onClick={() => {
                                  if (isEditing) { setEditingId(null); }
                                  else { setEditingId(content.id); setEditText(content.content); }
                                }}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                              >
                                <Edit3 className="w-3 h-3" />
                                {isEditing ? 'إلغاء' : 'تعديل'}
                              </button>
                              {/* Regenerate */}
                              <button
                                onClick={() => setRegenNote(isRegenThis ? null : { id: content.id, note: '' })}
                                disabled={isLoadingThis}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                              >
                                {isLoadingThis ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                إعادة توليد
                              </button>
                            </div>
                          </div>

                          {/* Content body */}
                          {isEditing ? (
                            <div className="p-4">
                              <textarea
                                value={editText}
                                onChange={e => setEditText(e.target.value)}
                                rows={5}
                                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                dir="rtl"
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">إلغاء</button>
                                <button
                                  onClick={() => handleSaveEdit(content.id)}
                                  disabled={isLoadingThis}
                                  className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                  {isLoadingThis ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                  حفظ
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 text-sm text-gray-700 dark:text-gray-300 leading-loose" dir="rtl">
                              {content.content || <span className="text-gray-400 italic">لا يوجد محتوى</span>}
                            </div>
                          )}

                          {/* Regenerate note */}
                          {isRegenThis && (
                            <div className="border-t border-gray-100 dark:border-gray-800 p-3">
                              <input
                                type="text"
                                value={regenNote.note}
                                onChange={e => setRegenNote({ ...regenNote, note: e.target.value })}
                                placeholder="ملاحظة اختيارية: مثل 'اكتبها أقصر' أو 'ركّز على الأرقام الإجمالية'"
                                className="w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 mb-2"
                                dir="rtl"
                              />
                              <div className="flex justify-end gap-2">
                                <button onClick={() => setRegenNote(null)} className="px-3 py-1 text-xs text-gray-600 border border-gray-200 rounded-lg">إلغاء</button>
                                <button
                                  onClick={() => handleRegenerate(content.id, regenNote.note || undefined)}
                                  className="flex items-center gap-1 px-3 py-1 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                >
                                  <RefreshCw className="w-3 h-3" /> توليد
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {totalCount === 0 && !generating && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
          <Sparkles className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">لم يتم توليد النصوص بعد</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
            تأكد أولاً من بناء الهيكل ومراجعة البيانات، ثم اضغط "توليد النصوص"
          </p>
          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700"
          >
            <Sparkles className="w-5 h-5" />
            توليد النصوص بالذكاء الاصطناعي
          </button>
        </div>
      )}

      {generating && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-purple-100 dark:border-purple-800 p-12 text-center">
          <Loader2 className="w-12 h-12 text-purple-500 mx-auto mb-3 animate-spin" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">جاري توليد النصوص...</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">الذكاء الاصطناعي يكتب النصوص لكل بند</p>
        </div>
      )}
    </div>
  );
}
