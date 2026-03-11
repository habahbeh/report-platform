'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Submission {
  id: number;
  entity: number;
  entity_name: string;
  period: number;
  period_name: string;
  status: string;
  status_display: string;
  progress_percentage: string;
  total_items: number;
  completed_items: number;
  started_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  submitted_by_name: string | null;
  approved_by_name: string | null;
  notes: string;
}

interface EntityItem {
  id: number;
  code: string;
  name: string;
  name_en: string;
  field_type: string;
  required: boolean;
  unit: string;
  description: string;
  has_file: boolean;
  file_status: string | null;
}

interface DataFile {
  id: number;
  name: string;
  file: string;
  file_type: string;
  item: number | null;
  item_name: string | null;
  status: string;
  status_display: string;
  version: number;
  is_current: boolean;
  uploaded_at: string;
  uploaded_by_name: string | null;
  review_notes: string;
}

interface ReviewLog {
  id: number;
  action: string;
  action_display: string;
  user_name: string | null;
  timestamp: string;
  notes: string;
}

export default function SubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = Number(params.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [items, setItems] = useState<EntityItem[]>([]);
  const [files, setFiles] = useState<DataFile[]>([]);
  const [logs, setLogs] = useState<ReviewLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'items' | 'files' | 'logs'>('items');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [submissionId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subRes, filesRes, logsRes] = await Promise.all([
        api.data.submissions.get(submissionId),
        api.data.submissions.files(submissionId).catch(() => ({ results: [] })),
        api.data.submissions.logs(submissionId).catch(() => ({ results: [] })),
      ]);

      setSubmission(subRes);
      setFiles(filesRes.results || filesRes || []);
      setLogs(logsRes.results || logsRes || []);

      // Load entity items
      if (subRes.entity) {
        const itemsRes = await api.entities.items(subRes.entity).catch(() => ({ results: [] }));
        // Enhance items with file info
        const itemsWithFiles = (itemsRes.results || itemsRes || []).map((item: any) => {
          const itemFile = (filesRes.results || filesRes || []).find(
            (f: DataFile) => f.item === item.id && f.is_current
          );
          return {
            ...item,
            has_file: !!itemFile,
            file_status: itemFile?.status || null,
          };
        });
        setItems(itemsWithFiles);
      }
    } catch (error) {
      console.error('Failed to load submission:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!confirm('هل أنت متأكد من التسليم؟')) return;
    setActionLoading(true);
    try {
      await api.data.submissions.submit(submissionId);
      await loadData();
    } catch (error) {
      alert('فشل في التسليم');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!confirm('هل أنت متأكد من الاعتماد؟')) return;
    setActionLoading(true);
    try {
      await api.data.submissions.approve(submissionId);
      await loadData();
    } catch (error) {
      alert('فشل في الاعتماد');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestRevision = async () => {
    const notes = prompt('أدخل ملاحظات التعديل:');
    if (notes === null) return;
    setActionLoading(true);
    try {
      await api.data.submissions.requestRevision(submissionId, notes);
      await loadData();
    } catch (error) {
      alert('فشل في طلب التعديل');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      formData.append('file_type', 'excel');
      formData.append('submission', String(submissionId));
      formData.append('entity', String(submission?.entity));
      if (selectedItemId) {
        formData.append('item', String(selectedItemId));
      }

      await api.data.files.upload(formData);
      await loadData();
      setSelectedItemId(null);
    } catch (error) {
      alert('فشل في رفع الملف');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileAction = async (fileId: number, action: 'approve' | 'reject' | 'revision') => {
    const notes = action !== 'approve' ? prompt('أدخل الملاحظات:') : '';
    if (action !== 'approve' && notes === null) return;

    try {
      if (action === 'approve') {
        await api.data.files.approve(fileId);
      } else if (action === 'reject') {
        await api.data.files.reject(fileId, notes || '');
      } else {
        await api.data.files.requestRevision(fileId, notes || '');
      }
      await loadData();
    } catch (error) {
      alert('فشل في تنفيذ الإجراء');
    }
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      not_started: 'bg-gray-100 text-gray-700',
      in_progress: 'bg-blue-100 text-blue-700',
      submitted: 'bg-yellow-100 text-yellow-700',
      under_review: 'bg-purple-100 text-purple-700',
      approved: 'bg-green-100 text-green-700',
      needs_revision: 'bg-red-100 text-red-700',
      draft: 'bg-gray-100 text-gray-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getActionIcon = (action: string) => {
    const icons: Record<string, string> = {
      created: '🆕',
      uploaded: '📤',
      submitted: '📨',
      approved: '✅',
      rejected: '❌',
      revision_requested: '🔄',
      revised: '📝',
      comment: '💬',
    };
    return icons[action] || '📋';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">لم يتم العثور على التسليم</p>
        <Link href="/dashboard/data" className="text-blue-600 hover:underline mt-4 inline-block">
          ← العودة
        </Link>
      </div>
    );
  }

  const progress = parseFloat(submission.progress_percentage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/data" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
            ← العودة لجمع البيانات
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">📋 {submission.entity_name}</h1>
          <p className="text-gray-600 mt-1">{submission.period_name}</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {submission.status === 'in_progress' && (
            <button
              onClick={handleSubmit}
              disabled={actionLoading}
              className="btn bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50"
            >
              {actionLoading ? '...' : '📨 تسليم'}
            </button>
          )}
          {submission.status === 'submitted' && (
            <>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="btn bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
              >
                {actionLoading ? '...' : '✅ اعتماد'}
              </button>
              <button
                onClick={handleRequestRevision}
                disabled={actionLoading}
                className="btn bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              >
                {actionLoading ? '...' : '🔄 طلب تعديل'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status Card */}
      <div className="card">
        <div className="grid md:grid-cols-4 gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">الحالة</p>
            <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(submission.status)}`}>
              {submission.status_display}
            </span>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">التقدم</p>
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {submission.completed_items} / {submission.total_items} بند
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">تاريخ التسليم</p>
            <p className="font-medium">{formatDate(submission.submitted_at)}</p>
            {submission.submitted_by_name && (
              <p className="text-xs text-gray-400">بواسطة: {submission.submitted_by_name}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">تاريخ الاعتماد</p>
            <p className="font-medium">{formatDate(submission.approved_at)}</p>
            {submission.approved_by_name && (
              <p className="text-xs text-gray-400">بواسطة: {submission.approved_by_name}</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {[
            { id: 'items', label: 'البنود المطلوبة', icon: '📋', count: items.length },
            { id: 'files', label: 'الملفات', icon: '📁', count: files.length },
            { id: 'logs', label: 'سجل المراجعة', icon: '📜', count: logs.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon} {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Items Tab */}
      {activeTab === 'items' && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">📋 البنود المطلوبة من الجهة</h3>
            <button
              onClick={() => {
                setSelectedItemId(null);
                fileInputRef.current?.click();
              }}
              className="btn bg-blue-600 text-white hover:bg-blue-700"
              disabled={uploading}
            >
              {uploading ? 'جارٍ الرفع...' : '📤 رفع ملف عام'}
            </button>
          </div>

          {items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-400">{item.code}</span>
                      <span className="font-medium text-gray-900">{item.name}</span>
                      {item.required && (
                        <span className="text-red-500 text-xs">*إلزامي</span>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>النوع: {item.field_type}</span>
                      {item.unit && <span>الوحدة: {item.unit}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {item.has_file ? (
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(item.file_status || 'draft')}`}>
                        {item.file_status === 'approved' ? '✅ معتمد' : 
                         item.file_status === 'submitted' ? '📨 مُسلَّم' :
                         item.file_status === 'needs_revision' ? '🔄 يحتاج تعديل' :
                         '📄 مرفوع'}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-sm">لم يُرفع</span>
                    )}
                    <button
                      onClick={() => {
                        setSelectedItemId(item.id);
                        fileInputRef.current?.click();
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                      disabled={uploading}
                    >
                      📤 {item.has_file ? 'تحديث' : 'رفع'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              لا توجد بنود محددة لهذه الجهة
            </div>
          )}
        </div>
      )}

      {/* Files Tab */}
      {activeTab === 'files' && (
        <div className="card">
          <h3 className="font-medium text-gray-900 mb-4">📁 الملفات المرفوعة</h3>

          {files.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>الملف</th>
                    <th>البند</th>
                    <th>الحالة</th>
                    <th>الإصدار</th>
                    <th>تاريخ الرفع</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={file.id} className={!file.is_current ? 'opacity-50' : ''}>
                      <td>
                        <a
                          href={file.file}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-medium"
                        >
                          📄 {file.name}
                        </a>
                        <span className="text-xs text-gray-400 mr-2">({file.file_type})</span>
                      </td>
                      <td>{file.item_name || <span className="text-gray-400">عام</span>}</td>
                      <td>
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(file.status)}`}>
                          {file.status_display}
                        </span>
                      </td>
                      <td>
                        {file.is_current ? (
                          <span className="text-green-600 font-medium">v{file.version} ✓</span>
                        ) : (
                          <span className="text-gray-400">v{file.version}</span>
                        )}
                      </td>
                      <td className="text-sm text-gray-500">
                        {formatDate(file.uploaded_at)}
                        {file.uploaded_by_name && (
                          <div className="text-xs text-gray-400">{file.uploaded_by_name}</div>
                        )}
                      </td>
                      <td>
                        {file.is_current && file.status === 'submitted' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleFileAction(file.id, 'approve')}
                              className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                            >
                              ✅
                            </button>
                            <button
                              onClick={() => handleFileAction(file.id, 'revision')}
                              className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs hover:bg-yellow-200"
                            >
                              🔄
                            </button>
                            <button
                              onClick={() => handleFileAction(file.id, 'reject')}
                              className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200"
                            >
                              ❌
                            </button>
                          </div>
                        )}
                        {file.review_notes && (
                          <div className="text-xs text-red-500 mt-1">📝 {file.review_notes}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              لم يتم رفع أي ملفات بعد
            </div>
          )}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="card">
          <h3 className="font-medium text-gray-900 mb-4">📜 سجل المراجعة</h3>

          {logs.length > 0 ? (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <span className="text-2xl">{getActionIcon(log.action)}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{log.action_display}</span>
                      {log.user_name && (
                        <span className="text-sm text-gray-500">بواسطة {log.user_name}</span>
                      )}
                    </div>
                    {log.notes && <p className="text-sm text-gray-600 mt-1">{log.notes}</p>}
                    <p className="text-xs text-gray-400 mt-1">{formatDate(log.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              لا توجد سجلات مراجعة
            </div>
          )}
        </div>
      )}

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
