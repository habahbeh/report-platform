import { CheckCircle, ArrowLeft } from 'lucide-react';
import { Project, statusConfig } from './types';

// 7 workflow phases — maps to backend statuses
// draft covers phase 1+2, collecting=3, reviewing=4, generating=5, published=6+7
const WORKFLOW_STEPS = [
  {
    phase: 1,
    status: 'draft',
    label: 'الإعداد',
    desc: 'إنشاء المشروع وتحديد هيكل البنود',
    color: 'blue',
  },
  {
    phase: 3,
    status: 'collecting',
    label: 'جمع البيانات',
    desc: 'المساهمون يدخلون البيانات عبر رابط الدعوة',
    color: 'orange',
  },
  {
    phase: 4,
    status: 'reviewing',
    label: 'الهيكل HTML',
    desc: 'مراجعة الجداول والأشكال قبل توليد النصوص',
    color: 'teal',
  },
  {
    phase: 5,
    status: 'generating',
    label: 'توليد النصوص',
    desc: 'الذكاء الاصطناعي يملأ الفراغات النصية',
    color: 'purple',
  },
  {
    phase: 7,
    status: 'published',
    label: 'التصدير',
    desc: 'تصدير التقرير النهائي',
    color: 'red',
  },
];

const statusOrder = ['draft', 'collecting', 'reviewing', 'generating', 'published'];

interface Props {
  project: Project;
  actionLoading: boolean;
  updateStatus: (status: string) => void;
}

export function WorkflowStepper({ project, actionLoading, updateStatus }: Props) {
  const currentIdx = statusOrder.indexOf(project.status);
  const currentStatus = statusConfig[project.status];
  const currentStep = WORKFLOW_STEPS[currentIdx];

  return (
    <div className="card border-blue-100 bg-gradient-to-r from-blue-50/50 to-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">مسار العمل</h3>
          {currentStep && (
            <p className="text-xs text-gray-500 mt-0.5">المرحلة {currentStep.phase}: {currentStep.label}</p>
          )}
        </div>
        {currentStatus?.next && (
          <button
            onClick={() => updateStatus(currentStatus.next!)}
            disabled={actionLoading}
            className="btn btn-primary text-sm"
          >
            {actionLoading ? '...' : currentStatus.nextLabel} <ArrowLeft className="w-4 h-4 inline-block mr-1" />
          </button>
        )}
      </div>

      {/* Step indicators */}
      <div className="flex items-center overflow-x-auto pb-1">
        {WORKFLOW_STEPS.map((step, idx) => {
          const isPast   = idx < currentIdx;
          const isActive = idx === currentIdx;
          const isFuture = idx > currentIdx;

          return (
            <div key={step.status} className="flex items-center flex-shrink-0">
              <div className={`flex flex-col items-center w-24 transition-opacity ${isFuture ? 'opacity-35' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-1.5 transition-all ${
                  isPast   ? 'bg-emerald-500 text-white' :
                  isActive ? 'bg-blue-600 text-white ring-4 ring-blue-100' :
                             'bg-gray-100 text-gray-400'
                }`}>
                  {isPast
                    ? <CheckCircle className="w-4 h-4" />
                    : <span className="text-xs font-bold">{step.phase}</span>
                  }
                </div>
                <span className={`text-xs font-medium text-center leading-tight ${
                  isActive ? 'text-blue-700' : isPast ? 'text-emerald-600' : 'text-gray-400'
                }`}>{step.label}</span>
              </div>
              {idx < WORKFLOW_STEPS.length - 1 && (
                <div className={`h-0.5 w-6 flex-shrink-0 mx-0.5 transition-all ${
                  idx < currentIdx ? 'bg-emerald-400' : 'bg-gray-200'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Current step description */}
      {currentStep && (
        <p className="text-xs text-blue-600 mt-3 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
          <span className="font-semibold">{currentStep.label}</span> — {currentStep.desc}
        </p>
      )}
    </div>
  );
}
