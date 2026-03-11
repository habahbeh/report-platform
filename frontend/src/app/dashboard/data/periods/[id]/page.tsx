'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Period {
  id: number;
  name: string;
  academic_year: string;
  start_date: string;
  end_date: string;
  extended_date: string | null;
  status: string;
  template: number;
  template_name: string;
  submissions_count: number;
  completed_count: number;
  progress: number;
}

interface Submission {
  id: number;
  entity: number;
  entity_name: string;
  status: string;
  progress: number;
  submitted_at: string | null;
  items_count: number;
  files_count: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  upcoming: { label: 'قادمة', color: 'bg-gray-100 text-gray-700', icon: '📅' },
  open: { label: 'مفتوحة', color: 'bg-green-100 text-green-700', icon: '🟢' },
  extended: { label: 'ممددة', color: 'bg-yellow-100 text-yellow-700', icon: '⏰' },
  closed: { label: 'مغلقة', color: 'bg-red-100 text-red-700', icon: '🔴' },
};

const submissionStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'لم يبدأ', color: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'قيد العمل', color: 'bg-blue-100 text-blue-700' },
  submitted: { label: 'تم التسليم', color: 'bg-yellow-100 text-yellow-700' },
  approved: { label: 'معتمد', color: 'bg-green-100 text-green-700' },
  rejected: { label: 'مرفوض', color: 'bg-red-100 text-red-700' },
};

export default function PeriodDetailPage() {
  const params = useParams();
  const router = useRouter();
  const periodId = params.id as string;

  const [period, setPeriod] = useState<Period | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [periodId]);

  async function loadData() {
    try {
      const id = parseInt(periodId, 10);
      const [periodData, submissionsData] = await Promise.all([
        api.data.periods.get(id),
        api.data.submissions.list({ period: id }),
      ]);
      setPeriod(periodData);
      setSubmissions(submissionsData.results || submissionsData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenPeriod() {
    if (!period) return;
    try {
      await api.data.periods.open(period.id);
      loadData();
    } catch (error) {
      console.error('Failed to open period:', error);
      alert('فشل في فتح الفترة');
    }
  }

  async function handleClosePeriod() {
    if (!period || !confirm('هل أنت متأكد من إغلاق فترة الجمع؟')) return;
    try {
      await api.data.periods.close(period.id);
      loadData();
    } catch (error) {
      console.error('Failed to close period:', error);
      alert('فشل في إغلاق الفترة');
    }
  }

  function openHtmlReport() {
    window.open(`http://localhost:8002/api/export/period/${periodId}/html/`, '_blank');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!period) {
    return (
      <div className="card text-center py-12">
        <div className="text-6xl mb-4">❌</div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">فترة غير موجودة</h3>
        <Link href="/dashboard/data/periods" className="text-blue-600 hover:underline">
          العودة للقائمة
        </Link>
      </div>
    );
  }

  const status = statusConfig[period.status] || statusConfig.upcoming;
  const isActive = period.status === 'open' || period.status === 'extended';

  // Statistics
  const pending = submissions.filter(s => s.status === 'pending').length;
  const inProgress = submissions.filter(s => s.status === 'in_progress').length;
  const submitted = submissions.filter(s => s.status === 'submitted').length;
  const approved = submissions.filter(s => s.status === 'approved').length;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/dashboard/data" className="hover:text-blue-600">جمع البيانات</Link>
        <span>←</span>
        <Link href="/dashboard/data/periods" className="hover:text-blue-600">الفترات</Link>
        <span>←</span>
        <span className="text-gray-900">{period.name}</span>
      </div>

      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">{status.icon}</span>
              <h1 className="text-2xl font-bold text-gray-900">{period.name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-4 text-gray-500 mt-2">
              <span>📋 {period.template_name}</span>
              <span>•</span>
              <span>📅 {period.academic_year}</span>
              <span>•</span>
              <span>{period.start_date} → {period.extended_date || period.end_date}</span>
            </div>
          </div>

          <div className="text-left">
            <div className="text-4xl font-bold text-blue-600">{period.progress}%</div>
            <div className="text-gray-500">نسبة الإنجاز</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6 h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              period.progress >= 100 ? 'bg-green-500' :
              period.progress >= 50 ? 'bg-blue-500' :
              'bg-yellow-500'
            }`}
            style={{ width: `${period.progress}%` }}
          />
        </div>

        {/* Actions */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap gap-3">
          {period.status === 'upcoming' && (
            <button
              onClick={handleOpenPeriod}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <span>🚀</span>
              <span>فتح الفترة</span>
            </button>
          )}
          {isActive && (
            <button
              onClick={handleClosePeriod}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors flex items-center gap-2"
            >
              <span>🔒</span>
              <span>إغلاق الفترة</span>
            </button>
          )}
          <Link
            href={`/dashboard/data/submissions?period=${period.id}`}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors flex items-center gap-2"
          >
            <span>📥</span>
            <span>التسليمات</span>
          </Link>
          <button
            onClick={openHtmlReport}
            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors flex items-center gap-2"
          >
            <span>📄</span>
            <span>تصدير HTML</span>
          </button>
          <Link
            href={`/dashboard/generate?period=${period.id}`}
            className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors flex items-center gap-2"
          >
            <span>🤖</span>
            <span>توليد التقرير</span>
          </Link>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card text-center">
          <div className="text-3xl font-bold text-gray-400">{pending}</div>
          <div className="text-sm text-gray-500 mt-1">لم يبدأ</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-blue-600">{inProgress}</div>
          <div className="text-sm text-gray-500 mt-1">قيد العمل</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-yellow-600">{submitted}</div>
          <div className="text-sm text-gray-500 mt-1">بانتظار المراجعة</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-green-600">{approved}</div>
          <div className="text-sm text-gray-500 mt-1">معتمد</div>
        </div>
      </div>

      {/* Submissions List */}
      <div className="card">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <span>📥</span>
          <span>تسليمات الجهات ({submissions.length})</span>
        </h2>

        {submissions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            لا توجد تسليمات لهذه الفترة
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-start py-3 px-4 text-sm font-medium text-gray-500">الجهة</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">الحالة</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">التقدم</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">الملفات</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">تاريخ التسليم</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => {
                  const subStatus = submissionStatusConfig[sub.status] || submissionStatusConfig.pending;
                  return (
                    <tr key={sub.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{sub.entity_name}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${subStatus.color}`}>
                          {subStatus.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${sub.progress}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-500">{sub.progress}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-500">
                        {sub.files_count} ملف
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-500">
                        {sub.submitted_at || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/dashboard/data/submissions/${sub.id}`}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          عرض
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
