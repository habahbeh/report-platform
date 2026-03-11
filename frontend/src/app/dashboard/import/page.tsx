'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { PageTransition, FadeIn, StaggerContainer, StaggerItem } from '@/components/ui/motion';
import { Upload, Download, Calendar, FileSpreadsheet, CheckCircle, XCircle, AlertCircle, Loader2, RefreshCw, FileUp } from 'lucide-react';

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

  useEffect(() => { loadPeriods(); }, []);

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

  const handleFileUpload = async (file: File) => {
    if (!selectedPeriod) return;
    setImporting(true);
    setError(null);
    setSuccess(null);
    setImportedItems([]);
    setImportErrors([]);
    try {
      const result = await api.generation.previousData.import(selectedPeriod, file);
      setImportedItems(result.imported || []);
      setImportErrors(result.errors || []);
      if (result.imported?.length > 0) setSuccess(`تم استيراد ${result.imported.length} بند بنجاح`);
      if (result.errors?.length > 0) setError(`${result.errors.length} أخطاء في الاستيراد`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handlePullFromPrevious = async () => {
    if (!selectedPeriod) return;
    setPulling(true);
    setError(null);
    try {
      const result = await api.generation.previousData.pull(selectedPeriod);
      setSuccess(`تم سحب ${result.updated_count || 0} قيمة من الفترة السابقة`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPulling(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) handleFileUpload(e.target.files[0]);
  };

  const selectedPeriodData = periods.find(p => p.id === selectedPeriod);

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
              <Upload className="w-7 h-7 text-green-600" />
              <span>استيراد البيانات</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">استيراد بيانات السنة السابقة أو سحبها تلقائياً</p>
          </div>
        </FadeIn>

        {(error || success) && (
          <FadeIn>
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
                <button onClick={() => setError(null)} className="mr-auto p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span>{success}</span>
                <button onClick={() => setSuccess(null)} className="mr-auto p-1 hover:bg-green-100 dark:hover:bg-green-900 rounded">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            )}
          </FadeIn>
        )}

        <FadeIn delay={0.1}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <div className="flex items-center gap-4 mb-4">
              <Calendar className="w-5 h-5 text-gray-400" />
              <select value={selectedPeriod || ''} onChange={(e) => setSelectedPeriod(parseInt(e.target.value))} className="flex-1 max-w-xs px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
                <option value="">اختر فترة...</option>
                {periods.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.academic_year})</option>)}
              </select>
              {selectedPeriodData?.previous_period && (
                <button onClick={handlePullFromPrevious} disabled={pulling} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">
                  {pulling ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  سحب من السابقة
                </button>
              )}
            </div>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-2 gap-6">
          <FadeIn delay={0.2}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-blue-600" />
                <span>قالب Excel</span>
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">حمّل قالب Excel لملئه ببيانات السنة السابقة</p>
              <div className="flex gap-3">
                <button onClick={handleDownloadTemplate} disabled={!selectedPeriod} className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-800/50 disabled:opacity-50">
                  <FileSpreadsheet className="w-4 h-4" />
                  تحميل القالب
                </button>
                <button onClick={handleExportData} disabled={!selectedPeriod} className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50">
                  <Download className="w-4 h-4" />
                  تصدير البيانات
                </button>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileUp className="w-5 h-5 text-green-600" />
                <span>رفع الملف</span>
              </h2>
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragActive ? 'border-green-500 bg-green-50 dark:bg-green-950/30' : 'border-gray-200 dark:border-gray-700 hover:border-green-400'}`}
              >
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileInput} className="hidden" />
                {importing ? (
                  <Loader2 className="w-10 h-10 animate-spin text-green-600 mx-auto mb-3" />
                ) : (
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                )}
                <p className="text-gray-600 dark:text-gray-400">{importing ? 'جاري الاستيراد...' : 'اسحب الملف هنا أو اضغط للاختيار'}</p>
                <p className="text-xs text-gray-400 mt-1">xlsx, xls</p>
              </div>
            </div>
          </FadeIn>
        </div>

        {importedItems.length > 0 && (
          <FadeIn delay={0.4}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6">
              <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>تم استيراد {importedItems.length} بند</span>
              </h2>
              <StaggerContainer className="space-y-2 max-h-64 overflow-y-auto">
                {importedItems.map((item, i) => (
                  <StaggerItem key={i}>
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                      <span className="font-medium text-gray-900 dark:text-white">{item.code} - {item.name}</span>
                      <span className="text-green-600 dark:text-green-400">{item.previous_value}</span>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </FadeIn>
        )}

        {importErrors.length > 0 && (
          <FadeIn delay={0.5}>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-800 p-6">
              <h2 className="font-bold text-red-700 dark:text-red-400 mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                <span>{importErrors.length} أخطاء</span>
              </h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {importErrors.map((err, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                    <span className="text-gray-900 dark:text-white">صف {err.row}: {err.code}</span>
                    <span className="text-red-600 dark:text-red-400 text-sm">{err.error}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        )}
      </div>
    </PageTransition>
  );
}
