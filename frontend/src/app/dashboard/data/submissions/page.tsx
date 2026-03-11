'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

interface Submission {
  id: number;
  entity_name: string;
  entity_code: string;
  period_name: string;
  status: string;
  total_items: number;
  completed_items: number;
  progress_percentage: number;
  started_at: string | null;
  submitted_at: string | null;
  portal_link: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  not_started: { label: 'لم يبدأ', color: 'bg-gray-100 text-gray-700', icon: '⏳' },
  in_progress: { label: 'قيد العمل', color: 'bg-blue-100 text-blue-700', icon: '🔄' },
  submitted: { label: 'مُسلَّم', color: 'bg-yellow-100 text-yellow-700', icon: '📤' },
  under_review: { label: 'قيد المراجعة', color: 'bg-purple-100 text-purple-700', icon: '👁️' },
  approved: { label: 'معتمد', color: 'bg-green-100 text-green-700', icon: '✅' },
  needs_revision: { label: 'يحتاج مراجعة', color: 'bg-red-100 text-red-700', icon: '🔴' },
};

export default function SubmissionsPage() {
  const searchParams = useSearchParams();
  const periodId = searchParams.get('period');

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [copiedLink, setCopiedLink] = useState<number | null>(null);

  useEffect(() => {
    loadSubmissions();
  }, [periodId]);

  async function loadSubmissions() {
    try {
      const params: any = {};
      if (periodId) params.period = parseInt(periodId);
      const data = await api.data.submissions.list(params);
      setSubmissions(data.results || data || []);
    } catch (error) {
      console.error('Failed to load submissions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function copyPortalLink(submission: Submission) {
    try {
      await navigator.clipboard.writeText(submission.portal_link);
      setCopiedLink(submission.id);
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  const filteredSubmissions = filter === 'all'
    ? submissions
    : submissions.filter(s => s.status === filter);

  const stats = {
    total: submissions.length,
    not_started: submissions.filter(s => s.status === 'not_started').length,
    in_progress: submissions.filter(s => s.status === 'in_progress').length,
    submitted: submissions.filter(s => s.status === 'submitted').length,
    approved: submissions.filter(s => s.status === 'approved').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span>📥</span>
            <span>تسليمات الجهات</span>
          </h1>
          <p className="text-gray-500 mt-1">
            متابعة تقدم الجهات في إدخال البيانات
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary flex items-center gap-2">
            <span>📧</span>
            <span>تذكير الجميع</span>
          </button>
          <button className="btn btn-primary flex items-center gap-2">
            <span>📋</span>
            <span>تصدير الروابط</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { key: 'all', label: 'الكل', count: stats.total, icon: '📊', color: 'blue' },
          { key: 'not_started', label: 'لم يبدأ', count: stats.not_started, icon: '⏳', color: 'gray' },
          { key: 'in_progress', label: 'قيد العمل', count: stats.in_progress, icon: '🔄', color: 'yellow' },
          { key: 'submitted', label: 'مُسلَّم', count: stats.submitted, icon: '📤', color: 'purple' },
          { key: 'approved', label: 'معتمد', count: stats.approved, icon: '✅', color: 'green' },
        ].map((stat) => (
          <button
            key={stat.key}
            onClick={() => setFilter(stat.key)}
            className={`card text-center transition-all hover:shadow-md ${
              filter === stat.key ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{stat.count}</div>
            <div className="text-sm text-gray-500">{stat.label}</div>
          </button>
        ))}
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📥</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد تسليمات</h3>
          <p className="text-gray-500">
            {filter !== 'all' ? 'لا توجد تسليمات في هذه الحالة' : 'لم يتم إنشاء تسليمات بعد'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right p-4 font-medium text-gray-600">الجهة</th>
                <th className="text-right p-4 font-medium text-gray-600">الحالة</th>
                <th className="text-right p-4 font-medium text-gray-600">التقدم</th>
                <th className="text-right p-4 font-medium text-gray-600">آخر تحديث</th>
                <th className="text-right p-4 font-medium text-gray-600">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSubmissions.map((submission) => {
                const status = statusConfig[submission.status] || statusConfig.not_started;
                return (
                  <tr key={submission.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{submission.entity_name}</div>
                      <div className="text-sm text-gray-500">{submission.entity_code}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color} inline-flex items-center gap-1`}>
                        <span>{status.icon}</span>
                        <span>{status.label}</span>
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              submission.progress_percentage >= 100 ? 'bg-green-500' :
                              submission.progress_percentage >= 50 ? 'bg-blue-500' :
                              'bg-yellow-500'
                            }`}
                            style={{ width: `${submission.progress_percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {submission.completed_items}/{submission.total_items}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-500">
                      {submission.submitted_at
                        ? new Date(submission.submitted_at).toLocaleDateString('ar')
                        : submission.started_at
                        ? new Date(submission.started_at).toLocaleDateString('ar')
                        : 'لم يبدأ'
                      }
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyPortalLink(submission)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            copiedLink === submission.id
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                          title="نسخ رابط البوابة"
                        >
                          {copiedLink === submission.id ? '✓ تم النسخ' : '🔗 نسخ الرابط'}
                        </button>
                        <Link
                          href={`/dashboard/data/submissions/${submission.id}`}
                          className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                        >
                          عرض
                        </Link>
                        {submission.status === 'not_started' && (
                          <button className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors">
                            📧 تذكير
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
