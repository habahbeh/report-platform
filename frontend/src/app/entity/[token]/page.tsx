'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

// API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api';

interface EntityPortalData {
  entity: {
    id: number;
    name: string;
    name_en: string;
  };
  period: {
    id: number;
    name: string;
    academic_year: string;
    end_date: string;
    status: string;
  };
  submission: {
    id: number;
    status: string;
    status_display: string;
    progress_percentage: string;
    total_items: number;
    completed_items: number;
  };
  items: Array<{
    id: number;
    code: string;
    name: string;
    name_en: string;
    description: string;
    field_type: string;
    required: boolean;
    unit: string;
    notes: string;
    file?: {
      id: number;
      name: string;
      file: string;
      status: string;
      status_display: string;
      version: number;
      review_notes: string;
    };
  }>;
}

export default function EntityPortalPage() {
  const params = useParams();
  const token = params.token as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [data, setData] = useState<EntityPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/data/entity-portal/${token}/`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('رابط غير صالح أو منتهي الصلاحية');
        }
        throw new Error('حدث خطأ في تحميل البيانات');
      }
      const data = await res.json();
      setData(data);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedItemId || !data) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      formData.append('item_id', String(selectedItemId));

      const res = await fetch(`${API_URL}/data/entity-portal/${token}/upload/`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'فشل في رفع الملف');
      }

      await loadData();
      setSelectedItemId(null);
    } catch (err: any) {
      alert(err.message || 'فشل في رفع الملف');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async () => {
    if (!data) return;
    if (!confirm('هل أنت متأكد من التسليم؟ لن تتمكن من تعديل الملفات بعد التسليم.')) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/data/entity-portal/${token}/submit/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'فشل في التسليم');
      }

      await loadData();
      alert('تم التسليم بنجاح! ✅');
    } catch (err: any) {
      alert(err.message || 'فشل في التسليم');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getFileStatusBadge = (status: string, statusDisplay: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      submitted: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      needs_revision: 'bg-orange-100 text-orange-700',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs ${colors[status] || 'bg-gray-100'}`}>
        {statusDisplay}
      </span>
    );
  };

  const getDaysRemaining = () => {
    if (!data) return 0;
    const end = new Date(data.period.end_date);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-4 text-gray-600">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <p className="text-6xl mb-4">❌</p>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">خطأ</h1>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={loadData}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const progress = parseFloat(data.submission.progress_percentage);
  const daysRemaining = getDaysRemaining();
  const isSubmitted = ['submitted', 'approved', 'under_review'].includes(data.submission.status);
  const canEdit = data.period.status === 'open' && !isSubmitted;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🏢 {data.entity.name}</h1>
              <p className="text-gray-600 mt-1">{data.period.name} ({data.period.academic_year})</p>
            </div>
            <div className="text-left">
              {daysRemaining > 0 ? (
                <div className={`px-4 py-2 rounded-lg ${daysRemaining <= 3 ? 'bg-red-100 text-red-700' : daysRemaining <= 7 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                  <p className="text-sm">متبقي</p>
                  <p className="text-2xl font-bold">{daysRemaining} يوم</p>
                </div>
              ) : (
                <div className="px-4 py-2 rounded-lg bg-red-100 text-red-700">
                  <p className="font-bold">انتهت المهلة</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Status Card */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">حالة التسليم</p>
              <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm ${
                data.submission.status === 'approved' ? 'bg-green-100 text-green-700' :
                data.submission.status === 'submitted' ? 'bg-yellow-100 text-yellow-700' :
                data.submission.status === 'needs_revision' ? 'bg-red-100 text-red-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {data.submission.status_display}
              </span>
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-500">نسبة الإنجاز</p>
              <p className="text-3xl font-bold text-blue-600">{Math.round(progress)}%</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                progress >= 100 ? 'bg-green-500' : progress >= 50 ? 'bg-blue-500' : 'bg-yellow-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 mt-2 text-center">
            {data.submission.completed_items} من {data.submission.total_items} بند مكتمل
          </p>

          {/* Submit Button */}
          {canEdit && progress > 0 && (
            <div className="mt-6 text-center">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg shadow-lg hover:shadow-xl transition-all"
              >
                {submitting ? 'جارٍ التسليم...' : '📨 تسليم البيانات'}
              </button>
              <p className="text-sm text-gray-500 mt-2">
                تأكد من رفع جميع الملفات المطلوبة قبل التسليم
              </p>
            </div>
          )}

          {isSubmitted && (
            <div className="mt-6 text-center">
              <p className="text-green-600 font-medium">
                ✅ تم تسليم البيانات بنجاح — في انتظار المراجعة
              </p>
            </div>
          )}
        </div>

        {/* Items List */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900">📋 البنود المطلوبة</h2>
          </div>

          <div className="divide-y">
            {data.items.map((item) => (
              <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                        {item.code}
                      </span>
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      {item.required && (
                        <span className="text-red-500 text-sm">*</span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                    )}
                    {item.notes && (
                      <p className="text-sm text-blue-600 mt-1 bg-blue-50 px-2 py-1 rounded">
                        💡 {item.notes}
                      </p>
                    )}

                    {/* File Info */}
                    {item.file && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>📄</span>
                            <a
                              href={item.file.file}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              {item.file.name}
                            </a>
                            <span className="text-xs text-gray-400">v{item.file.version}</span>
                          </div>
                          {getFileStatusBadge(item.file.status, item.file.status_display)}
                        </div>
                        {item.file.review_notes && (
                          <p className="text-sm text-red-600 mt-2 bg-red-50 px-2 py-1 rounded">
                            ⚠️ ملاحظات المراجع: {item.file.review_notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Upload Button */}
                  <div>
                    {canEdit ? (
                      <button
                        onClick={() => {
                          setSelectedItemId(item.id);
                          fileInputRef.current?.click();
                        }}
                        disabled={uploading}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          item.file
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {uploading && selectedItemId === item.id
                          ? '⏳ جارٍ الرفع...'
                          : item.file
                          ? '🔄 تحديث'
                          : '📤 رفع ملف'}
                      </button>
                    ) : item.file ? (
                      <span className="text-green-600 text-sm">✅</span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6">
          <h3 className="font-bold text-blue-900 mb-3">❓ تحتاج مساعدة؟</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• تأكد من رفع جميع البنود المطلوبة (المعلّمة بـ *)</li>
            <li>• الملفات المقبولة: Excel، PDF، Word</li>
            <li>• يمكنك تحديث أي ملف قبل التسليم النهائي</li>
            <li>• بعد التسليم، سيقوم المراجع بمراجعة ملفاتك</li>
            <li>• في حالة وجود ملاحظات، ستتمكن من التعديل وإعادة التسليم</li>
          </ul>
        </div>
      </main>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.pdf,.doc,.docx"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}
