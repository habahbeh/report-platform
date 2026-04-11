'use client';

import { useState } from 'react';
import { Eye, FileText, FileDown, Code, CheckCircle2, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Project } from './types';
import { NextStep } from './NextStep';

interface Props {
  project: Project;
  actionLoading: boolean;
  generatingReport: {
    id: string;
    status: string;
    progress: number;
    current_step: string;
    format: string;
  } | null;
  onGenerate: (format: string) => void;
  onClearReport: () => void;
}

export function ExportTab({ project, actionLoading, generatingReport, onGenerate, onClearReport }: Props) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);

  async function handlePreview() {
    setLoadingPreview(true);
    try {
      const data = await api.projects.skeletonStatus(project.id);
      setPreviewHtml(
        data?.preview_html ||
        '<div dir="rtl" style="text-align:center;padding:60px 20px;color:#9ca3af;font-family:Cairo,sans-serif;font-size:15px;">المعاينة غير متوفرة — ابنِ الهيكل أولاً من تبويب «الهيكل HTML»</div>'
      );
      setShowPreview(true);
    } catch {
      setPreviewHtml('<div dir="rtl" style="text-align:center;padding:60px 20px;color:#9ca3af;font-family:Cairo,sans-serif;">حدث خطأ في تحميل المعاينة</div>');
      setShowPreview(true);
    } finally {
      setLoadingPreview(false);
    }
  }

  const hasReports = project.generated_reports.length > 0;

  return (
    <div className="space-y-6">
      {/* Generation Progress */}
      {generatingReport && generatingReport.status === 'processing' && (
        <div className="card p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Loader2 className="animate-spin h-6 w-6 text-blue-600" />
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
        <div className="card p-6 bg-emerald-50 border-emerald-200 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
          <div className="font-semibold text-gray-900 mb-1">تم توليد التقرير بنجاح</div>
          <div className="text-sm text-gray-500 mb-4">يمكنك تحميله من قائمة التقارير أدناه</div>
          <button onClick={onClearReport} className="btn btn-primary">حسناً</button>
        </div>
      )}

      {/* Phase 7 info */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
        <div className="flex items-start gap-3 text-sm text-red-700 dark:text-red-400">
          <FileDown className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">التصدير النهائي:</span>
            {' '}النظام يرقّم الجداول والأشكال تلقائياً (جدول 1-1، شكل 1-1)،
            يستبدل المراجع في النصوص ({'{ref:t1}'} → جدول (1-3))،
            ويولّد فهارس المحتويات والجداول والأشكال تلقائياً.
          </div>
        </div>
      </div>

      {/* Export Actions */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">تصدير التقرير</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">اختر صيغة التصدير أو شاهد معاينة HTML</p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={handlePreview}
            disabled={loadingPreview}
            className="p-5 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-center group disabled:opacity-50"
          >
            <Eye className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <div className="font-semibold text-gray-900 group-hover:text-blue-700">معاينة HTML</div>
            <div className="text-xs text-gray-500 mt-1">شاهد التقرير قبل التصدير</div>
          </button>

          <button
            onClick={() => onGenerate('docx')}
            disabled={actionLoading || generatingReport?.status === 'processing'}
            className="p-5 rounded-xl border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <FileText className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <div className="font-semibold text-gray-900 group-hover:text-blue-700">Word (.docx)</div>
            <div className="text-xs text-gray-500 mt-1">قابل للتعديل</div>
          </button>

          <button
            onClick={() => onGenerate('pdf')}
            disabled={actionLoading || generatingReport?.status === 'processing'}
            className="p-5 rounded-xl border-2 border-red-200 hover:border-red-400 hover:bg-red-50 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <FileDown className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <div className="font-semibold text-gray-900 group-hover:text-red-700">PDF</div>
            <div className="text-xs text-gray-500 mt-1">نسخة نهائية</div>
          </button>

          <button
            onClick={() => onGenerate('html')}
            disabled={actionLoading || generatingReport?.status === 'processing'}
            className="p-5 rounded-xl border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <Code className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <div className="font-semibold text-gray-900 group-hover:text-emerald-700">HTML</div>
            <div className="text-xs text-gray-500 mt-1">نشر إلكتروني</div>
          </button>
        </div>

        {!hasReports && (
          <NextStep
            message="لم يُصدَّر تقرير بعد — اختر صيغة التصدير أعلاه لتوليد التقرير"
            type="info"
          />
        )}
      </div>

      {/* HTML Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-900">معاينة التقرير</h3>
              <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
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
              <button onClick={() => { setShowPreview(false); onGenerate('docx'); }} className="btn btn-primary">صدّر Word</button>
              <button onClick={() => { setShowPreview(false); onGenerate('pdf'); }} className="btn btn-primary bg-red-600 hover:bg-red-700">صدّر PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Reports History */}
      {hasReports && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">التقارير المولّدة ({project.generated_reports.length})</h3>
          <div className="space-y-3">
            {project.generated_reports.map((report: any) => (
              <div key={report.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white shadow-sm">
                    {report.format === 'pdf'
                      ? <FileDown className="w-5 h-5 text-red-500" />
                      : <FileText className="w-5 h-5 text-blue-500" />
                    }
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{report.format.toUpperCase()}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(report.created_at).toLocaleDateString('ar', {
                        year: 'numeric', month: 'long', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {report.status === 'completed' && report.download_url && (
                    <a href={report.download_url} download className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                      تحميل
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

          <NextStep
            message="التقارير جاهزة للتحميل — يمكنك توليد نسخ جديدة في أي وقت"
            type="success"
          />
        </div>
      )}
    </div>
  );
}
