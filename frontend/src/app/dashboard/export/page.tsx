'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { PageTransition, FadeIn, StaggerContainer, StaggerItem, ScaleHover } from '@/components/ui/motion';
import { Download, Globe, FileText, Loader2, ExternalLink, Calendar, CheckCircle } from 'lucide-react';

interface Period {
  id: number;
  name: string;
  academic_year: string;
  status: string;
  template_name: string;
  progress: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api';

export default function ExportPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<number | null>(null);

  useEffect(() => { loadPeriods(); }, []);

  async function loadPeriods() {
    try {
      const data = await api.data.periods.list();
      const exportable = (data.results || data || []).filter((p: Period) => p.progress > 0);
      setPeriods(exportable);
    } catch (error) {
      console.error('Failed to load periods:', error);
    } finally {
      setLoading(false);
    }
  }

  function exportHTML(periodId: number, download: boolean = false) {
    const url = `${API_URL}/export/period/${periodId}/html/${download ? '?download=1' : ''}`;
    window.open(url, '_blank');
  }

  async function exportWord(periodId: number) {
    setExporting(periodId);
    try {
      await api.generation.export.download(periodId, { format: 'docx', includeItems: true, includeCharts: true, includeTables: true, approvedOnly: false });
    } catch (err: any) {
      console.error('Export error:', err);
      alert('فشل في تصدير Word: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setExporting(null);
    }
  }

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
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Download className="w-7 h-7 text-blue-600" />
              <span>تصدير التقارير</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">تصدير التقارير بصيغة HTML أو Word</p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="grid md:grid-cols-2 gap-4">
            <ScaleHover>
              <div className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/50 dark:to-gray-900 rounded-2xl border border-blue-200 dark:border-blue-800 p-6">
                <Globe className="w-10 h-10 text-blue-600 mb-3" />
                <h3 className="font-bold text-gray-900 dark:text-white">HTML</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">عرض مباشر في المتصفح مع إمكانية الطباعة كـ PDF</p>
              </div>
            </ScaleHover>
            <ScaleHover>
              <div className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/50 dark:to-gray-900 rounded-2xl border border-purple-200 dark:border-purple-800 p-6">
                <FileText className="w-10 h-10 text-purple-600 mb-3" />
                <h3 className="font-bold text-gray-900 dark:text-white">Word</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">ملف قابل للتحرير (.docx)</p>
              </div>
            </ScaleHover>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
            <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>الفترات المتاحة للتصدير</span>
            </h2>

            {periods.length === 0 ? (
              <div className="text-center py-12">
                <Download className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">لا توجد فترات متاحة للتصدير</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">يجب أن يكون هناك تقدم في جمع البيانات</p>
              </div>
            ) : (
              <StaggerContainer className="space-y-3">
                {periods.map((period) => (
                  <StaggerItem key={period.id}>
                    <ScaleHover scale={1.01}>
                      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                            <FileText className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">{period.name}</h3>
                            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                              <span>{period.academic_year}</span>
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                {period.progress}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => exportHTML(period.id)} className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                            <Globe className="w-4 h-4" />
                            <span>HTML</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <button onClick={() => exportWord(period.id)} disabled={exporting === period.id} className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50">
                            {exporting === period.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            <span>Word</span>
                          </button>
                        </div>
                      </div>
                    </ScaleHover>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
