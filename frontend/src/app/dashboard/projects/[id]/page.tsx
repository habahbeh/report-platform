'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Contributor {
  id: string;
  entity: number;
  entity_name: string;
  entity_priority: string;
  name: string;
  email: string;
  phone: string;
  invite_token: string;
  status: string;
  progress: number;
  items_count: number;
  completed_items_count: number;
  invite_sent_at: string | null;
  submitted_at: string | null;
}

interface ResponseData {
  id: string;
  item: number;
  item_code: string;
  item_name: string;
  value: any;
  display_value: string;
  is_valid: boolean;
  admin_value: any;
  admin_note: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
  period: string;
  period_start: string;
  period_end: string;
  status: string;
  deadline: string | null;
  days_remaining: number | null;
  progress: number;
  items_progress: number;
  contributors_count: number;
  template: {
    id: number;
    name: string;
    axes_count: number;
    items_count: number;
    entities_count: number;
  };
  organization: {
    id: number;
    name: string;
  } | null;
  contributors: Contributor[];
  generated_reports: any[];
  created_at: string;
}

const statusConfig: Record<string, { label: string; color: string; next: string | null; nextLabel: string }> = {
  draft: { label: 'مسودة', color: 'bg-gray-100 text-gray-700', next: 'collecting', nextLabel: 'بدء جمع البيانات' },
  collecting: { label: 'جمع البيانات', color: 'bg-blue-100 text-blue-700', next: 'reviewing', nextLabel: 'إنهاء الجمع والمراجعة' },
  reviewing: { label: 'مراجعة', color: 'bg-yellow-100 text-yellow-700', next: 'generating', nextLabel: 'توليد التقرير' },
  generating: { label: 'جاري التوليد', color: 'bg-purple-100 text-purple-700', next: 'published', nextLabel: 'نشر التقرير' },
  published: { label: 'منشور', color: 'bg-green-100 text-green-700', next: null, nextLabel: '' },
  archived: { label: 'مؤرشف', color: 'bg-gray-100 text-gray-500', next: null, nextLabel: '' },
};

const contributorStatusLabels: Record<string, string> = {
  pending: 'معلق',
  invited: 'تم الدعوة',
  in_progress: 'جاري الإدخال',
  submitted: 'تم الإرسال',
  completed: 'مكتمل',
  rejected: 'مرفوض',
};

const contributorStatusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-600',
  invited: 'bg-blue-100 text-blue-600',
  in_progress: 'bg-yellow-100 text-yellow-700',
  submitted: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [responses, setResponses] = useState<ResponseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [tab, setTab] = useState<'overview' | 'contributors' | 'data' | 'report' | 'export'>('overview');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }
  const [generatingReport, setGeneratingReport] = useState<{
    id: string;
    status: string;
    progress: number;
    current_step: string;
    format: string;
  } | null>(null);

  const loadProject = useCallback(async () => {
    try {
      const data = await api.projects.get(projectId);
      setProject(data);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadResponses = useCallback(async () => {
    try {
      const data = await api.projects.aggregated(projectId);
      setResponses(data.items || []);
    } catch (error) {
      console.error('Failed to load responses:', error);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
    loadResponses();
  }, [loadProject, loadResponses]);

  async function updateStatus(newStatus: string) {
    if (!project) return;
    setActionLoading(true);
    try {
      await api.projects.update(projectId, { status: newStatus });
      await loadProject();
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleInviteAll() {
    if (!project) return;
    setActionLoading(true);
    try {
      await api.projects.invite(projectId);
      await loadProject();
      showToast('تم إرسال الدعوات بنجاح', 'success');
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemindAll() {
    if (!project) return;
    setActionLoading(true);
    try {
      await api.projects.remind(projectId);
      showToast('تم إرسال التذكيرات بنجاح', 'success');
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleGenerate(format: string = 'docx') {
    if (!project) return;
    setActionLoading(true);
    try {
      const result = await api.projects.generate(projectId, format);
      
      // Start polling for progress
      setGeneratingReport({
        id: result.report_id,
        status: 'processing',
        progress: 0,
        current_step: 'بدء التوليد',
        format: format,
      });
      setTab('export');
      
      pollGenerationStatus(result.report_id);
    } catch (error: any) {
      showToast(error.message || 'حدث خطأ', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function pollGenerationStatus(reportId: string) {
    const poll = async () => {
      try {
        const status = await api.projects.generateStatus(projectId, reportId);
        
        setGeneratingReport({
          id: reportId,
          status: status.status,
          progress: status.progress || 0,
          current_step: status.current_step || '',
          format: status.format,
        });
        
        if (status.status === 'completed') {
          await loadProject();
          return; // Stop polling
        } else if (status.status === 'failed') {
          showToast('فشل التوليد: ' + (status.error_message || 'خطأ غير معروف'), 'error');
          return; // Stop polling
        } else {
          // Continue polling
          setTimeout(poll, 1000);
        }
      } catch (error) {
        console.error('Polling error:', error);
        setTimeout(poll, 2000); // Retry after 2s on error
      }
    };
    
    poll();
  }

  function copyInviteLink(token: string) {
    const url = `${window.location.origin}/contribute/${token}`;
    navigator.clipboard.writeText(url);
    showToast('تم نسخ الرابط', 'success');
  }

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
        <Link href="/dashboard/projects" className="text-blue-600 hover:underline mt-2 inline-block">
          العودة للمشاريع
        </Link>
      </div>
    );
  }

  const currentStatus = statusConfig[project.status];

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/dashboard/projects" className="hover:text-gray-700">المشاريع</Link>
            <span>←</span>
            <span className="text-gray-900">{project.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-gray-600 mt-1">
            {project.period} • {project.organization?.name}
          </p>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-medium ${currentStatus.color}`}>
          {currentStatus.label}
        </span>
      </div>

      {/* Workflow Progress */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">مراحل العمل</h3>
          {currentStatus.next && (
            <button
              onClick={() => updateStatus(currentStatus.next!)}
              disabled={actionLoading}
              className="btn btn-primary text-sm"
            >
              {actionLoading ? '...' : currentStatus.nextLabel} →
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {['draft', 'collecting', 'reviewing', 'generating', 'published'].map((status, i) => {
            const config = statusConfig[status];
            const isActive = project.status === status;
            const isPast = ['draft', 'collecting', 'reviewing', 'generating', 'published'].indexOf(project.status) > i;
            return (
              <div key={status} className="flex items-center">
                <div
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                    isActive ? config.color + ' ring-2 ring-offset-2 ring-blue-500' :
                    isPast ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isPast && !isActive && '✓ '}{config.label}
                </div>
                {i < 4 && <span className="mx-2 text-gray-300">→</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-3xl font-bold text-blue-600">{project.items_progress}%</div>
          <div className="text-sm text-gray-500 mt-1">البيانات المكتملة</div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full" style={{ width: `${project.items_progress}%` }} />
          </div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-600">{project.progress}%</div>
          <div className="text-sm text-gray-500 mt-1">المساهمون المكتملون</div>
          <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-600 rounded-full" style={{ width: `${project.progress}%` }} />
          </div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-purple-600">{project.contributors_count}</div>
          <div className="text-sm text-gray-500 mt-1">جهة مسؤولة</div>
        </div>
        <div className="card text-center">
          <div className={`text-3xl font-bold ${project.days_remaining !== null && project.days_remaining < 7 ? 'text-red-600' : 'text-gray-900'}`}>
            {project.days_remaining !== null ? project.days_remaining : '∞'}
          </div>
          <div className="text-sm text-gray-500 mt-1">يوم متبقي</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { key: 'overview', label: 'نظرة عامة', icon: '📊' },
            { key: 'contributors', label: 'المساهمون', icon: '👥' },
            { key: 'data', label: 'البيانات', icon: '📋' },
            { key: 'report', label: 'التقرير', icon: '📝' },
            { key: 'export', label: 'التصدير', icon: '📄' },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className={`py-3 border-b-2 font-medium transition-colors flex items-center gap-2 ${
                tab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Project Info */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">📋 معلومات المشروع</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">القالب</dt>
                <dd className="font-medium">{project.template.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">المؤسسة</dt>
                <dd className="font-medium">{project.organization?.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">الفترة</dt>
                <dd className="font-medium">{project.period_start} إلى {project.period_end}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">الموعد النهائي</dt>
                <dd className="font-medium">{project.deadline || 'غير محدد'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">عدد البنود</dt>
                <dd className="font-medium">{project.template.items_count}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">عدد الجهات</dt>
                <dd className="font-medium">{project.template.entities_count}</dd>
              </div>
            </dl>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">⚡ إجراءات سريعة</h3>
            <div className="space-y-3">
              {project.status === 'collecting' && (
                <>
                  <button
                    onClick={handleInviteAll}
                    disabled={actionLoading}
                    className="btn btn-secondary w-full justify-center"
                  >
                    📧 إرسال دعوات للجهات
                  </button>
                  <button
                    onClick={handleRemindAll}
                    disabled={actionLoading}
                    className="btn btn-secondary w-full justify-center"
                  >
                    🔔 إرسال تذكيرات
                  </button>
                </>
              )}
              {project.status === 'reviewing' && (
                <Link
                  href={`/dashboard/projects/${project.id}/review`}
                  className="btn btn-secondary w-full justify-center"
                >
                  👁️ مراجعة البيانات
                </Link>
              )}
              {(project.status === 'reviewing' || project.status === 'generating') && (
                <button
                  onClick={() => handleGenerate('docx')}
                  disabled={actionLoading}
                  className="btn btn-primary w-full justify-center"
                >
                  🤖 توليد التقرير بالـ AI
                </button>
              )}
              {project.status === 'published' && (
                <Link
                  href={`/dashboard/projects/${project.id}/export`}
                  className="btn btn-primary w-full justify-center"
                >
                  📥 تحميل التقرير
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'contributors' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">المساهمون ({project.contributors.length})</h3>
            <div className="flex gap-2">
              <button onClick={handleInviteAll} disabled={actionLoading} className="btn btn-secondary text-sm">
                📧 إرسال الدعوات
              </button>
              <button onClick={handleRemindAll} disabled={actionLoading} className="btn btn-secondary text-sm">
                🔔 تذكير
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-right">
                  <th className="pb-3 font-medium text-gray-500">الجهة</th>
                  <th className="pb-3 font-medium text-gray-500">المسؤول</th>
                  <th className="pb-3 font-medium text-gray-500">الحالة</th>
                  <th className="pb-3 font-medium text-gray-500">التقدم</th>
                  <th className="pb-3 font-medium text-gray-500">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {project.contributors.map((contributor) => (
                  <tr key={contributor.id} className="border-b last:border-0">
                    <td className="py-3">
                      <div className="font-medium">{contributor.entity_name}</div>
                      <div className="text-gray-500 text-xs">{contributor.items_count} بند</div>
                    </td>
                    <td className="py-3">
                      <div>{contributor.name || '-'}</div>
                      <div className="text-gray-500 text-xs">{contributor.email || '-'}</div>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${contributorStatusColors[contributor.status]}`}>
                        {contributorStatusLabels[contributor.status]}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-100 rounded-full">
                          <div className="h-full bg-blue-600 rounded-full" style={{ width: `${contributor.progress}%` }} />
                        </div>
                        <span className="text-gray-600">{contributor.completed_items_count}/{contributor.items_count}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyInviteLink(contributor.invite_token)}
                          className="text-blue-600 hover:text-blue-700 text-xs"
                        >
                          🔗 نسخ الرابط
                        </button>
                        <Link
                          href={`/contribute/${contributor.invite_token}`}
                          target="_blank"
                          className="text-gray-500 hover:text-gray-700 text-xs"
                        >
                          ↗ فتح
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'data' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">البيانات المُجمّعة ({responses.length} بند)</h3>
            <Link
              href={`/dashboard/projects/${project.id}/review`}
              className="btn btn-secondary text-sm"
            >
              👁️ مراجعة وتعديل
            </Link>
          </div>

          {responses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📊</div>
              <p>لم يتم إدخال بيانات بعد</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-right">
                    <th className="pb-3 font-medium text-gray-500">الكود</th>
                    <th className="pb-3 font-medium text-gray-500">البند</th>
                    <th className="pb-3 font-medium text-gray-500">القيمة</th>
                    <th className="pb-3 font-medium text-gray-500">المحور</th>
                  </tr>
                </thead>
                <tbody>
                  {responses.slice(0, 20).map((response: any) => (
                    <tr key={response.id || response.code} className="border-b last:border-0">
                      <td className="py-2 font-mono text-blue-600">{response.code}</td>
                      <td className="py-2">{response.name}</td>
                      <td className="py-2 font-medium">
                        {response.value !== null ? (
                          typeof response.value === 'number' ?
                            response.value.toLocaleString('ar') :
                            String(response.value)
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                        {response.unit && <span className="text-gray-500 mr-1">{response.unit}</span>}
                      </td>
                      <td className="py-2 text-gray-500">{response.axis}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {responses.length > 20 && (
                <p className="text-center text-gray-500 text-sm mt-4">
                  عرض أول 20 من {responses.length} بند
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'report' && (
        <ReportTab projectId={projectId} />
      )}

      {tab === 'export' && (
        <ExportTab
          project={project}
          actionLoading={actionLoading}
          generatingReport={generatingReport}
          onGenerate={handleGenerate}
          onClearReport={() => { setGeneratingReport(null); loadProject(); }}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
}


// ==========================================
// Report Tab — Skeleton Preview + AI Generation + Review
// ==========================================

interface Structure {
  id: string;
  item: number;
  item_code: string;
  item_name: string;
  components: any[];
  is_approved: boolean;
}

interface GeneratedContent {
  id: string;
  item_structure: string;
  component_id: string;
  content: string;
  manual_edit: string | null;
  status: string;
  version: number;
}

function ReportTab({ projectId }: { projectId: string }) {
  const [structures, setStructures] = useState<Structure[]>([]);
  const [contents, setContents] = useState<GeneratedContent[]>([]);
  const [skeletonStatus, setSkeletonStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatingParagraph, setGeneratingParagraph] = useState<string | null>(null);
  const [reportToast, setReportToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [editingStructure, setEditingStructure] = useState<string | null>(null);
  // Table inline editing
  const [tableDataMap, setTableDataMap] = useState<Record<string, any>>({});
  const [detailedResponseMap, setDetailedResponseMap] = useState<Record<string, any>>({});
  const [expandedTable, setExpandedTable] = useState<string | null>(null);
  const [editingTableCell, setEditingTableCell] = useState<{ tableKey: string; rowIdx: number; colKey: string } | null>(null);
  // Chart type editing
  const [editingChartType, setEditingChartType] = useState<string | null>(null);
  function showMsg(message: string, type: 'success' | 'error' = 'error') {
    setReportToast({ message, type });
    setTimeout(() => setReportToast(null), 4000);
  }

  async function handleMoveComponent(structureId: string, compIdx: number, direction: 'up' | 'down') {
    const structure = structures.find(s => s.id === structureId);
    if (!structure || !structure.components) return;
    const comps = [...structure.components];
    const targetIdx = direction === 'up' ? compIdx - 1 : compIdx + 1;
    if (targetIdx < 0 || targetIdx >= comps.length) return;
    [comps[compIdx], comps[targetIdx]] = [comps[targetIdx], comps[compIdx]];
    try {
      await api.structures.update(structureId, { components: comps });
      setStructures(prev => prev.map(s => s.id === structureId ? { ...s, components: comps } : s));
    } catch (e: any) {
      showMsg(e.message || 'حدث خطأ');
    }
  }

  async function handleAddComponent(structureId: string, type: 'paragraph' | 'table' | 'chart' | 'heading') {
    const structure = structures.find(s => s.id === structureId);
    if (!structure) return;
    const comps = [...(structure.components || [])];
    const prefix = type === 'paragraph' ? 'p' : type === 'table' ? 't' : type === 'chart' ? 'c' : 'h';
    const existingIds = comps.filter(c => c.id?.startsWith(prefix)).map(c => parseInt(c.id?.slice(1) || '0'));
    const nextNum = Math.max(0, ...existingIds) + 1;
    const newComp: any = {
      id: `${prefix}${nextNum}`,
      type,
      title: type === 'paragraph' ? `فقرة ${nextNum}` : type === 'table' ? `جدول ${nextNum}` : type === 'chart' ? `شكل ${nextNum}` : `عنوان فرعي`,
      order: comps.length + 1,
    };
    if (type === 'paragraph') newComp.references = [];
    comps.push(newComp);
    try {
      await api.structures.update(structureId, { components: comps });
      setStructures(prev => prev.map(s => s.id === structureId ? { ...s, components: comps } : s));
      showMsg('تمت الإضافة', 'success');
    } catch (e: any) {
      showMsg(e.message || 'حدث خطأ');
    }
  }

  async function handleRemoveComponent(structureId: string, compIdx: number) {
    const structure = structures.find(s => s.id === structureId);
    if (!structure || !structure.components) return;
    const comps = structure.components.filter((_: any, i: number) => i !== compIdx);
    try {
      await api.structures.update(structureId, { components: comps });
      setStructures(prev => prev.map(s => s.id === structureId ? { ...s, components: comps } : s));
    } catch (e: any) {
      showMsg(e.message || 'حدث خطأ');
    }
  }

  async function handleUpdateComponentTitle(structureId: string, compIdx: number, title: string) {
    const structure = structures.find(s => s.id === structureId);
    if (!structure || !structure.components) return;
    const comps = [...structure.components];
    comps[compIdx] = { ...comps[compIdx], title };
    try {
      await api.structures.update(structureId, { components: comps });
      setStructures(prev => prev.map(s => s.id === structureId ? { ...s, components: comps } : s));
    } catch (e: any) {
      showMsg(e.message || 'حدث خطأ');
    }
  }
  // Table data editing functions
  function getTableDataForComponent(structure: Structure, comp: any): { source: 'table_data' | 'detailed_response'; data: any; id: string } | null {
    // Try DetailedResponse first (by item)
    const itemDrs = detailedResponseMap[`item_${structure.item}`];
    if (Array.isArray(itemDrs)) {
      const match = itemDrs.find((dr: any) => dr.data_source === comp.data_source || dr.data_type === 'table');
      if (match && match.data?.rows) return { source: 'detailed_response', data: match, id: match.id };
      if (itemDrs.length > 0 && itemDrs[0].data?.rows) return { source: 'detailed_response', data: itemDrs[0], id: itemDrs[0].id };
    }
    // Try TableData by table_ref
    if (comp.table_ref && tableDataMap[comp.table_ref]) {
      const td = tableDataMap[comp.table_ref];
      return { source: 'table_data', data: td, id: td.id };
    }
    return null;
  }

  async function handleTableCellEdit(tableInfo: { source: string; id: string; data: any }, rowIdx: number, colKey: string, newValue: string) {
    try {
      if (tableInfo.source === 'detailed_response') {
        const newData = { ...tableInfo.data.data };
        const newRows = [...newData.rows];
        newRows[rowIdx] = { ...newRows[rowIdx], [colKey]: newValue };
        newData.rows = newRows;
        await api.detailedResponses.updateData(tableInfo.id, newData);
        // Update local state
        setDetailedResponseMap(prev => {
          const updated = { ...prev };
          for (const key of Object.keys(updated)) {
            if (Array.isArray(updated[key])) {
              updated[key] = updated[key].map((dr: any) =>
                dr.id === tableInfo.id ? { ...dr, data: newData } : dr
              );
            } else if (updated[key]?.id === tableInfo.id) {
              updated[key] = { ...updated[key], data: newData };
            }
          }
          return updated;
        });
      } else {
        const newRows = [...tableInfo.data.rows];
        newRows[rowIdx] = { ...newRows[rowIdx], [colKey]: newValue };
        await api.tableData.updateRows(tableInfo.id, newRows);
        setTableDataMap(prev => ({
          ...prev,
          [tableInfo.data.table_definition]: { ...tableInfo.data, rows: newRows },
        }));
      }
      setEditingTableCell(null);
      showMsg('تم حفظ التعديل', 'success');
    } catch (e: any) {
      showMsg(e.message || 'حدث خطأ في حفظ التعديل');
    }
  }

  async function handleAddRow(tableInfo: { source: string; id: string; data: any }) {
    try {
      if (tableInfo.source === 'detailed_response') {
        const newData = { ...tableInfo.data.data };
        const headers = newData.headers || [];
        const emptyRow: Record<string, string> = {};
        headers.forEach((h: string) => { emptyRow[h] = ''; });
        newData.rows = [...(newData.rows || []), emptyRow];
        await api.detailedResponses.updateData(tableInfo.id, newData);
        setDetailedResponseMap(prev => {
          const updated = { ...prev };
          for (const key of Object.keys(updated)) {
            if (Array.isArray(updated[key])) {
              updated[key] = updated[key].map((dr: any) =>
                dr.id === tableInfo.id ? { ...dr, data: newData } : dr
              );
            }
          }
          return updated;
        });
      } else {
        const firstRow = tableInfo.data.rows?.[0] || {};
        const emptyRow: Record<string, string> = {};
        Object.keys(firstRow).forEach(k => { emptyRow[k] = ''; });
        const newRows = [...(tableInfo.data.rows || []), emptyRow];
        await api.tableData.updateRows(tableInfo.id, newRows);
        setTableDataMap(prev => ({
          ...prev,
          [tableInfo.data.table_definition]: { ...tableInfo.data, rows: newRows },
        }));
      }
      showMsg('تمت إضافة صف', 'success');
    } catch (e: any) {
      showMsg(e.message || 'حدث خطأ');
    }
  }

  async function handleDeleteRow(tableInfo: { source: string; id: string; data: any }, rowIdx: number) {
    try {
      if (tableInfo.source === 'detailed_response') {
        const newData = { ...tableInfo.data.data };
        newData.rows = newData.rows.filter((_: any, i: number) => i !== rowIdx);
        await api.detailedResponses.updateData(tableInfo.id, newData);
        setDetailedResponseMap(prev => {
          const updated = { ...prev };
          for (const key of Object.keys(updated)) {
            if (Array.isArray(updated[key])) {
              updated[key] = updated[key].map((dr: any) =>
                dr.id === tableInfo.id ? { ...dr, data: newData } : dr
              );
            }
          }
          return updated;
        });
      } else {
        const newRows = tableInfo.data.rows.filter((_: any, i: number) => i !== rowIdx);
        await api.tableData.updateRows(tableInfo.id, newRows);
        setTableDataMap(prev => ({
          ...prev,
          [tableInfo.data.table_definition]: { ...tableInfo.data, rows: newRows },
        }));
      }
      showMsg('تم حذف الصف', 'success');
    } catch (e: any) {
      showMsg(e.message || 'حدث خطأ');
    }
  }

  // Chart type change function
  async function handleChangeChartType(structureId: string, compIdx: number, newType: string) {
    const structure = structures.find(s => s.id === structureId);
    if (!structure || !structure.components) return;
    const comps = [...structure.components];
    comps[compIdx] = { ...comps[compIdx], chart_type: newType };
    try {
      await api.structures.update(structureId, { components: comps });
      setStructures(prev => prev.map(s => s.id === structureId ? { ...s, components: comps } : s));
      setEditingChartType(null);
      showMsg('تم تغيير نوع الشكل', 'success');
    } catch (e: any) {
      showMsg(e.message || 'حدث خطأ');
    }
  }

  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const editRef = useRef<HTMLTextAreaElement>(null);
  const [regeneratePrompt, setRegeneratePrompt] = useState<string | null>(null); // content ID being prompted
  const [regenerateInstructions, setRegenerateInstructions] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [structData, contentData, statusData, tdData, drData] = await Promise.all([
        api.structures.list(projectId).catch(() => ({ results: [] })),
        api.generatedContents.list({ project: projectId }).catch(() => ({ results: [] })),
        api.projects.skeletonStatus(projectId).catch(() => null),
        api.tableData.list({ project: projectId }).catch(() => ({ results: [] })),
        api.detailedResponses.list({ project: projectId }).catch(() => ({ results: [] })),
      ]);
      setStructures(structData.results || structData || []);
      setContents(contentData.results || contentData || []);
      setSkeletonStatus(statusData);
      // Build maps for quick lookup
      const tdList = tdData.results || tdData || [];
      const drList = drData.results || drData || [];
      const tdMap: Record<string, any> = {};
      tdList.forEach((td: any) => { tdMap[td.table_definition] = td; });
      setTableDataMap(tdMap);
      const drMap: Record<string, any> = {};
      drList.forEach((dr: any) => {
        const key = `${dr.item}_${dr.data_source || dr.id}`;
        drMap[key] = dr;
        // Also map by item for general lookup
        if (!drMap[`item_${dr.item}`]) drMap[`item_${dr.item}`] = [];
        if (Array.isArray(drMap[`item_${dr.item}`])) drMap[`item_${dr.item}`].push(dr);
      });
      setDetailedResponseMap(drMap);
    } catch (e) {
      console.error('Failed to load report data:', e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleBuildSkeleton() {
    setGenerating(true);
    try {
      await api.projects.buildSkeleton(projectId);
      await loadData();
    } catch (e: any) {
      showMsg(e.message || 'حدث خطأ في بناء الهيكل');
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateAll() {
    setGenerating(true);
    try {
      await api.projects.generateText(projectId);
      // Poll for updates
      const poll = setInterval(async () => {
        const contentData = await api.generatedContents.list({ project: projectId }).catch(() => ({ results: [] }));
        const list = contentData.results || contentData || [];
        setContents(list);
        const stillGenerating = list.some((c: GeneratedContent) => c.status === 'generating');
        if (!stillGenerating) {
          clearInterval(poll);
          setGenerating(false);
        }
      }, 2000);
    } catch (e: any) {
      showMsg(e.message || 'حدث خطأ في التوليد');
      setGenerating(false);
    }
  }

  async function handleRegenerateParagraph(contentId: string, extraInstructions?: string) {
    setGeneratingParagraph(contentId);
    setRegeneratePrompt(null);
    setRegenerateInstructions('');
    try {
      await api.generatedContents.regenerate(contentId, extraInstructions ? { extra_instructions: extraInstructions } : undefined);
      // Poll for this specific content
      const poll = setInterval(async () => {
        try {
          const updated = await api.generatedContents.get(contentId);
          setContents(prev => prev.map(c => c.id === contentId ? updated : c));
          if (updated.status !== 'generating') {
            clearInterval(poll);
            setGeneratingParagraph(null);
          }
        } catch {
          clearInterval(poll);
          setGeneratingParagraph(null);
        }
      }, 1500);
    } catch (e: any) {
      showMsg(e.message || 'حدث خطأ');
      setGeneratingParagraph(null);
    }
  }

  async function handleEditSave(contentId: string) {
    try {
      const updated = await api.generatedContents.edit(contentId, editText);
      setContents(prev => prev.map(c => c.id === contentId ? updated : c));
      setEditingContent(null);
    } catch (e: any) {
      showMsg(e.message || 'حدث خطأ في الحفظ');
    }
  }

  async function handleApprove(contentId: string) {
    try {
      const updated = await api.generatedContents.approve(contentId);
      setContents(prev => prev.map(c => c.id === contentId ? updated : c));
    } catch (e: any) {
      showMsg(e.message || 'حدث خطأ');
    }
  }

  function getContentForComponent(structureId: string, componentId: string) {
    return contents.find(c => c.item_structure === structureId && c.component_id === componentId);
  }

  const statusLabels: Record<string, { label: string; color: string }> = {
    not_started: { label: 'لم يبدأ', color: 'bg-gray-100 text-gray-600' },
    generating: { label: 'جاري التوليد...', color: 'bg-blue-100 text-blue-700 animate-pulse' },
    generated: { label: 'تم التوليد', color: 'bg-blue-100 text-blue-700' },
    edited: { label: 'معدّل', color: 'bg-purple-100 text-purple-700' },
    approved: { label: 'معتمد', color: 'bg-green-100 text-green-700' },
    failed: { label: 'فشل', color: 'bg-red-100 text-red-700' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // No structures yet
  if (structures.length === 0) {
    return (
      <div className="card text-center py-12">
        <div className="text-5xl mb-4">🏗️</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">لم يُبنَ الهيكل بعد</h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          ابنِ هيكل التقرير أولاً. سيتم إنشاء الجداول والأشكال من البيانات، مع فراغات للنصوص التي سيكتبها الـ AI.
        </p>
        <button
          onClick={handleBuildSkeleton}
          disabled={generating}
          className="btn btn-primary text-lg px-8 py-3"
        >
          {generating ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              جاري البناء...
            </span>
          ) : (
            '🏗️ بناء الهيكل'
          )}
        </button>
      </div>
    );
  }

  // Count stats
  const totalParagraphs = contents.length;
  const generatedCount = contents.filter(c => ['generated', 'edited', 'approved'].includes(c.status)).length;
  const approvedCount = contents.filter(c => c.status === 'approved').length;
  const pendingCount = contents.filter(c => c.status === 'not_started').length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {reportToast && (
        <Toast message={reportToast.message} type={reportToast.type} onClose={() => setReportToast(null)} />
      )}

      {/* Report Stats & Actions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">هيكل التقرير</h3>
            <p className="text-sm text-gray-500">
              {structures.length} بند • {totalParagraphs} فقرة • {generatedCount} مولّدة • {approvedCount} معتمدة
            </p>
          </div>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <button
                onClick={handleGenerateAll}
                disabled={generating}
                className="btn btn-primary"
              >
                {generating ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    جاري التوليد...
                  </span>
                ) : (
                  `✨ ولّد ${pendingCount} فقرة`
                )}
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {totalParagraphs > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${(approvedCount / totalParagraphs) * 100}%` }}
                title={`${approvedCount} معتمدة`}
              />
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${((generatedCount - approvedCount) / totalParagraphs) * 100}%` }}
                title={`${generatedCount - approvedCount} مولّدة`}
              />
            </div>
            <span className="text-sm font-medium text-gray-600">
              {Math.round((generatedCount / totalParagraphs) * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Structures List */}
      {structures.map((structure) => {
        const isEditing = editingStructure === structure.id;
        return (
        <div key={structure.id} className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">
              <span className="text-blue-600 font-mono">{structure.item_code}</span>
              {' '}{structure.item_name}
            </h3>
            <div className="flex items-center gap-2">
              {structure.is_approved && (
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                  ✓ معتمد
                </span>
              )}
              <button
                onClick={() => setEditingStructure(isEditing ? null : structure.id)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                  isEditing ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isEditing ? '✓ إنهاء التعديل' : '⚙️ تعديل الهيكل'}
              </button>
            </div>
          </div>

          {/* Structure Editor */}
          {isEditing && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-700 mb-3 font-medium">اسحب المكونات لإعادة ترتيبها، أو أضف مكونات جديدة:</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleAddComponent(structure.id, 'paragraph')} className="text-xs bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">+ فقرة</button>
                <button onClick={() => handleAddComponent(structure.id, 'table')} className="text-xs bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">+ جدول</button>
                <button onClick={() => handleAddComponent(structure.id, 'chart')} className="text-xs bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">+ شكل</button>
                <button onClick={() => handleAddComponent(structure.id, 'heading')} className="text-xs bg-white border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">+ عنوان</button>
              </div>
            </div>
          )}

          {/* Components */}
          <div className="space-y-3">
            {(structure.components || []).map((comp: any, compIdx: number) => {
              const gc = getContentForComponent(structure.id, comp.id);
              const isEditingComp = editingContent === gc?.id;
              const isGeneratingThis = generatingParagraph === gc?.id;
              const isStructEditing = editingStructure === structure.id;
              const totalComps = (structure.components || []).length;

              // Edit controls wrapper
              const EditControls = () => !isStructEditing ? null : (
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleMoveComponent(structure.id, compIdx, 'up')} disabled={compIdx === 0} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 p-1" title="لأعلى">↑</button>
                  <button onClick={() => handleMoveComponent(structure.id, compIdx, 'down')} disabled={compIdx === totalComps - 1} className="text-gray-400 hover:text-gray-700 disabled:opacity-30 p-1" title="لأسفل">↓</button>
                  <button onClick={() => handleRemoveComponent(structure.id, compIdx)} className="text-red-400 hover:text-red-600 p-1" title="حذف">×</button>
                </div>
              );

              if (comp.type === 'heading') {
                return (
                  <div key={comp.id} className="py-2 flex items-center justify-between">
                    {isStructEditing ? (
                      <input
                        defaultValue={comp.title}
                        onBlur={(e) => handleUpdateComponentTitle(structure.id, compIdx, e.target.value)}
                        className="font-semibold text-gray-700 text-sm border-b border-blue-300 pb-1 bg-transparent focus:outline-none flex-1"
                      />
                    ) : (
                      <h4 className="font-semibold text-gray-700 text-sm border-b border-gray-100 pb-1 flex-1">
                        {comp.title}
                      </h4>
                    )}
                    <EditControls />
                  </div>
                );
              }

              if (comp.type === 'table') {
                const tableKey = `${structure.id}_${comp.id}`;
                const tableInfo = getTableDataForComponent(structure, comp);
                const isExpanded = expandedTable === tableKey;
                const tableRows = tableInfo?.source === 'detailed_response'
                  ? tableInfo.data?.data?.rows || []
                  : tableInfo?.data?.rows || [];
                const tableHeaders = tableInfo?.source === 'detailed_response'
                  ? tableInfo.data?.data?.headers || (tableRows[0] ? Object.keys(tableRows[0]) : [])
                  : (tableRows[0] ? Object.keys(tableRows[0]).filter(k => !k.startsWith('_')) : []);

                return (
                  <div key={comp.id} className="border border-amber-200 rounded-lg overflow-hidden">
                    <div className="p-3 bg-amber-50 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm flex-1">
                        <span className="font-mono text-amber-600">{comp.id}</span>
                        {isStructEditing ? (
                          <input
                            defaultValue={comp.title || 'جدول'}
                            onBlur={(e) => handleUpdateComponentTitle(structure.id, compIdx, e.target.value)}
                            className="font-medium text-gray-700 bg-transparent border-b border-amber-300 focus:outline-none"
                          />
                        ) : (
                          <span className="font-medium text-gray-700">📊 {comp.title || 'جدول'}</span>
                        )}
                        <span className="text-xs text-amber-500">({tableRows.length} صف)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {tableInfo && (
                          <button
                            onClick={() => setExpandedTable(isExpanded ? null : tableKey)}
                            className="text-xs text-amber-600 hover:text-amber-700 px-2 py-1 rounded hover:bg-amber-100"
                          >
                            {isExpanded ? '▲ إخفاء' : '▼ عرض وتعديل'}
                          </button>
                        )}
                        <EditControls />
                      </div>
                    </div>
                    {isExpanded && tableInfo && (
                      <div className="p-3 border-t border-amber-200 overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-amber-100">
                              <th className="px-2 py-1 text-right text-xs font-semibold text-amber-800 border border-amber-200 w-8">#</th>
                              {tableHeaders.map((h: string) => (
                                <th key={h} className="px-2 py-1 text-right text-xs font-semibold text-amber-800 border border-amber-200">
                                  {h}
                                </th>
                              ))}
                              <th className="px-1 py-1 border border-amber-200 w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {tableRows.map((row: any, rIdx: number) => (
                              <tr key={rIdx} className="hover:bg-amber-50">
                                <td className="px-2 py-1 text-xs text-gray-400 border border-amber-100 text-center">{rIdx + 1}</td>
                                {tableHeaders.map((h: string) => {
                                  const isEditingThisCell = editingTableCell?.tableKey === tableKey && editingTableCell?.rowIdx === rIdx && editingTableCell?.colKey === h;
                                  return (
                                    <td
                                      key={h}
                                      className="px-2 py-1 text-xs border border-amber-100 cursor-pointer hover:bg-amber-100"
                                      onClick={() => {
                                        if (!isEditingThisCell) setEditingTableCell({ tableKey, rowIdx: rIdx, colKey: h });
                                      }}
                                    >
                                      {isEditingThisCell ? (
                                        <input
                                          autoFocus
                                          defaultValue={row[h] ?? ''}
                                          onBlur={(e) => handleTableCellEdit(tableInfo, rIdx, h, e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                            if (e.key === 'Escape') setEditingTableCell(null);
                                          }}
                                          className="w-full px-1 py-0 text-xs border border-blue-400 rounded focus:ring-1 focus:ring-blue-500"
                                          dir="auto"
                                        />
                                      ) : (
                                        <span>{row[h] ?? ''}</span>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="px-1 py-1 border border-amber-100 text-center">
                                  <button
                                    onClick={() => handleDeleteRow(tableInfo, rIdx)}
                                    className="text-red-400 hover:text-red-600 text-xs"
                                    title="حذف صف"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <button
                          onClick={() => handleAddRow(tableInfo)}
                          className="mt-2 text-xs text-amber-600 hover:text-amber-700 px-3 py-1 border border-amber-300 rounded hover:bg-amber-50"
                        >
                          + إضافة صف
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              if (comp.type === 'chart') {
                const chartKey = `${structure.id}_${comp.id}`;
                const chartTypes = [
                  { value: 'pie', label: 'دائري', icon: '🥧' },
                  { value: 'bar', label: 'أعمدة', icon: '📊' },
                  { value: 'line', label: 'خطي', icon: '📈' },
                  { value: 'donut', label: 'حلقي', icon: '🍩' },
                ];
                const currentType = comp.chart_type || 'pie';
                const isEditingType = editingChartType === chartKey;

                return (
                  <div key={comp.id} className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm flex-1">
                        <span className="font-mono text-purple-600">{comp.id}</span>
                        {isStructEditing ? (
                          <input
                            defaultValue={comp.title || 'شكل'}
                            onBlur={(e) => handleUpdateComponentTitle(structure.id, compIdx, e.target.value)}
                            className="font-medium text-gray-700 bg-transparent border-b border-purple-300 focus:outline-none"
                          />
                        ) : (
                          <span className="font-medium text-gray-700">📈 {comp.title || 'شكل'}</span>
                        )}
                        <span className="text-xs text-purple-500 bg-purple-100 px-2 py-0.5 rounded">
                          {chartTypes.find(t => t.value === currentType)?.icon} {chartTypes.find(t => t.value === currentType)?.label || currentType}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingChartType(isEditingType ? null : chartKey)}
                          className="text-xs text-purple-600 hover:text-purple-700 px-2 py-1 rounded hover:bg-purple-100"
                          title="تغيير نوع الشكل"
                        >
                          🔄 النوع
                        </button>
                        <EditControls />
                      </div>
                    </div>
                    {isEditingType && (
                      <div className="mt-2 flex items-center gap-2 pt-2 border-t border-purple-200">
                        {chartTypes.map(ct => (
                          <button
                            key={ct.value}
                            onClick={() => handleChangeChartType(structure.id, compIdx, ct.value)}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                              currentType === ct.value
                                ? 'bg-purple-600 text-white border-purple-600'
                                : 'bg-white text-purple-700 border-purple-300 hover:bg-purple-100'
                            }`}
                          >
                            {ct.icon} {ct.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              if (comp.type === 'paragraph') {
                const status = gc ? statusLabels[gc.status] || statusLabels.not_started : statusLabels.not_started;
                const displayContent = gc?.manual_edit || gc?.content;

                return (
                  <div key={comp.id} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Paragraph Header */}
                    <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-mono text-gray-500">{comp.id}</span>
                        <span className="text-gray-600">{comp.title || 'فقرة'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                        {gc && gc.status !== 'not_started' && gc.status !== 'generating' && (
                          <>
                            <button
                              onClick={() => {
                                if (regeneratePrompt === gc.id) {
                                  setRegeneratePrompt(null);
                                } else {
                                  setRegeneratePrompt(gc.id);
                                  setRegenerateInstructions('');
                                }
                              }}
                              disabled={isGeneratingThis}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                              title="إعادة توليد (مع تعليمات اختيارية)"
                            >
                              🔄
                            </button>
                            <button
                              onClick={() => {
                                setEditingContent(gc.id);
                                setEditText(gc.manual_edit || gc.content || '');
                                setTimeout(() => editRef.current?.focus(), 100);
                              }}
                              className="text-xs text-gray-600 hover:text-gray-700 font-medium"
                              title="تعديل"
                            >
                              ✏️
                            </button>
                            {gc.status !== 'approved' && (
                              <button
                                onClick={() => handleApprove(gc.id)}
                                className="text-xs text-green-600 hover:text-green-700 font-medium"
                                title="اعتماد"
                              >
                                ✅
                              </button>
                            )}
                          </>
                        )}
                        <EditControls />
                      </div>
                    </div>

                    {/* Regenerate with instructions */}
                    {regeneratePrompt === gc?.id && (
                      <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={regenerateInstructions}
                            onChange={(e) => setRegenerateInstructions(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRegenerateParagraph(gc!.id, regenerateInstructions || undefined);
                            }}
                            placeholder="تعليمات إضافية (اختياري) — مثلاً: اجعلها أقصر، أضف تفاصيل..."
                            className="flex-1 text-sm px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            dir="rtl"
                            autoFocus
                          />
                          <button
                            onClick={() => handleRegenerateParagraph(gc!.id, regenerateInstructions || undefined)}
                            className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 whitespace-nowrap"
                          >
                            أعد التوليد
                          </button>
                          <button
                            onClick={() => setRegeneratePrompt(null)}
                            className="text-sm text-gray-500 hover:text-gray-700 px-2 py-2"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Content */}
                    <div className="p-4">
                      {isGeneratingThis && (
                        <div className="flex items-center gap-3 text-blue-600">
                          <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                          <span className="text-sm">جاري توليد النص...</span>
                        </div>
                      )}

                      {isEditing && gc ? (
                        <div className="space-y-3">
                          <textarea
                            ref={editRef}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full h-32 p-3 border border-gray-300 rounded-lg text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            dir="rtl"
                          />
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => setEditingContent(null)}
                              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1"
                            >
                              إلغاء
                            </button>
                            <button
                              onClick={() => handleEditSave(gc.id)}
                              className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700"
                            >
                              حفظ التعديل
                            </button>
                          </div>
                        </div>
                      ) : displayContent ? (
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                          {displayContent}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">
                          في انتظار التوليد — اضغط "ولّد" لتوليد النصوص
                        </p>
                      )}
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
        );
      })}
    </div>
  );
}


// ==========================================
// Export Tab — Preview + Word/PDF + History
// ==========================================

function ExportTab({ project, actionLoading, generatingReport, onGenerate, onClearReport }: {
  project: Project;
  actionLoading: boolean;
  generatingReport: any;
  onGenerate: (format: string) => void;
  onClearReport: () => void;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  async function handlePreview() {
    setLoadingPreview(true);
    try {
      const data = await api.projects.skeletonStatus(project.id);
      if (data?.preview_html) {
        setPreviewHtml(data.preview_html);
      } else {
        // Fallback: fetch from export preview endpoint
        const preview = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api'}/reports/periods/${project.id}/export/preview/`,
          { headers: { Authorization: `Token ${localStorage.getItem('authToken')}` } }
        ).then(r => r.text()).catch(() => '');
        setPreviewHtml(preview || '<p style="text-align:center;color:#999;">المعاينة غير متوفرة — ولّد التقرير أولاً</p>');
      }
      setShowPreview(true);
    } catch {
      setPreviewHtml('<p style="text-align:center;color:#999;">المعاينة غير متوفرة</p>');
      setShowPreview(true);
    } finally {
      setLoadingPreview(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Generation Progress */}
      {generatingReport && generatingReport.status === 'processing' && (
        <div className="card p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="animate-spin h-6 w-6 border-3 border-blue-600 border-t-transparent rounded-full" />
              <div>
                <div className="font-medium text-gray-900">جاري توليد {generatingReport.format.toUpperCase()}</div>
                <div className="text-sm text-blue-600">{generatingReport.current_step}</div>
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-600">{generatingReport.progress}%</div>
          </div>
          <div className="h-3 bg-blue-200 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{ width: `${generatingReport.progress}%` }} />
          </div>
        </div>
      )}

      {/* Generation Complete */}
      {generatingReport && generatingReport.status === 'completed' && (
        <div className="card p-6 bg-green-50 border-green-200 text-center">
          <div className="text-4xl mb-2">✅</div>
          <div className="font-semibold text-gray-900 mb-1">تم توليد التقرير بنجاح!</div>
          <div className="text-sm text-gray-500 mb-4">يمكنك تحميله من قائمة التقارير أدناه</div>
          <button onClick={onClearReport} className="btn btn-primary">حسناً</button>
        </div>
      )}

      {/* Export Actions */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-2">تصدير التقرير</h3>
        <p className="text-sm text-gray-500 mb-5">اختر صيغة التصدير أو شاهد معاينة HTML</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Preview */}
          <button
            onClick={handlePreview}
            disabled={loadingPreview}
            className="p-5 rounded-xl border-2 border-gray-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-center group"
          >
            <div className="text-3xl mb-2">👁️</div>
            <div className="font-semibold text-gray-900 group-hover:text-indigo-700">معاينة HTML</div>
            <div className="text-xs text-gray-500 mt-1">شاهد التقرير قبل التصدير</div>
          </button>

          {/* Word */}
          <button
            onClick={() => onGenerate('docx')}
            disabled={actionLoading || generatingReport?.status === 'processing'}
            className="p-5 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="text-3xl mb-2">📝</div>
            <div className="font-semibold text-gray-900 group-hover:text-blue-700">Word (.docx)</div>
            <div className="text-xs text-gray-500 mt-1">قابل للتعديل</div>
          </button>

          {/* PDF */}
          <button
            onClick={() => onGenerate('pdf')}
            disabled={actionLoading || generatingReport?.status === 'processing'}
            className="p-5 rounded-xl border-2 border-red-200 hover:border-red-400 hover:bg-red-50 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="text-3xl mb-2">📕</div>
            <div className="font-semibold text-gray-900 group-hover:text-red-700">PDF</div>
            <div className="text-xs text-gray-500 mt-1">نسخة نهائية</div>
          </button>
        </div>
      </div>

      {/* HTML Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-900">معاينة التقرير</h3>
              <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
            </div>
            <div className="flex-1 overflow-auto p-1">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full min-h-[60vh] border-0 rounded-lg"
                title="Report Preview"
              />
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t">
              <button onClick={() => setShowPreview(false)} className="btn btn-secondary">إغلاق</button>
              <button onClick={() => { setShowPreview(false); onGenerate('docx'); }} className="btn btn-primary">📝 صدّر Word</button>
              <button onClick={() => { setShowPreview(false); onGenerate('pdf'); }} className="btn btn-primary bg-red-600 hover:bg-red-700">📕 صدّر PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Reports History */}
      {project.generated_reports.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">التقارير المولّدة ({project.generated_reports.length})</h3>
          <div className="space-y-3">
            {project.generated_reports.map((report: any) => (
              <div key={report.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-white shadow-sm">
                    {report.format === 'pdf' ? '📕' : '📝'}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{report.format.toUpperCase()}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(report.created_at).toLocaleDateString('ar', {
                        year: 'numeric', month: 'long', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {report.status === 'completed' && report.download_url && (
                    <a href={report.download_url} download className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                      📥 تحميل
                    </a>
                  )}
                  {report.status === 'processing' && (
                    <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium animate-pulse">
                      جاري التوليد {report.progress}%
                    </span>
                  )}
                  {report.status === 'failed' && (
                    <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                      فشل التوليد
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ==========================================
// Toast Notification Component
// ==========================================

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error' | 'info'; onClose: () => void }) {
  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4" dir="rtl">
      <div className={`${colors[type]} text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[300px]`}>
        <span className="text-lg">
          {type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
        </span>
        <span className="flex-1 text-sm font-medium">{message}</span>
        <button onClick={onClose} className="text-white/70 hover:text-white text-lg leading-none">&times;</button>
      </div>
    </div>
  );
}
