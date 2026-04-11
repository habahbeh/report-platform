'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PageTransition } from '@/components/ui/motion';
import { Project, statusConfig } from './components/types';
import { Toast } from './components/Toast';
import { ContributorsTab } from './components/ContributorsTab';
import { SkeletonTab } from './components/SkeletonTab';
import { GenerateTab } from './components/GenerateTab';
import { ExportTab } from './components/ExportTab';
import {
  RefreshCw, ChevronRight, ChevronDown, ChevronUp,
  CheckCircle, Lock, Settings, Users, FileCode2,
  Sparkles, Download, ClipboardList, ArrowLeft,
} from 'lucide-react';

// ═══════════════════════════════════════
// Mission Control — 6 workflow steps
// ═══════════════════════════════════════

interface WorkflowStep {
  id: number;
  key: string;
  label: string;
  desc: string;
  actionLabel: string;
  icon: any;
  requiredStatus: string[];  // project statuses where this step is active
  completedWhen: string[];   // project statuses where this step is done
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 1, key: 'setup', label: 'إعداد المشروع',
    desc: 'تم إنشاء المشروع وبناء الهيكل من القالب',
    actionLabel: '',
    icon: Settings,
    requiredStatus: ['draft'],
    completedWhen: ['collecting', 'reviewing', 'generating', 'published', 'archived'],
  },
  {
    id: 2, key: 'contributors', label: 'دعوة المساهمين',
    desc: 'أضف الجهات المسؤولة عن إدخال البيانات وأرسل لهم روابط الدعوة',
    actionLabel: 'أضف المساهمين وأرسل الدعوات',
    icon: Users,
    requiredStatus: ['draft', 'collecting'],
    completedWhen: ['reviewing', 'generating', 'published', 'archived'],
  },
  {
    id: 3, key: 'data', label: 'جمع البيانات',
    desc: 'المساهمون يدخلون بياناتهم عبر الرابط — تابع التقدم وأرسل تذكيرات للمتأخرين',
    actionLabel: 'تابع تقدم المساهمين',
    icon: ClipboardList,
    requiredStatus: ['collecting'],
    completedWhen: ['reviewing', 'generating', 'published', 'archived'],
  },
  {
    id: 4, key: 'skeleton', label: 'بناء هيكل التقرير',
    desc: 'البيانات جاهزة — ابنِ هيكل HTML للتقرير (جداول + أشكال + فراغات نصية)',
    actionLabel: 'ابنِ الهيكل الآن',
    icon: FileCode2,
    requiredStatus: ['reviewing'],
    completedWhen: ['generating', 'published', 'archived'],
  },
  {
    id: 5, key: 'generate', label: 'توليد النصوص ومراجعتها',
    desc: 'الذكاء الاصطناعي يكتب النصوص — راجع كل فقرة واعتمدها أو أعد توليدها',
    actionLabel: 'ولّد النصوص وراجعها',
    icon: Sparkles,
    requiredStatus: ['generating'],
    completedWhen: ['published', 'archived'],
  },
  {
    id: 6, key: 'export', label: 'تصدير التقرير النهائي',
    desc: 'التقرير جاهز — حمّله بصيغة Word أو PDF أو HTML',
    actionLabel: 'صدّر التقرير',
    icon: Download,
    requiredStatus: ['published', 'generating'],
    completedWhen: ['archived'],
  },
];

function getStepState(step: WorkflowStep, projectStatus: string): 'completed' | 'current' | 'locked' {
  if (step.completedWhen.includes(projectStatus)) return 'completed';
  if (step.requiredStatus.includes(projectStatus)) return 'current';
  return 'locked';
}

function getCurrentStepIndex(projectStatus: string): number {
  for (let i = WORKFLOW_STEPS.length - 1; i >= 0; i--) {
    if (WORKFLOW_STEPS[i].requiredStatus.includes(projectStatus)) return i;
  }
  return 0;
}

