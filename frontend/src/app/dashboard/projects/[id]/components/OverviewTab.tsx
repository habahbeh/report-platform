import { useState } from 'react';
import { ChevronDown, ChevronUp, Users } from 'lucide-react';
import { Project, statusConfig } from './types';
import { NextStep } from './NextStep';

interface Props {
  project: Project;
  actionLoading: boolean;
  updateStatus: (status: string) => void;
  handleInviteAll: () => void;
  handleRemindAll: () => void;
  handleGenerate: (format: string) => void;
}

export function OverviewTab({ project, actionLoading, updateStatus, handleInviteAll, handleRemindAll }: Props) {
  const currentStatus = statusConfig[project.status];
  const [showMore, setShowMore] = useState(false);

  const nextStepConfig: Record<string, { message: string; step: string; label?: string; href?: string; action?: string; type: 'info' | 'success' | 'warning' }> = {
    draft:      { step: 'الخطوة 1 من 5', message: 'أضف المساهمين (الجهات المسؤولة) ثم أرسل لهم دعوات إدخال البيانات', label: 'انتقل لتبويب المساهمون ←', href: undefined, type: 'info' },
    collecting: { step: 'الخطوة 2 من 5', message: 'المساهمون يدخلون بياناتهم — تابع التقدم وأرسل تذكيرات للمتأخرين', label: 'تابع تقدم المساهمين ←', href: undefined, type: 'info' },
    reviewing:  { step: 'الخطوة 3 من 5', message: 'البيانات جاهزة — افتح تبويب "الهيكل" واضغط "بناء الهيكل" لإنشاء هيكل التقرير', label: 'انتقل لبناء الهيكل ←', href: undefined, type: 'warning' },
    generating: { step: 'الخطوة 4 من 5', message: 'الهيكل جاهز — افتح تبويب "التوليد" واضغط "ولّد كل الفقرات" ثم راجع واعتمد كل فقرة', label: 'انتقل للتوليد والمراجعة ←', href: undefined, type: 'info' },
    published:  { step: 'الخطوة 5 من 5', message: 'التقرير جاهز — افتح تبويب "التصدير" وحمّل النسخة النهائية بصيغة Word أو PDF', label: 'انتقل للتصدير ←', href: undefined, type: 'success' },
  };

  const ns = nextStepConfig[project.status];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Project Info */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">معلومات المشروع</h3>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">القالب</dt>
            <dd className="font-medium">{project.template.name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">المؤسسة</dt>
            <dd className="font-medium">{project.organization?.name}</dd>
          </div>

          {showMore && (
            <>
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
            </>
          )}
        </dl>

        <button
          onClick={() => setShowMore(v => !v)}
          className="mt-3 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {showMore ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showMore ? 'إخفاء التفاصيل' : 'عرض المزيد'}
        </button>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">إجراءات سريعة</h3>
        <div className="space-y-3">
          {/* Smart empty state for fresh draft with no contributors */}
          {project.status === 'draft' && project.contributors_count === 0 && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <Users className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium text-gray-800">لا يوجد مساهمون بعد</div>
                <div className="text-gray-500 mt-0.5">الخطوة الأولى: أضف الجهات المسؤولة وأرسل روابط إدخال البيانات</div>
              </div>
            </div>
          )}

          {currentStatus.next && (
            <button
              onClick={() => updateStatus(currentStatus.next!)}
              disabled={actionLoading}
              title={`الانتقال إلى مرحلة: ${currentStatus.nextLabel}`}
              className="btn btn-primary w-full justify-center"
            >
              {actionLoading ? '...' : currentStatus.nextLabel} →
            </button>
          )}
          {project.status === 'collecting' && (
            <>
              <button
                onClick={handleInviteAll}
                disabled={actionLoading}
                title="يرسل رابط إدخال البيانات لجميع الجهات المسؤولة"
                className="btn btn-secondary w-full justify-center"
              >
                إرسال دعوات للجهات
              </button>
              <button
                onClick={handleRemindAll}
                disabled={actionLoading}
                title="يرسل تذكيراً للجهات التي لم تكمل إدخال بياناتها بعد"
                className="btn btn-secondary w-full justify-center"
              >
                إرسال تذكيرات
              </button>
            </>
          )}
          {project.status === 'published' && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-400 text-center font-medium">
              التقرير منشور — انتقل لتبويب «التصدير» لتحميله
            </div>
          )}
        </div>

        {ns && (
          <div className="mt-4">
            <div className="text-xs font-bold text-blue-600 mb-1">{ns.step}</div>
            <NextStep message={ns.message} actionLabel={ns.label} type={ns.type} />
          </div>
        )}
      </div>
    </div>
  );
}
