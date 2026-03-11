'use client';

import { useEffect, useState } from 'react';
import { DocumentTextIcon, DocumentDuplicateIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface Report {
  id: number;
  title: string;
  status: string;
  status_display: string;
  progress: number;
  created_at: string;
}

interface Stats {
  total: number;
  inProgress: number;
  completed: number;
}

export default function Dashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, inProgress: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await fetch('http://localhost:8001/api/reports/');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      
      const reportsList = data.results || data;
      setReports(reportsList);
      
      // Calculate stats
      setStats({
        total: reportsList.length,
        inProgress: reportsList.filter((r: Report) => ['draft', 'generating', 'review'].includes(r.status)).length,
        completed: reportsList.filter((r: Report) => ['approved', 'exported'].includes(r.status)).length,
      });
    } catch (err) {
      setError('تعذر تحميل البيانات');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statsData = [
    { name: 'إجمالي التقارير', value: stats.total, icon: DocumentTextIcon, color: 'bg-blue-500' },
    { name: 'قيد العمل', value: stats.inProgress, icon: DocumentDuplicateIcon, color: 'bg-yellow-500' },
    { name: 'مكتملة', value: stats.completed, icon: CheckCircleIcon, color: 'bg-green-500' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">لوحة التحكم</h1>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
          {error} — تأكد أن Backend يعمل على http://localhost:8001
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
        {statsData.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-lg shadow p-6 flex items-center"
          >
            <div className={`${stat.color} rounded-lg p-3 ml-4`}>
              <stat.icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{stat.name}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">التقارير الأخيرة</h2>
        </div>
        {reports.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            لا توجد تقارير حتى الآن
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {reports.slice(0, 5).map((report) => (
              <li key={report.id} className="px-6 py-4 hover:bg-gray-50 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{report.title}</p>
                    <p className="text-sm text-gray-500">{report.status_display}</p>
                  </div>
                  <div className="flex items-center">
                    <div className="w-32 bg-gray-200 rounded-full h-2 ml-4">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${report.progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500">{report.progress}%</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8 flex gap-4">
        <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center">
          <DocumentTextIcon className="h-5 w-5 ml-2" />
          تقرير جديد
        </button>
        <button className="bg-white text-gray-700 px-6 py-3 rounded-lg font-medium border border-gray-300 hover:bg-gray-50 flex items-center">
          <DocumentDuplicateIcon className="h-5 w-5 ml-2" />
          قالب جديد
        </button>
      </div>
    </div>
  );
}
