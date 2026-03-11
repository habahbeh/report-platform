'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface PendingFile {
  id: number;
  name: string;
  file: string;
  file_type: string;
  entity_name: string;
  entity_id: number;
  item_name: string | null;
  submission_id: number;
  status: string;
  status_display: string;
  version: number;
  uploaded_at: string;
  uploaded_by_name: string | null;
  previous_version_id: number | null;
}

interface PendingSubmission {
  id: number;
  entity_name: string;
  period_name: string;
  status: string;
  status_display: string;
  progress_percentage: string;
  submitted_at: string;
  files_count: number;
}

interface Stats {
  pending_files: number;
  pending_submissions: number;
  approved_today: number;
  needs_revision: number;
  approved_submissions?: number;
  by_status?: {
    needs_revision?: number;
  };
}

export default function ReviewDashboardPage() {
  // State
  const [stats, setStats] = useState<Stats | null>(null);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'files' | 'submissions'>('files');
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [filesRes, subsRes, statsRes] = await Promise.all([
        api.data.files.list({ status: 'submitted', current: true }),
        api.data.submissions.list({ status: 'submitted' }),
        api.data.stats(),
      ]);

      setPendingFiles(filesRes.results || filesRes || []);
      setPendingSubmissions(subsRes.results || subsRes || []);
      setStats(statsRes);
    } catch (error) {
      console.error('Failed to load review data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileAction = async (fileId: number, action: 'approve' | 'reject' | 'revision') => {
    const notes = action !== 'approve' ? prompt('أدخل الملاحظات:') : '';
    if (action !== 'approve' && notes === null) return;

    setActionLoading(fileId);
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
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmissionAction = async (subId: number, action: 'approve' | 'revision') => {
    const notes = action === 'revision' ? prompt('أدخل ملاحظات التعديل:') : '';
    if (action === 'revision' && notes === null) return;

    setActionLoading(subId);
    try {
      if (action === 'approve') {
        await api.data.submissions.approve(subId);
      } else {
        await api.data.submissions.requestRevision(subId, notes || '');
      }
      await loadData();
    } catch (error) {
      alert('فشل في تنفيذ الإجراء');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedFiles.size === 0) {
      alert('اختر ملفات أولاً');
      return;
    }
    if (!confirm(`هل أنت متأكد من اعتماد ${selectedFiles.size} ملف؟`)) return;

    setLoading(true);
    try {
      await Promise.all(
        Array.from(selectedFiles).map((id) => api.data.files.approve(id))
      );
      setSelectedFiles(new Set());
      await loadData();
    } catch (error) {
      alert('فشل في اعتماد بعض الملفات');
    } finally {
      setLoading(false);
    }
  };

  const toggleFileSelection = (fileId: number) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const toggleAllFiles = () => {
    if (selectedFiles.size === pendingFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(pendingFiles.map((f) => f.id)));
    }
  };

  const formatDate = (dateString: string): string => {
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
      submitted: 'bg-yellow-100 text-yellow-700',
      under_review: 'bg-purple-100 text-purple-700',
      approved: 'bg-green-100 text-green-700',
      needs_revision: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/dashboard/data" className="text-blue-600 hover:underline text-sm mb-2 inline-block">
            ← العودة لجمع البيانات
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">🔍 لوحة المراجعة</h1>
          <p className="text-gray-600 mt-1">مراجعة واعتماد الملفات والتسليمات</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card text-center bg-yellow-50 border-yellow-200">
            <p className="text-3xl font-bold text-yellow-600">{pendingFiles.length}</p>
            <p className="text-sm text-gray-600">ملفات بانتظار المراجعة</p>
          </div>
          <div className="card text-center bg-purple-50 border-purple-200">
            <p className="text-3xl font-bold text-purple-600">{pendingSubmissions.length}</p>
            <p className="text-sm text-gray-600">تسليمات بانتظار الاعتماد</p>
          </div>
          <div className="card text-center bg-green-50 border-green-200">
            <p className="text-3xl font-bold text-green-600">{stats.approved_submissions || 0}</p>
            <p className="text-sm text-gray-600">معتمد</p>
          </div>
          <div className="card text-center bg-red-50 border-red-200">
            <p className="text-3xl font-bold text-red-600">{stats.by_status?.needs_revision || 0}</p>
            <p className="text-sm text-gray-600">يحتاج تعديل</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {[
            { id: 'files', label: 'الملفات', icon: '📁', count: pendingFiles.length },
            { id: 'submissions', label: 'التسليمات', icon: '📋', count: pendingSubmissions.length },
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

      {/* Files Tab */}
      {activeTab === 'files' && (
        <div className="card">
          {/* Bulk Actions */}
          {pendingFiles.length > 0 && (
            <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selectedFiles.size === pendingFiles.length && pendingFiles.length > 0}
                  onChange={toggleAllFiles}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-600">
                  {selectedFiles.size > 0 ? `تم اختيار ${selectedFiles.size} ملف` : 'اختر الكل'}
                </span>
              </div>
              {selectedFiles.size > 0 && (
                <button
                  onClick={handleBulkApprove}
                  className="btn bg-green-500 text-white hover:bg-green-600"
                >
                  ✅ اعتماد المحدد ({selectedFiles.size})
                </button>
              )}
            </div>
          )}

          {pendingFiles.length > 0 ? (
            <div className="space-y-3">
              {pendingFiles.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                    selectedFiles.has(file.id) ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.id)}
                    onChange={() => toggleFileSelection(file.id)}
                    className="w-4 h-4"
                  />

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <a
                        href={file.file}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline"
                      >
                        📄 {file.name}
                      </a>
                      <span className="text-xs text-gray-400">v{file.version}</span>
                      {file.previous_version_id && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                          تحديث
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <Link
                        href={`/dashboard/data/submissions/${file.submission_id}`}
                        className="hover:text-blue-600"
                      >
                        🏢 {file.entity_name}
                      </Link>
                      {file.item_name && <span>📋 {file.item_name}</span>}
                      <span>📅 {formatDate(file.uploaded_at)}</span>
                      {file.uploaded_by_name && <span>👤 {file.uploaded_by_name}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleFileAction(file.id, 'approve')}
                      disabled={actionLoading === file.id}
                      className="px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                    >
                      {actionLoading === file.id ? '...' : '✅ اعتماد'}
                    </button>
                    <button
                      onClick={() => handleFileAction(file.id, 'revision')}
                      disabled={actionLoading === file.id}
                      className="px-3 py-1.5 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                    >
                      🔄
                    </button>
                    <button
                      onClick={() => handleFileAction(file.id, 'reject')}
                      disabled={actionLoading === file.id}
                      className="px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      ❌
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-4xl mb-4">🎉</p>
              <p className="text-gray-500">لا توجد ملفات بانتظار المراجعة</p>
            </div>
          )}
        </div>
      )}

      {/* Submissions Tab */}
      {activeTab === 'submissions' && (
        <div className="card">
          {pendingSubmissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>الجهة</th>
                    <th>الفترة</th>
                    <th>التقدم</th>
                    <th>الملفات</th>
                    <th>تاريخ التسليم</th>
                    <th>الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingSubmissions.map((sub) => (
                    <tr key={sub.id}>
                      <td>
                        <Link
                          href={`/dashboard/data/submissions/${sub.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {sub.entity_name}
                        </Link>
                      </td>
                      <td className="text-gray-500">{sub.period_name}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500"
                              style={{ width: `${sub.progress_percentage}%` }}
                            />
                          </div>
                          <span className="text-sm">{Math.round(parseFloat(sub.progress_percentage))}%</span>
                        </div>
                      </td>
                      <td className="text-center">{sub.files_count || 0}</td>
                      <td className="text-sm text-gray-500">{formatDate(sub.submitted_at)}</td>
                      <td>
                        <div className="flex gap-2">
                          <Link
                            href={`/dashboard/data/submissions/${sub.id}`}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                          >
                            عرض
                          </Link>
                          <button
                            onClick={() => handleSubmissionAction(sub.id, 'approve')}
                            disabled={actionLoading === sub.id}
                            className="px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50"
                          >
                            ✅
                          </button>
                          <button
                            onClick={() => handleSubmissionAction(sub.id, 'revision')}
                            disabled={actionLoading === sub.id}
                            className="px-2 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 disabled:opacity-50"
                          >
                            🔄
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-4xl mb-4">🎉</p>
              <p className="text-gray-500">لا توجد تسليمات بانتظار الاعتماد</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
