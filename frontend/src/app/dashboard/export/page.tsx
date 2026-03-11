'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

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

  useEffect(() => {
    loadPeriods();
  }, []);

  async function loadPeriods() {
    try {
      const data = await api.data.periods.list();
      // فقط الفترات المغلقة أو اللي فيها تقدم
      const exportable = (data.results || data || []).filter(
        (p: Period) => p.progress > 0
      );
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
      await api.generation.export.download(periodId, {
        format: 'docx',
        includeItems: true,
        includeCharts: true,
        includeTables: true,
        approvedOnly: false,
      });
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
        <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <span>📄</span>
          <span>تصدير التقارير</span>
        </h1>
        <p className="text-gray-500 mt-1">
          تصدير التقارير بصيغة HTML أو Word
        </p>
      </div>

      {/* Export Options Info */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-bl from-blue-50 to-white border-blue-200">
          <div className="text-3xl mb-2">🌐</div>
          <h3 className="font-bold text-gray-900">HTML</h3>
          <p className="text-sm text-gray-500 mt-1">
            عرض مباشر في المتصفح مع إمكانية الطباعة كـ PDF
          </p>
        </div>
        <div className="card bg-gradient-to-bl from-purple-50 to-white border-purple-200">
          <div className="text-3xl mb-2">📝</div>
          <h3 className="font-bold text-gray-900">Word</h3>
          <p className="text-sm text-gray-500 mt-1">
            ملف قابل للتحرير (.docx)
          </p>
        </div>
        <div className="card bg-gradient-to-bl from-red-50 to-white border-red-200">
          <div className="text-3xl mb-2">📕</div>
          <h3 className="font-bold text-gray-900">PDF</h3>
          <p className="text-sm text-gray-500 mt-1">
            اطبع HTML مباشرة من المتصفح (Ctrl+P)
          </p>
        </div>
      </div>

      {/* Periods List */}
      {periods.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">لا توجد تقارير جاهزة للتصدير</h3>
          <p className="text-gray-500">
            أكمل جمع البيانات وتوليد المحتوى أولاً
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">التقارير المتاحة</h2>
          
          {periods.map((period) => (
            <div key={period.id} className="card">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{period.name}</h3>
                  <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                    <span>📋 {period.template_name}</span>
                    <span>•</span>
                    <span>📅 {period.academic_year}</span>
                    <span>•</span>
                    <span className="text-blue-600 font-medium">{period.progress}% مكتمل</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* HTML View */}
                  <button
                    onClick={() => exportHTML(period.id, false)}
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors flex items-center gap-2"
                  >
                    <span>🌐</span>
                    <span>عرض HTML</span>
                  </button>

                  {/* HTML Download */}
                  <button
                    onClick={() => exportHTML(period.id, true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <span>⬇️</span>
                    <span>تحميل HTML</span>
                  </button>

                  {/* Word Export */}
                  <button
                    onClick={() => exportWord(period.id)}
                    disabled={exporting === period.id}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                      exporting === period.id
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    <span>📝</span>
                    <span>{exporting === period.id ? 'جاري التصدير...' : 'Word'}</span>
                  </button>
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
            </div>
          ))}
        </div>
      )}

      {/* Tips */}
      <div className="card bg-yellow-50 border-yellow-200">
        <h3 className="font-bold text-yellow-800 flex items-center gap-2">
          <span>💡</span>
          <span>نصيحة</span>
        </h3>
        <p className="text-yellow-700 text-sm mt-2">
          لتحويل HTML إلى PDF: افتح التقرير → Ctrl+P (أو ⌘+P) → اختر "Save as PDF"
        </p>
      </div>
    </div>
  );
}
