'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const [tab, setTab] = useState<'overview' | 'contributors' | 'data' | 'export'>('overview');
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
      alert(error.message || 'حدث خطأ');
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
      alert('تم إرسال الدعوات بنجاح');
    } catch (error: any) {
      alert(error.message || 'حدث خطأ');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRemindAll() {
    if (!project) return;
    setActionLoading(true);
    try {
      await api.projects.remind(projectId);
      alert('تم إرسال التذكيرات بنجاح');
    } catch (error: any) {
      alert(error.message || 'حدث خطأ');
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
      alert(error.message || 'حدث خطأ');
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
          alert('فشل التوليد: ' + (status.error_message || 'خطأ غير معروف'));
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
    alert('تم نسخ الرابط');
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

      {tab === 'export' && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">📄 تصدير التقرير</h3>

          {/* Generation Progress */}
          {generatingReport && generatingReport.status === 'processing' && (
            <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="animate-spin h-6 w-6 border-3 border-blue-600 border-t-transparent rounded-full"></div>
                  <div>
                    <div className="font-medium text-gray-900">جاري توليد {generatingReport.format.toUpperCase()}</div>
                    <div className="text-sm text-blue-600">{generatingReport.current_step}</div>
                  </div>
                </div>
                <div className="text-2xl font-bold text-blue-600">{generatingReport.progress}%</div>
              </div>
              <div className="h-3 bg-blue-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${generatingReport.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Generation Complete */}
          {generatingReport && generatingReport.status === 'completed' && (
            <div className="mb-6 p-6 bg-green-50 border border-green-200 rounded-xl text-center">
              <div className="text-4xl mb-2">✅</div>
              <div className="font-semibold text-gray-900 mb-1">تم توليد التقرير بنجاح!</div>
              <div className="text-sm text-gray-500 mb-4">يمكنك تحميله من قائمة التقارير أدناه</div>
              <button 
                onClick={() => { setGeneratingReport(null); loadProject(); }}
                className="btn btn-primary"
              >
                إغلاق
              </button>
            </div>
          )}

          {project.items_progress < 50 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2">⚠️</div>
              <p className="text-gray-600 mb-2">البيانات غير مكتملة</p>
              <p className="text-sm text-gray-500">أكمل {50 - project.items_progress}% على الأقل من البيانات للتصدير</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => handleGenerate('docx')}
                  disabled={actionLoading || (generatingReport?.status === 'processing')}
                  className="p-6 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-4xl mb-2">📝</div>
                  <div className="font-semibold text-gray-900">Word (.docx)</div>
                  <div className="text-sm text-gray-500">قابل للتعديل</div>
                </button>
                <button
                  onClick={() => handleGenerate('pdf')}
                  disabled={actionLoading || (generatingReport?.status === 'processing')}
                  className="p-6 rounded-xl border-2 border-red-200 hover:border-red-400 hover:bg-red-50 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="text-4xl mb-2">📕</div>
                  <div className="font-semibold text-gray-900">PDF</div>
                  <div className="text-sm text-gray-500">نسخة نهائية</div>
                </button>
              </div>

              {project.generated_reports.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">📚 التقارير المولّدة</h4>
                  <div className="space-y-2">
                    {project.generated_reports.map((report: any) => (
                      <div key={report.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">
                            {report.format === 'pdf' ? '📕' : '📝'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{report.format.toUpperCase()}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(report.created_at).toLocaleDateString('ar', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {report.status === 'completed' && report.download_url && (
                            <a 
                              href={report.download_url} 
                              download 
                              className="btn btn-primary text-sm"
                            >
                              📥 تحميل
                            </a>
                          )}
                          {report.status === 'processing' && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                              ⏳ {report.progress}%
                            </span>
                          )}
                          {report.status === 'failed' && (
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                              ❌ فشل
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
