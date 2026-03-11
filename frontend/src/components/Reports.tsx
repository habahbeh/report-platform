'use client';

import { useEffect, useState } from 'react';
import { PlusIcon, EyeIcon, ArrowDownTrayIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface Report {
  id: number;
  title: string;
  status: string;
  status_display: string;
  progress: number;
  period_display: string;
  created_at: string;
  template?: {
    id: number;
    name: string;
  };
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  collecting: 'bg-purple-100 text-purple-700',
  generating: 'bg-yellow-100 text-yellow-700',
  review: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  exported: 'bg-green-100 text-green-700',
};

export default function Reports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch('http://localhost:8001/api/reports/');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setReports(data.results || data);
    } catch (err) {
      setError('تعذر تحميل التقارير');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = filter
    ? reports.filter(r => r.status === filter)
    : reports;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">التقارير</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center">
          <PlusIcon className="h-5 w-5 ml-2" />
          تقرير جديد
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow mb-6 p-4 flex gap-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="">جميع الحالات</option>
          <option value="draft">مسودة</option>
          <option value="collecting">جمع البيانات</option>
          <option value="generating">جاري التوليد</option>
          <option value="review">قيد المراجعة</option>
          <option value="approved">معتمد</option>
          <option value="exported">تم التصدير</option>
        </select>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredReports.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            لا توجد تقارير
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  التقرير
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  الفترة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  الحالة
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  التقدم
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{report.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {report.period_display}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${statusColors[report.status] || 'bg-gray-100'}`}>
                      {report.status_display}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 ml-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${report.progress}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500">{report.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <a href={`/reports/${report.id}`} className="p-1 text-gray-400 hover:text-blue-600" title="عرض">
                        <EyeIcon className="h-5 w-5" />
                      </a>
                      {['draft', 'collecting'].includes(report.status) && (
                        <button className="p-1 text-gray-400 hover:text-yellow-600" title="توليد">
                          <SparklesIcon className="h-5 w-5" />
                        </button>
                      )}
                      {['approved', 'exported'].includes(report.status) && (
                        <button className="p-1 text-gray-400 hover:text-green-600" title="تحميل">
                          <ArrowDownTrayIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
