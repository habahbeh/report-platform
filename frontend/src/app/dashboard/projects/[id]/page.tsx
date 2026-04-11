'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PageTransition } from '@/components/ui/motion';
import { Project, ResponseData, statusConfig } from './components/types';
import { Toast } from './components/Toast';
import { WorkflowStepper } from './components/WorkflowStepper';
import { OverviewTab } from './components/OverviewTab';
import { ContributorsTab } from './components/ContributorsTab';
import { SkeletonTab } from './components/SkeletonTab';
import { GenerateTab } from './components/GenerateTab';
import { ExportTab } from './components/ExportTab';
import { RefreshCw } from 'lucide-react';

type TabKey = 'overview' | 'contributors' | 'skeleton' | 'generate' | 'export';

const TABS: { key: TabKey; label: string; phase: string }[] = [
  { key: 'overview',      label: 'الإعداد',         phase: '1-2' },
  { key: 'contributors',  label: 'المساهمون',        phase: '3' },
  { key: 'skeleton',      label: 'الهيكل HTML',      phase: '4' },
  { key: 'generate',      label: 'توليد + مراجعة',  phase: '5-6' },
  { key: 'export',        label: 'التصدير',          phase: '7' },
];

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [tab, setTab] = useState<TabKey>('overview');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [generatingReport, setGeneratingReport] = useState<{
    id: string; status: string; progress: number; current_step: string; format: string;
  } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string; message: string; onConfirm: () => void;
  } | null>(null);

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }

  const loadProject = useCallback(async () => {
    try {
      const data = await api.projects.get(projectId);
      setProject(data);
      setLastUpdated(new Date());
    } catch { /* silent */ } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [loadProject]);

  async function updateStatus(newStatus: string) {
    if (!project) return;
    setActionLoading(true);
    try {
      await api.projects.update(projectId, { status: newStatus });
      await loadProject();
    } catch (e: any) { showToast(e.message || 'حدث خطأ', 'error'); }
    finally { setActionLoading(false); }
  }

  function requestUpdateStatus(newStatus: string) {
    const confirmMessages: Record<string, { title: string; message: string }> = {
      collecting: {
        title: 'بدء جمع البيانات',
        message: 'سيتمكن المساهمون من إدخال بياناتهم عبر رابط الدعوة.',
      },
      reviewing: {
        title: 'إنهاء جمع البيانات',
        message: 'بعد هذه الخطوة لن يتمكن المساهمون من تعديل بياناتهم. سيتم بناء الهيكل تلقائياً.',
      },
      generating: {
        title: 'بدء توليد النصوص',
        message: 'سيبدأ الذكاء الاصطناعي بكتابة الفقرات النصية من البيانات المُجمّعة.',
      },
      published: {
        title: 'نشر التقرير',
        message: 'سيُصبح التقرير جاهزاً للتصدير والمشاركة.',
      },
    };
    const config = confirmMessages[newStatus] || { title: 'تأكيد الإجراء', message: 'هل تريد المتابعة؟' };
    setConfirmAction({
      ...config,
      onConfirm: () => { setConfirmAction(null); updateStatus(newStatus); },
    });
  }

  async function handleInviteAll() {
    setActionLoading(true);
    try {
      await api.projects.invite(projectId);
      await loadProject();
      showToast('تم إرسال الدعوات بنجاح', 'success');
    } catch (e: any) { showToast(e.message || 'حدث خطأ', 'error'); }
    finally { setActionLoading(false); }
  }

  async function handleRemindAll() {
    setActionLoading(true);
    try {
      await api.projects.remind(projectId);
      showToast('تم إرسال التذكيرات بنجاح', 'success');
    } catch (e: any) { showToast(e.message || 'حدث خطأ', 'error'); }
    finally { setActionLoading(false); }
  }

  async function handleGenerate(format: string = 'docx') {
    setActionLoading(true);
    try {
      const result = await api.projects.generate(projectId, format);
      setGeneratingReport({ id: result.report_id, status: 'processing', progress: 0, current_step: 'بدء التوليد', format });
      setTab('export');
      pollGenerationStatus(result.report_id);
    } catch (e: any) { showToast(e.message || 'حدث خطأ في التوليد', 'error'); }
    finally { setActionLoading(false); }
  }

  function pollGenerationStatus(reportId: string) {
    const interval = setInterval(async () => {
      try {
        const reports = await api.projects.get(projectId);
        const report = reports.generated_reports?.find((r: any) => r.id === reportId);
        if (report) {
          setGeneratingReport(prev => prev ? { ...prev, status: report.status, progress: report.progress || 0, current_step: report.current_step || '' } : null);
          if (report.status !== 'processing') {
            clearInterval(interval);
            if (report.status === 'completed') {
              showToast('تم توليد التقرير بنجاح', 'success');
              loadProject();
            }
          }
        }
      } catch { clearInterval(interval); }
    }, 2000);
  }

  function copyInviteLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/contribute/${token}`);
    showToast('تم نسخ الرابط', 'success');
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48" />
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-64" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          </div>
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-24" />
        </div>
        <div className="h-28 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        <div className="h-12 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          ))}
        </div>
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
    <PageTransition>
    <div className="space-y-6">
      {/* Breadcrumb + Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/dashboard/projects" className="hover:text-gray-700 dark:hover:text-gray-300 shrink-0">
              المشاريع
            </Link>
            <span className="shrink-0">←</span>
            <span className="text-gray-900 dark:text-white truncate">{project.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">{project.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {project.period}{project.organization?.name ? ` · ${project.organization.name}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { setRefreshing(true); loadProject(); }}
            disabled={refreshing}
            title="تحديث البيانات"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          {lastUpdated && (
            <span className="text-xs text-gray-400 hidden sm:block">
              آخر تحديث {lastUpdated.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${currentStatus.color}`}>
            {currentStatus.label}
          </span>
        </div>
      </div>

      {/* Workflow Stepper */}
      <WorkflowStepper
        project={project}
        actionLoading={actionLoading}
        updateStatus={requestUpdateStatus}
      />

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-gray-500 dark:text-gray-400">البيانات</span>
          <span className="font-bold text-gray-900 dark:text-white">{project.items_progress}%</span>
          <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${project.items_progress}%` }} />
          </div>
        </div>
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 hidden sm:block" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-gray-500 dark:text-gray-400">المساهمون</span>
          <span className="font-bold text-gray-900 dark:text-white">{project.progress}%</span>
          <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${project.progress}%` }} />
          </div>
        </div>
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 hidden sm:block" />
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400">الجهات</span>
          <span className="font-bold text-gray-900 dark:text-white">{project.contributors_count}</span>
        </div>
        {project.days_remaining !== null && (
          <>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-gray-500 dark:text-gray-400">المتبقي</span>
              <span className={`font-bold ${project.days_remaining < 7 ? 'text-amber-600' : 'text-gray-900 dark:text-white'}`}>
                {project.days_remaining} يوم
              </span>
            </div>
          </>
        )}
      </div>

      {/* Phase Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map(({ key, label, phase }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium whitespace-nowrap transition-colors text-sm ${
                tab === key
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                tab === key
                  ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-500'
              }`}>{phase}</span>
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <OverviewTab
          project={project}
          actionLoading={actionLoading}
          updateStatus={requestUpdateStatus}
          handleInviteAll={handleInviteAll}
          handleRemindAll={handleRemindAll}
          handleGenerate={handleGenerate}
        />
      )}

      {tab === 'contributors' && (
        <ContributorsTab
          project={project}
          actionLoading={actionLoading}
          handleInviteAll={handleInviteAll}
          handleRemindAll={handleRemindAll}
          copyInviteLink={copyInviteLink}
        />
      )}

      {tab === 'skeleton' && (
        <SkeletonTab
          projectId={projectId}
          projectStatus={project.status}
          onMoveToGenerate={() => setTab('generate')}
        />
      )}

      {tab === 'generate' && (
        <GenerateTab
          projectId={projectId}
          projectStatus={project.status}
          showToast={showToast}
        />
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

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2">{confirmAction.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{confirmAction.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 btn btn-secondary"
              >
                إلغاء
              </button>
              <button
                onClick={confirmAction.onConfirm}
                className="flex-1 btn btn-primary"
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
    </PageTransition>
  );
}