// ═══════════════════════════════════════
// Main Page Component
// ═══════════════════════════════════════

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedCompleted, setExpandedCompleted] = useState(false);
  const [overrideStep, setOverrideStep] = useState<string | null>(null);
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

  useEffect(() => { loadProject(); }, [loadProject]);

  async function updateStatus(newStatus: string) {
    if (!project) return;
    setActionLoading(true);
    try {
      await api.projects.update(projectId, { status: newStatus });
      setOverrideStep(null);
      await loadProject();
    } catch (e: any) { showToast(e.message || 'حدث خطأ', 'error'); }
    finally { setActionLoading(false); }
  }

  function requestUpdateStatus(newStatus: string) {
    const confirmMessages: Record<string, { title: string; message: string }> = {
      collecting: { title: 'بدء جمع البيانات', message: 'سيتمكن المساهمون من إدخال بياناتهم عبر رابط الدعوة.' },
      reviewing:  { title: 'إنهاء جمع البيانات', message: 'بعد هذه الخطوة لن يتمكن المساهمون من تعديل بياناتهم.' },
      generating: { title: 'بدء توليد النصوص', message: 'سيبدأ الذكاء الاصطناعي بكتابة الفقرات النصية.' },
      published:  { title: 'نشر التقرير', message: 'سيُصبح التقرير جاهزاً للتصدير.' },
    };
    const config = confirmMessages[newStatus] || { title: 'تأكيد', message: 'هل تريد المتابعة؟' };
    setConfirmAction({ ...config, onConfirm: () => { setConfirmAction(null); updateStatus(newStatus); } });
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
            if (report.status === 'completed') { showToast('تم توليد التقرير بنجاح', 'success'); loadProject(); }
          }
        }
      } catch { clearInterval(interval); }
    }, 2000);
  }

  function copyInviteLink(token: string) {
    navigator.clipboard.writeText(`${window.location.origin}/contribute/${token}`);
    showToast('تم نسخ الرابط', 'success');
  }

  // ── Loading / Not Found ──
  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48" />
        <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-64" />
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">المشروع غير موجود</p>
        <Link href="/dashboard/projects" className="text-blue-600 hover:underline mt-2 inline-block">العودة للمشاريع</Link>
      </div>
    );
  }

  // ── Computed values ──
  const currentStatus = statusConfig[project.status];
  const currentStepIdx = getCurrentStepIndex(project.status);
  const completedSteps = WORKFLOW_STEPS.filter(s => getStepState(s, project.status) === 'completed');
  const currentSteps = WORKFLOW_STEPS.filter(s => getStepState(s, project.status) === 'current');
  const lockedSteps = WORKFLOW_STEPS.filter(s => getStepState(s, project.status) === 'locked');
  const progressPercent = Math.round((completedSteps.length / WORKFLOW_STEPS.length) * 100);

  // Which step to actually render
  const activeStepKey = overrideStep || (currentSteps.length > 0 ? currentSteps[currentSteps.length - 1].key : 'export');

  return (
    <PageTransition>
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link href="/dashboard/projects" className="hover:text-gray-700 dark:hover:text-gray-300">المشاريع</Link>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 dark:text-white truncate">{project.name}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">{project.name}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {project.period}{project.organization?.name ? ` · ${project.organization.name}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => { setRefreshing(true); loadProject(); }}
            disabled={refreshing}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${currentStatus.color}`}>{currentStatus.label}</span>
        </div>
      </div>

      {/* ── Progress Bar (always visible) ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5">
        {/* Overall progress */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">تقدم العمل</span>
          <span className="text-sm font-bold text-blue-600">{progressPercent}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full mb-5 overflow-hidden">
          <div className="h-full bg-gradient-to-l from-blue-500 to-blue-600 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-between">
          {WORKFLOW_STEPS.map((step, idx) => {
            const state = getStepState(step, project.status);
            const Icon = step.icon;
            const isClickable = state === 'completed' || state === 'current';

            return (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  onClick={() => isClickable ? setOverrideStep(step.key) : null}
                  disabled={!isClickable}
                  className={`flex flex-col items-center gap-1.5 group w-full transition-all ${
                    !isClickable ? 'cursor-default opacity-40' : 'cursor-pointer'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    state === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                    state === 'current'   ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/50 ring-4 ring-blue-100 dark:ring-blue-900/30' :
                                            'bg-gray-100 dark:bg-gray-800 text-gray-400'
                  }`}>
                    {state === 'completed' ? <CheckCircle className="w-5 h-5" /> :
                     state === 'locked'    ? <Lock className="w-4 h-4" /> :
                                             <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs font-medium text-center leading-tight ${
                    state === 'current' ? 'text-blue-700 dark:text-blue-400' :
                    state === 'completed' ? 'text-emerald-600 dark:text-emerald-400' :
                                           'text-gray-400'
                  }`}>{step.label}</span>
                </button>
                {idx < WORKFLOW_STEPS.length - 1 && (
                  <div className={`h-0.5 w-full mx-1 rounded transition-all ${
                    state === 'completed' ? 'bg-emerald-300 dark:bg-emerald-700' : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Current Step Panel (70% of attention) ── */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Step header */}
        {(() => {
          const activeStep = WORKFLOW_STEPS.find(s => s.key === activeStepKey);
          if (!activeStep) return null;
          const state = getStepState(activeStep, project.status);
          const Icon = activeStep.icon;
          return (
            <div className={`px-6 py-4 flex items-center gap-3 border-b ${
              state === 'current' ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900' :
              state === 'completed' ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900' :
                                     'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-800'
            }`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                state === 'current' ? 'bg-blue-600 text-white' : 'bg-emerald-500 text-white'
              }`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-gray-900 dark:text-white">
                    {state === 'current' ? `المطلوب الآن: ${activeStep.label}` : activeStep.label}
                  </h2>
                  {state === 'completed' && (
                    <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">مكتملة</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">{activeStep.desc}</p>
              </div>
              {overrideStep && (
                <button
                  onClick={() => setOverrideStep(null)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  العودة للخطوة الحالية
                </button>
              )}
            </div>
          );
        })()}

        {/* Step content */}
        <div className="p-6">
          {/* Step 1: Setup — show project info */}
          {activeStepKey === 'setup' && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-gray-500">القالب</span>
                  <span className="font-medium">{project.template.name}</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-gray-500">المحاور</span>
                  <span className="font-medium">{project.template.axes_count} محاور · {project.template.items_count} بند</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-gray-500">الجهات</span>
                  <span className="font-medium">{project.template.entities_count} جهة</span>
                </div>
                <div className="flex justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-gray-500">الفترة</span>
                  <span className="font-medium">{project.period}</span>
                </div>
              </div>
              {project.status === 'draft' && currentStatus.next && (
                <button onClick={() => requestUpdateStatus(currentStatus.next!)} disabled={actionLoading} className="btn btn-primary w-full justify-center text-base py-3">
                  {actionLoading ? '...' : 'الخطوة التالية: بدء جمع البيانات'} <ArrowLeft className="w-5 h-5 mr-2" />
                </button>
              )}
            </div>
          )}

          {/* Step 2: Contributors */}
          {activeStepKey === 'contributors' && (
            <ContributorsTab
              project={project}
              actionLoading={actionLoading}
              handleInviteAll={handleInviteAll}
              handleRemindAll={handleRemindAll}
              copyInviteLink={copyInviteLink}
            />
          )}

          {/* Step 3: Data Collection */}
          {activeStepKey === 'data' && (
            <ContributorsTab
              project={project}
              actionLoading={actionLoading}
              handleInviteAll={handleInviteAll}
              handleRemindAll={handleRemindAll}
              copyInviteLink={copyInviteLink}
            />
          )}

          {/* Step 4: Skeleton */}
          {activeStepKey === 'skeleton' && (
            <SkeletonTab
              projectId={projectId}
              projectStatus={project.status}
              onMoveToGenerate={() => setOverrideStep('generate')}
            />
          )}

          {/* Step 5: Generate */}
          {activeStepKey === 'generate' && (
            <GenerateTab
              projectId={projectId}
              projectStatus={project.status}
              showToast={showToast}
            />
          )}

          {/* Step 6: Export */}
          {activeStepKey === 'export' && (
            <ExportTab
              project={project}
              actionLoading={actionLoading}
              generatingReport={generatingReport}
              onGenerate={handleGenerate}
              onClearReport={() => { setGeneratingReport(null); loadProject(); }}
            />
          )}
        </div>

        {/* Next step action (for current steps that have a status transition) */}
        {!overrideStep && getStepState(WORKFLOW_STEPS[currentStepIdx], project.status) === 'current' && currentStatus.next && activeStepKey !== 'setup' && (
          <div className="px-6 pb-5">
            <button
              onClick={() => requestUpdateStatus(currentStatus.next!)}
              disabled={actionLoading}
              className="btn btn-primary w-full justify-center py-3 text-base"
            >
              {actionLoading ? '...' : `الخطوة التالية: ${currentStatus.nextLabel}`} <ArrowLeft className="w-5 h-5 mr-2" />
            </button>
          </div>
        )}
      </div>

      {/* ── Completed Steps Summary (30% — collapsed by default) ── */}
      {completedSteps.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
          <button
            onClick={() => setExpandedCompleted(v => !v)}
            className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors rounded-2xl"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {completedSteps.length} خطوات مكتملة
              </span>
            </div>
            {expandedCompleted ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          {expandedCompleted && (
            <div className="px-5 pb-4 space-y-2 border-t border-gray-100 dark:border-gray-800 pt-3">
              {completedSteps.map(step => {
                const Icon = step.icon;
                return (
                  <button
                    key={step.id}
                    onClick={() => setOverrideStep(step.key)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-right"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{step.label}</div>
                      <div className="text-xs text-gray-400">{step.desc}</div>
                    </div>
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Locked Steps Preview ── */}
      {lockedSteps.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {lockedSteps.map(step => (
            <div key={step.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs text-gray-400">
              <Lock className="w-3 h-3" />
              <span>{step.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Quick Stats ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-gray-500">البيانات</span>
          <span className="font-bold text-gray-900 dark:text-white">{project.items_progress}%</span>
        </div>
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 hidden sm:block" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-gray-500">المساهمون</span>
          <span className="font-bold text-gray-900 dark:text-white">{project.progress}%</span>
        </div>
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 hidden sm:block" />
        <div className="flex items-center gap-2">
          <span className="text-gray-500">الجهات</span>
          <span className="font-bold">{project.contributors_count}</span>
        </div>
        {project.days_remaining !== null && (
          <>
            <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-gray-500">المتبقي</span>
              <span className={`font-bold ${project.days_remaining < 7 ? 'text-amber-600' : ''}`}>{project.days_remaining} يوم</span>
            </div>
          </>
        )}
      </div>

      {/* ── Confirmation Modal ── */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-2">{confirmAction.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">{confirmAction.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="flex-1 btn btn-secondary">إلغاء</button>
              <button onClick={confirmAction.onConfirm} className="flex-1 btn btn-primary">تأكيد</button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
    </PageTransition>
  );
}
