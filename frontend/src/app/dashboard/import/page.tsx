'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';

interface Period {
  id: number;
  name: string;
  academic_year: string;
  previous_period?: number;
}

interface ImportResult {
  code: string;
  name: string;
  previous_value: number | string;
  change_percentage: number | null;
}

interface ImportError {
  row: number;
  code: string;
  error: string;
}

export default function ImportPage() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importedItems, setImportedItems] = useState<ImportResult[]>([]);
  const [importErrors, setImportErrors] = useState<ImportError[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load periods
  useEffect(() => {
    loadPeriods();
  }, []);

  const loadPeriods = async () => {
    setLoading(true);
    try {
      const data = await api.data.periods.list();
      const periodsArray = Array.isArray(data) ? data : (data?.results || []);
      setPeriods(periodsArray);
      if (periodsArray.length > 0) {
        const openPeriod = periodsArray.find((p: any) => p.status === 'open');
        setSelectedPeriod(openPeriod?.id || periodsArray[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    if (!selectedPeriod) return;
    
    try {
      await api.generation.previousData.downloadTemplate(selectedPeriod);
      setSuccess('تم تحميل القالب بنجاح');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleExportData = async () => {
    if (!selectedPeriod) return;
    
    try {
      await api.generation.previousData.export(selectedPeriod);
      setSuccess('تم تصدير البيانات بنجاح');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handlePullFromPrevious = async () => {
    if (!selectedPeriod) return;
    
    setPulling(true);
    setError(null);
    
    try {
      const result = await api.generation.previousData.pull(selectedPeriod);
      setSuccess(result.message);
      setImportedItems(result.updated || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPulling(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!selectedPeriod) {
      setError('الرجاء اختيار فترة أولاً');
      return;
    }

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('يجب أن يكون الملف بصيغة Excel (.xlsx أو .xls)');
      return;
    }

    setImporting(true);
    setError(null);
    setSuccess(null);
    setImportedItems([]);
    setImportErrors([]);

    try {
      const result = await api.generation.previousData.import(selectedPeriod, file);
      setSuccess(result.message);
      setImportedItems(result.imported || []);
      setImportErrors(result.errors || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const selectedPeriodData = periods.find(p => p.id === selectedPeriod);
  const hasPreviousPeriod = selectedPeriodData?.previous_period;

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          📥 استيراد بيانات السنة السابقة
        </h1>
        <p className="text-gray-600">
          استورد بيانات العام السابق لحساب نسب التغير في التقرير
        </p>
      </div>

      {/* Period Selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          فترة الجمع الحالية
        </label>
        <select
          value={selectedPeriod || ''}
          onChange={(e) => {
            setSelectedPeriod(parseInt(e.target.value));
            setImportedItems([]);
            setImportErrors([]);
          }}
          className="w-full max-w-md p-2 border rounded-lg"
        >
          <option value="">اختر فترة...</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.academic_year})
            </option>
          ))}
        </select>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg mb-4">
          {error}
          <button onClick={() => setError(null)} className="float-left">✕</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-lg mb-4">
          {success}
          <button onClick={() => setSuccess(null)} className="float-left">✕</button>
        </div>
      )}

      {selectedPeriod && (
        <div className="space-y-6">
          {/* Options Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Auto Pull */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🔄</span>
                <div>
                  <h3 className="font-semibold text-lg">سحب تلقائي</h3>
                  <p className="text-sm text-gray-500">
                    سحب البيانات من الفترة السابقة تلقائياً
                  </p>
                </div>
              </div>
              <button
                onClick={handlePullFromPrevious}
                disabled={pulling || !hasPreviousPeriod}
                className={`w-full py-2 rounded-lg text-white ${
                  !hasPreviousPeriod
                    ? 'bg-gray-300 cursor-not-allowed'
                    : pulling
                    ? 'bg-blue-300'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {pulling ? '⏳ جاري السحب...' : '🔄 سحب من الفترة السابقة'}
              </button>
              {!hasPreviousPeriod && (
                <p className="text-xs text-orange-600 mt-2">
                  ⚠️ لا توجد فترة سابقة مرتبطة بهذه الفترة
                </p>
              )}
            </div>

            {/* Download Template */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">📋</span>
                <div>
                  <h3 className="font-semibold text-lg">قالب Excel</h3>
                  <p className="text-sm text-gray-500">
                    حمّل قالب Excel وأضف البيانات ثم ارفعه
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadTemplate}
                  className="flex-1 py-2 rounded-lg border border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  📥 تحميل القالب
                </button>
                <button
                  onClick={handleExportData}
                  className="flex-1 py-2 rounded-lg border border-green-600 text-green-600 hover:bg-green-50"
                >
                  📤 تصدير البيانات
                </button>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold text-lg mb-4">📤 رفع ملف Excel</h3>
            
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleInputChange}
                className="hidden"
              />
              
              {importing ? (
                <div>
                  <div className="animate-spin text-4xl mb-4">⚙️</div>
                  <p className="text-gray-600">جاري الاستيراد...</p>
                </div>
              ) : (
                <>
                  <div className="text-5xl mb-4">📁</div>
                  <p className="text-gray-600 mb-2">
                    اسحب ملف Excel هنا أو
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    اختر ملف
                  </button>
                  <p className="text-sm text-gray-400 mt-4">
                    يجب أن يحتوي الملف على: كود البند، القيمة السابقة
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Import Results */}
          {importedItems.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-green-50 p-4 border-b border-green-100">
                <h3 className="font-semibold text-green-800">
                  ✅ تم استيراد {importedItems.length} بند
                </h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-2 text-right">الكود</th>
                      <th className="p-2 text-right">البند</th>
                      <th className="p-2 text-center">القيمة السابقة</th>
                      <th className="p-2 text-center">نسبة التغير</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {importedItems.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="p-2 font-mono text-blue-600">{item.code}</td>
                        <td className="p-2">{item.name}</td>
                        <td className="p-2 text-center font-medium">{item.previous_value}</td>
                        <td className="p-2 text-center">
                          {item.change_percentage !== null ? (
                            <span className={item.change_percentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {item.change_percentage >= 0 ? '+' : ''}{item.change_percentage.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Errors */}
          {importErrors.length > 0 && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="bg-red-50 p-4 border-b border-red-100">
                <h3 className="font-semibold text-red-800">
                  ⚠️ {importErrors.length} أخطاء
                </h3>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="p-2 text-center">السطر</th>
                      <th className="p-2 text-right">الكود</th>
                      <th className="p-2 text-right">الخطأ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {importErrors.map((err, index) => (
                      <tr key={index} className="hover:bg-red-50">
                        <td className="p-2 text-center">{err.row}</td>
                        <td className="p-2 font-mono">{err.code}</td>
                        <td className="p-2 text-red-600">{err.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4">📖 تعليمات</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
              <div>
                <h4 className="font-medium mb-2">طريقة 1: السحب التلقائي</h4>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>تأكد من وجود فترة سابقة مرتبطة</li>
                  <li>انقر على "سحب من الفترة السابقة"</li>
                  <li>سيتم نسخ القيم الحالية من الفترة السابقة</li>
                </ol>
              </div>
              <div>
                <h4 className="font-medium mb-2">طريقة 2: رفع Excel</h4>
                <ol className="list-decimal list-inside space-y-1 text-gray-600">
                  <li>حمّل قالب Excel</li>
                  <li>أضف القيم في عمود "القيمة السابقة"</li>
                  <li>ارفع الملف</li>
                </ol>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-blue-800 text-sm">
              <strong>💡 ملاحظة:</strong> سيتم حساب نسبة التغير تلقائياً عند توفر القيمة الحالية والسابقة
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !selectedPeriod && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-6xl mb-4">📊</p>
          <p>اختر فترة جمع للبدء</p>
        </div>
      )}
    </div>
  );
}
