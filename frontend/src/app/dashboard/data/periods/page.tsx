'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PageTransition, FadeIn, StaggerContainer, StaggerItem, ScaleHover } from '@/components/ui/motion';
import { Calendar, Plus, Clock, CheckCircle, XCircle, AlertCircle, Inbox, Lock, ExternalLink, Loader2, BarChart3 } from 'lucide-react';

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

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  upcoming: { label: 'قادمة', color: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300', icon: Clock },
  open: { label: 'مفتوحة', color: 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400', icon: CheckCircle },
  extended: { label: 'ممددة', color: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-400', icon: AlertCircle },
  closed: { label: 'مغلقة', color: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400', icon: XCircle },
};

export default function DataPeriodsPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => { loadPeriods(); }, []);

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
    try { await api.data.periods.open(id); loadPeriods(); } catch (error) { alert('فشل في فتح الفترة'); }
  }

  async function handleClosePeriod(id: number) {
    if (!confirm('هل أنت متأكد من إغلاق فترة الجمع؟')) return;
    try { await api.data.periods.close(id); loadPeriods(); } catch (error) { alert('فشل في إغلاق الفترة'); }
  }

  const activePeriod = periods.find(p => p.status === 'open' || p.status === 'extended');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6">
        <FadeIn>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Calendar className="w-7 h-7 text-blue-600" />
                <span>فترات جمع البيانات</span>
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">إدارة فترات جمع البيانات من الجهات المختلفة</p>
            </div>
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20">
              <Plus className="w-5 h-5" />
              <span>فترة جديدة</span>
            </button>
          </div>
        </FadeIn>

        {activePeriod && (
          <FadeIn delay={0.1}>
            <div className="bg-gradient-to-l from-green-500 to-green-600 rounded-2xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-6 h-6" />
                    <h2 className="text-xl font-bold">فترة جمع نشطة</h2>
                  </div>
                  <h3 className="text-2xl font-bold mb-1">{activePeriod.name}</h3>
                  <p className="text-green-100">{activePeriod.academic_year} • حتى {activePeriod.extended_date || activePeriod.end_date}</p>
                </div>
                <div className="text-left">
                  <div className="text-4xl font-bold">{activePeriod.progress}%</div>
                  <div className="text-green-100">نسبة الإنجاز</div>
                  <div className="text-sm mt-1">{activePeriod.completed_count} / {activePeriod.submissions_count} جهة</div>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <Link href={`/dashboard/data/submissions?period=${activePeriod.id}`} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  <Inbox className="w-4 h-4" /> متابعة التسليمات
                </Link>
                <button onClick={() => handleClosePeriod(activePeriod.id)} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  <Lock className="w-4 h-4" /> إغلاق الفترة
                </button>
              </div>
            </div>
          </FadeIn>
        )}

        {periods.length === 0 ? (
          <FadeIn delay={0.2}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">لا توجد فترات جمع</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">أنشئ فترة جمع جديدة لبدء استلام البيانات من الجهات</p>
              <button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl">
                <Plus className="w-5 h-5" /> إنشاء فترة جمع
              </button>
            </div>
          </FadeIn>
        ) : (
          <FadeIn delay={0.2}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span>جميع الفترات</span>
                <span className="text-sm font-normal bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-lg">{periods.length}</span>
              </h2>
              <StaggerContainer className="space-y-3">
                {periods.map((period) => {
                  const config = statusConfig[period.status] || statusConfig.upcoming;
                  const StatusIcon = config.icon;
                  return (
                    <StaggerItem key={period.id}>
                      <ScaleHover scale={1.01}>
                        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between group hover:border-blue-300 dark:hover:border-blue-700 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white">{period.name}</h3>
                              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                                <span>{period.academic_year}</span>
                                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.color}`}>
                                  <StatusIcon className="w-3 h-3" /> {config.label}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-left">
                              <div className="text-lg font-bold text-gray-900 dark:text-white">{period.progress}%</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{period.completed_count}/{period.submissions_count}</div>
                            </div>
                            <Link href={`/dashboard/data/periods/${period.id}`} className="p-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/50 hover:text-blue-600 transition-colors">
                              <ExternalLink className="w-5 h-5" />
                            </Link>
                          </div>
                        </div>
                      </ScaleHover>
                    </StaggerItem>
                  );
                })}
              </StaggerContainer>
            </div>
          </FadeIn>
        )}
      </div>
    </PageTransition>
  );
}
