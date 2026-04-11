'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PageTransition } from '@/components/ui/motion';
import {
  ChevronRight, ChevronDown, ChevronUp, CheckCircle,
  AlertCircle, Clock, FileText, Table2, BarChart3,
  Heading, Loader2, ArrowLeft, Layers,
} from 'lucide-react';

// ═══════════════════════════════════════
// Types
// ═══════════════════════════════════════

interface Component {
  id: string;
  type: 'paragraph' | 'table' | 'chart' | 'heading' | 'image' | 'divider';
  title?: string;
  content?: string;
  has_data?: boolean;
  chart_type?: string;
  columns?: { name: string }[];
}

interface GeneratedContent {
  id: string;
  component_id: string;
  status: string;
  content: string;
  final_content: string;
  version: number;
}

interface Structure {
  id: string;
  item: number;
  item_code: string;
  item_name: string;
  axis_code: string;
  axis_name: string;
  components: Component[];
  is_approved: boolean;
  paragraphs_count: number;
  tables_count: number;
  charts_count: number;
  generated_contents: GeneratedContent[];
}

interface AxisGroup {
  code: string;
  name: string;
  items: Structure[];
}

// ═══════════════════════════════════════
// Helpers
// ═══════════════════════════════════════

const compTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
  paragraph: { label: 'فقرة نصية', icon: FileText, color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' },
  table:     { label: 'جدول',      icon: Table2,   color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' },
  chart:     { label: 'شكل بياني', icon: BarChart3, color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' },
  heading:   { label: 'عنوان',     icon: Heading,   color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' },
};

const gcStatusConfig: Record<string, { label: string; color: string; icon: any }> = {
  not_started: { label: 'لم يبدأ',    color: 'text-gray-400 bg-gray-100',    icon: Clock },
  generating:  { label: 'جاري...',    color: 'text-blue-600 bg-blue-100',    icon: Loader2 },
  generated:   { label: 'تم التوليد', color: 'text-purple-600 bg-purple-100', icon: CheckCircle },
  edited:      { label: 'تم التعديل', color: 'text-amber-600 bg-amber-100',  icon: CheckCircle },
  approved:    { label: 'معتمد',      color: 'text-emerald-600 bg-emerald-100', icon: CheckCircle },
  failed:      { label: 'فشل',        color: 'text-red-600 bg-red-100',      icon: AlertCircle },
};

function numericSort(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);
  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const diff = (aParts[i] || 0) - (bParts[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// ═══════════════════════════════════════
// Main Component
// ═══════════════════════════════════════

export default function ProjectStructurePage() {
  const params = useParams();
  const projectId = params.id as string;

  const [structures, setStructures] = useState<Structure[]>([]);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedAxes, setExpandedAxes] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const [projData, structData] = await Promise.all([
          api.projects.get(projectId),
          api.structures.list(projectId),
        ]);
        setProjectName(projData.name);
        const allStructures = structData.results || structData;
        setStructures(allStructures);
        // Expand all axes by default
        const axisCodes = new Set(allStructures.map((s: Structure) => s.axis_code));
        setExpandedAxes(axisCodes as Set<string>);
      } catch (e) {
        console.error('Failed to load structures', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  // Group by axis
  const axisGroups: AxisGroup[] = [];
  const axisMap = new Map<string, AxisGroup>();
  for (const s of structures) {
    if (!axisMap.has(s.axis_code)) {
      const group = { code: s.axis_code, name: s.axis_name, items: [] };
      axisMap.set(s.axis_code, group);
      axisGroups.push(group);
    }
    axisMap.get(s.axis_code)!.items.push(s);
  }
  // Sort axes and items numerically
  axisGroups.sort((a, b) => numericSort(a.code, b.code));
  for (const group of axisGroups) {
    group.items.sort((a, b) => numericSort(a.item_code, b.item_code));
  }

  // Stats
  const totalItems = structures.length;
  const totalComponents = structures.reduce((sum, s) => sum + s.components.length, 0);
  const totalParagraphs = structures.reduce((sum, s) => sum + s.paragraphs_count, 0);
  const totalTables = structures.reduce((sum, s) => sum + s.tables_count, 0);
  const totalCharts = structures.reduce((sum, s) => sum + s.charts_count, 0);
  const allGC = structures.flatMap(s => s.generated_contents);
  const approvedGC = allGC.filter(gc => gc.status === 'approved').length;
  const generatedGC = allGC.filter(gc => ['generated', 'edited', 'approved'].includes(gc.status)).length;

  function toggleAxis(code: string) {
    setExpandedAxes(prev => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  }

  function toggleItem(id: string) {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpandedAxes(new Set(axisGroups.map(g => g.code)));
    setExpandedItems(new Set(structures.map(s => s.id)));
  }

  function collapseAll() {
    setExpandedAxes(new Set());
    setExpandedItems(new Set());
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="mr-3 text-gray-500">جارِ تحميل هيكل التقرير...</span>
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/dashboard/projects" className="hover:text-gray-700">المشاريع</Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <Link href={`/dashboard/projects/${projectId}`} className="hover:text-gray-700">المشروع</Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 dark:text-white">هيكل التقرير</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            هيكل التقرير الكامل
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{projectName}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={expandAll} className="btn btn-secondary text-xs">توسيع الكل</button>
          <button onClick={collapseAll} className="btn btn-secondary text-xs">طي الكل</button>
          <Link href={`/dashboard/projects/${projectId}`} className="btn btn-secondary text-xs flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> العودة
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'المحاور', value: axisGroups.length, color: 'text-blue-600' },
          { label: 'البنود', value: totalItems, color: 'text-indigo-600' },
          { label: 'المكونات', value: totalComponents, color: 'text-gray-700' },
          { label: 'الفقرات', value: totalParagraphs, color: 'text-purple-600' },
          { label: 'الجداول', value: totalTables, color: 'text-emerald-600' },
          { label: 'الأشكال', value: totalCharts, color: 'text-amber-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3 text-center">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* AI Generation Progress */}
      {totalParagraphs > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">تقدم توليد النصوص</span>
            <span className="text-sm text-gray-500">{generatedGC} / {totalParagraphs} فقرة ({approvedGC} معتمدة)</span>
          </div>
          <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-l from-emerald-500 to-emerald-400 rounded-full transition-all" style={{ width: `${totalParagraphs > 0 ? (generatedGC / totalParagraphs * 100) : 0}%` }} />
          </div>
        </div>
      )}

      {/* Tree */}
      <div className="space-y-3">
        {axisGroups.map(axis => {
          const isExpanded = expandedAxes.has(axis.code);
          const axisItemsCount = axis.items.length;
          const axisComponents = axis.items.reduce((sum, i) => sum + i.components.length, 0);

          return (
            <div key={axis.code} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              {/* Axis header */}
              <button
                onClick={() => toggleAxis(axis.code)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
                  {axis.code}
                </div>
                <div className="flex-1 text-right">
                  <div className="font-bold text-gray-900 dark:text-white">المحور {axis.code}: {axis.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{axisItemsCount} بند · {axisComponents} مكون</div>
                </div>
                {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
              </button>

              {/* Items */}
              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-800">
                  {axis.items.map(item => {
                    const isItemExpanded = expandedItems.has(item.id);
                    const itemGC = item.generated_contents;
                    const itemApproved = itemGC.filter(gc => gc.status === 'approved').length;
                    const itemGenerated = itemGC.filter(gc => ['generated', 'edited', 'approved'].includes(gc.status)).length;
                    const itemParagraphs = item.paragraphs_count;

                    return (
                      <div key={item.id} className="border-b border-gray-50 dark:border-gray-800 last:border-b-0">
                        {/* Item header */}
                        <button
                          onClick={() => toggleItem(item.id)}
                          className="w-full flex items-center gap-3 px-5 py-3 pr-14 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center text-sm font-bold shrink-0">
                            {item.item_code}
                          </div>
                          <div className="flex-1 text-right min-w-0">
                            <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{item.item_name}</div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                              {item.paragraphs_count > 0 && <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{item.paragraphs_count}</span>}
                              {item.tables_count > 0 && <span className="flex items-center gap-1"><Table2 className="w-3 h-3" />{item.tables_count}</span>}
                              {item.charts_count > 0 && <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" />{item.charts_count}</span>}
                              {itemParagraphs > 0 && (
                                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                  itemApproved === itemParagraphs ? 'bg-emerald-100 text-emerald-700' :
                                  itemGenerated > 0 ? 'bg-purple-100 text-purple-700' :
                                  'bg-gray-100 text-gray-500'
                                }`}>
                                  {itemApproved === itemParagraphs ? 'مكتمل' :
                                   itemGenerated > 0 ? `${itemGenerated}/${itemParagraphs}` :
                                   'لم يُولّد'}
                                </span>
                              )}
                            </div>
                          </div>
                          {isItemExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </button>

                        {/* Components (leaf level) */}
                        {isItemExpanded && (
                          <div className="pr-20 pl-5 pb-3 space-y-1.5">
                            {item.components.map(comp => {
                              const config = compTypeConfig[comp.type] || compTypeConfig.paragraph;
                              const Icon = config.icon;
                              const gc = itemGC.find(g => g.component_id === comp.id);
                              const gcStatus = gc ? gcStatusConfig[gc.status] : null;
                              const GCIcon = gcStatus?.icon;

                              return (
                                <div key={comp.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${config.color} transition-colors`}>
                                  <Icon className="w-4 h-4 shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs font-medium">{config.label}</span>
                                    {comp.title && <span className="text-xs text-gray-500 mr-2">— {comp.title}</span>}
                                    {comp.type === 'table' && comp.columns && (
                                      <span className="text-xs text-gray-400 mr-2">({comp.columns.length} أعمدة)</span>
                                    )}
                                    {comp.type === 'chart' && comp.chart_type && (
                                      <span className="text-xs text-gray-400 mr-2">({comp.chart_type})</span>
                                    )}
                                  </div>
                                  {/* AI status for paragraphs */}
                                  {comp.type === 'paragraph' && gcStatus && GCIcon && (
                                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${gcStatus.color}`}>
                                      <GCIcon className="w-3 h-3" />
                                      {gcStatus.label}
                                    </span>
                                  )}
                                  {comp.type === 'paragraph' && !gc && (
                                    <span className="flex items-center gap-1 text-xs text-gray-400 px-2 py-0.5 rounded-full bg-gray-100">
                                      <Clock className="w-3 h-3" />
                                      لم يبدأ
                                    </span>
                                  )}
                                  {/* Data status for tables */}
                                  {comp.type === 'table' && (
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                      comp.has_data ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                      {comp.has_data ? 'بيانات جاهزة' : 'بيانات ناقصة'}
                                    </span>
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
            </div>
          );
        })}
      </div>

      {structures.length === 0 && (
        <div className="text-center py-16">
          <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">لم يُبنَ الهيكل بعد</p>
          <p className="text-sm text-gray-400 mt-1">ارجع للمشروع وابنِ الهيكل أولاً</p>
          <Link href={`/dashboard/projects/${projectId}`} className="btn btn-primary mt-4 inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> العودة للمشروع
          </Link>
        </div>
      )}
    </div>
    </PageTransition>
  );
}
