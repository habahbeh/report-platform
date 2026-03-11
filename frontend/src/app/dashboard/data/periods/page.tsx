'use client';

import { useState, useEffect } from 'react';
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

const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
  upcoming: { label: 'قادمة', color: 'bg-gray-100 text-gray-700', icon: '📅' },
  open: { label: 'مفتوحة', color: 'bg-green-100 text-green-700', icon: '🟢' },
  extended: { label: 'ممددة', color: 'bg-yellow-100 text-yellow-700', icon: '⏰' },
  closed: { label: 'مغلقة', color: 'bg-red-100 text-red-700', icon: '🔴' },
};

export default function DataPeriodsPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadPeriods();
  }, []);

  async function loadPeriods() {
    try {
      const data = await api.data.periods.list();
      setPeriods(data.results || data || []);
    } catch (error) {
      console.error('Failed to load periods:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenPeriod(id: number) {
    try {
      await api.data.periods.open(id);
      loadPeriods();
    } catch (error) {
      console.error('Failed to open period:', error);
      alert('فشل في فتح الفترة');
    }
  }

  async function handleClosePeriod(id: number) {
    if (!confirm('هل أنت متأكد من إغلاق فترة الجمع؟')) return;
    try {
      await api.data.periods.close(id);
      loadPeriods();
    } catch (error) {
      console.error('Failed to close period:', error);
      alert('فشل في إغلاق الفترة');
    }
  }

  const activePeriod = periods.find(p => p.status === 'open' || p.status === 'extended');

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
            <span>📅</span>
            <span>فترات جمع البيانات</span>
          </h1>
          <p className="text-gray-500 mt-1">
            إدارة فترات جمع البيانات من الجهات المختلفة
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <span>➕</span>
          <span>فترة جديدة</span>
        </button>
      </div>

      {/* Active Period Banner */}
      {activePeriod && (
        <div className="bg-gradient-to-l from-green-500 to-green-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🟢</span>
                <h2 className="text-xl font-bold">فترة جمع نشطة</h2>
              </div>
              <h3 className="text-2xl font-bold mb-1">{activePeriod.name}</h3>
              <p className="text-green-100">
                {activePeriod.academic_year} • حتى {activePeriod.extended_date || activePeriod.end_date}
              </p>
            </div>
            <div className="text-left">
              <div className="text-4xl font-bold">{activePeriod.progress}%</div>
              <div className="text-green-100">نسبة الإنجاز</div>
              <div className="text-sm mt-1">
                {activePeriod.completed_count} / {activePeriod.submissions_count} جهة
              </div>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Link
              href={`/dashboard/data/submissions?period=${activePeriod.id}`}
              className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              📥 متابعة التسليمات
            </Link>
            <button
              onClick={() => handleClosePeriod(activePeriod.id)}
              className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              🔒 إغلاق الفترة
            </button>
          </div>
        </div>
      )}

      {/* Periods List */}
      {periods.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد فترات جمع</h3>
          <p className="text-gray-500 mb-6">أنشئ فترة جمع جديدة لبدء استلام البيانات من الجهات</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            ➕ إنشاء فترة جديدة
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {periods.map((period) => {
            const status = statusConfig[period.status] || statusConfig.upcoming;
            const isActive = period.status === 'open' || period.status === 'extended';

            return (
              <div
                key={period.id}
                className={`card ${isActive ? 'border-2 border-green-500' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{status.icon}</span>
                      <h3 className="text-lg font-bold text-gray-900">{period.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>📋 {period.template_name}</span>
                      <span>•</span>
                      <span>📅 {period.academic_year}</span>
                      <span>•</span>
                      <span>{period.start_date} → {period.extended_date || period.end_date}</span>
                    </div>
                  </div>

                  <div className="text-left">
                    <div className="text-2xl font-bold text-blue-600">{period.progress}%</div>
                    <div className="text-sm text-gray-500">
                      {period.completed_count}/{period.submissions_count}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
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
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex gap-2">
                    {period.status === 'upcoming' && (
                      <button
                        onClick={() => handleOpenPeriod(period.id)}
                        className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                      >
                        🚀 فتح الفترة
                      </button>
                    )}
                    {isActive && (
                      <>
                        <Link
                          href={`/dashboard/data/submissions?period=${period.id}`}
                          className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                        >
                          📥 التسليمات
                        </Link>
                        <button className="px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg text-sm font-medium hover:bg-yellow-200 transition-colors">
                          📧 إرسال تذكيرات
                        </button>
                      </>
                    )}
                  </div>
                  <Link
                    href={`/dashboard/data/periods/${period.id}`}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    عرض التفاصيل ←
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
